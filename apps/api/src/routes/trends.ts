import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../server';

const router = Router();

// Query parameters schema
const trendsQuerySchema = z.object({
  period: z.enum(['year', 'quarter', 'month']).default('year'),
  year: z.coerce.number().optional(),
});

// GET /api/invoice-trends - Returns monthly invoice count and spend trends
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = trendsQuerySchema.parse(req.query);

    const now = new Date();
    const currentYear = query.year || now.getFullYear();

    // Determine date range based on period
    let startDate: Date;
    let dateFormat: string;

    switch (query.period) {
      case 'year':
        startDate = new Date(currentYear, 0, 1);
        dateFormat = '%Y-%m'; // YYYY-MM format
        break;
      case 'quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(currentYear, currentQuarter * 3, 1);
        dateFormat = '%Y-%m'; // YYYY-MM format
        break;
      case 'month':
        startDate = new Date(currentYear, now.getMonth(), 1);
        dateFormat = '%Y-%m-%d'; // YYYY-MM-DD format
        break;
      default:
        startDate = new Date(currentYear, 0, 1);
        dateFormat = '%Y-%m';
    }

    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of current month

    // Get invoice trends using raw SQL for better date formatting
    const trends = await prisma.$queryRaw<Array<{
      month: string;
      invoice_count: bigint;
      total_spend: number;
    }>>`
      SELECT
        TO_CHAR(issue_date, ${dateFormat}) as month,
        COUNT(*) as invoice_count,
        COALESCE(SUM(total_amount), 0) as total_spend
      FROM invoices
      WHERE issue_date >= ${startDate}
        AND issue_date <= ${endDate}
        AND status IN ('PAID', 'PENDING', 'OVERDUE')
      GROUP BY TO_CHAR(issue_date, ${dateFormat})
      ORDER BY month ASC
    `;

    // Transform the data
    const transformedTrends = trends.map((trend) => ({
      month: trend.month,
      invoiceCount: Number(trend.invoice_count),
      totalSpend: Number(trend.total_spend),
    }));

    // If period is month, fill in missing days with zeros
    if (query.period === 'month') {
      const filledData = [];
      const daysInMonth = new Date(currentYear, now.getMonth() + 1, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const existingData = transformedTrends.find(t => t.month === dateStr);

        filledData.push({
          month: dateStr,
          invoiceCount: existingData?.invoiceCount || 0,
          totalSpend: existingData?.totalSpend || 0,
        });
      }

      res.json({
        success: true,
        data: filledData,
        period: query.period,
        year: currentYear,
      });
    } else {
      res.json({
        success: true,
        data: transformedTrends,
        period: query.period,
        year: currentYear,
      });
    }
  } catch (error) {
    console.error('❌ Error fetching invoice trends:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoice trends',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/cash-outflow - Returns expected cash outflow by date range
router.get('/cash-outflow', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    // Default to next 90 days if no dates provided
    const now = new Date();
    const defaultEndDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days from now

    const start = startDate ? new Date(startDate as string) : now;
    const end = endDate ? new Date(endDate as string) : defaultEndDate;

    // Get upcoming payment obligations
    const cashOutflow = await prisma.invoice.findMany({
      where: {
        dueDate: {
          gte: start,
          lte: end,
        },
        status: {
          in: ['PENDING', 'OVERDUE'],
        },
      },
      include: {
        vendor: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    // Group by date
    const groupedByDate = cashOutflow.reduce((acc, invoice) => {
      const dateStr = invoice.dueDate.toISOString().split('T')[0];

      if (!acc[dateStr]) {
        acc[dateStr] = {
          date: dateStr,
          amount: 0,
          invoiceCount: 0,
          vendors: [],
        };
      }

      acc[dateStr].amount += Number(invoice.totalAmount);
      acc[dateStr].invoiceCount += 1;

      if (!acc[dateStr].vendors.includes(invoice.vendor.name)) {
        acc[dateStr].vendors.push(invoice.vendor.name);
      }

      return acc;
    }, {} as Record<string, any>);

    // Convert to array and sort by date
    const result = Object.values(groupedByDate).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    res.json({
      success: true,
      data: result,
      summary: {
        totalAmount: result.reduce((sum, day) => sum + day.amount, 0),
        totalInvoices: result.reduce((sum, day) => sum + day.invoiceCount, 0),
        dateRange: {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
        },
      },
    });
  } catch (error) {
    console.error('❌ Error fetching cash outflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cash outflow data',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;