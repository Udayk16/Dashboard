import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../server';

const router = Router();

// GET /api/stats - Returns totals for overview cards
router.get('/', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Total Spend YTD
    const totalSpendYTD = await prisma.invoice.aggregate({
      where: {
        issueDate: {
          gte: startOfYear,
        },
        status: {
          in: ['PAID', 'PENDING'],
        },
      },
      _sum: {
        totalAmount: true,
      },
    });

    // Total Invoices Processed
    const totalInvoicesProcessed = await prisma.invoice.count({
      where: {
        status: {
          in: ['PAID', 'PENDING', 'OVERDUE'],
        },
      },
    });

    // Documents Uploaded (simulated - using unique invoice numbers)
    const documentsUploaded = await prisma.invoice.findMany({
      select: {
        invoiceNumber: true,
      },
      distinct: ['invoiceNumber'],
    });

    // Average Invoice Value
    const averageInvoiceValue = await prisma.invoice.aggregate({
      where: {
        status: {
          in: ['PAID', 'PENDING'],
        },
      },
      _avg: {
        totalAmount: true,
      },
    });

    // Calculate trend indicators (comparison with previous period)
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);

    const lastYearSpend = await prisma.invoice.aggregate({
      where: {
        issueDate: {
          gte: lastYearStart,
          lte: lastYearEnd,
        },
        status: {
          in: ['PAID', 'PENDING'],
        },
      },
      _sum: {
        totalAmount: true,
      },
    });

    const ytdSpend = totalSpendYTD._sum.totalAmount || 0;
    const lastYearTotal = lastYearSpend._sum.totalAmount || 0;
    const spendTrend = lastYearTotal > 0 ? ((ytdSpend - lastYearTotal) / lastYearTotal) * 100 : 0;

    // Month-over-month invoice comparison
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonthInvoices = await prisma.invoice.count({
      where: {
        issueDate: {
          gte: thisMonthStart,
        },
      },
    });

    const lastMonthInvoices = await prisma.invoice.count({
      where: {
        issueDate: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
      },
    });

    const monthlyTrend = thisMonthInvoices - lastMonthInvoices;

    const response = {
      success: true,
      data: {
        totalSpendYTD: Number(ytdSpend),
        totalInvoicesProcessed,
        documentsUploaded: documentsUploaded.length,
        averageInvoiceValue: Number(averageInvoiceValue._avg.totalAmount || 0),
        trends: {
          spendTrend: Number(spendTrend.toFixed(1)),
          monthlyTrend,
        },
      },
    };

    res.json(response);
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;