import { Router, Request, Response } from 'express';
import { prisma } from '../server';

const router = Router();

// GET /api/category-spend - Returns spend grouped by category
router.get('/', async (req: Request, res: Response) => {
  try {
    // Get category spend from line items
    const categorySpend = await prisma.invoiceLineItem.groupBy({
      by: ['category'],
      where: {
        invoice: {
          status: {
            in: ['PAID', 'PENDING', 'OVERDUE'],
          },
        },
        category: {
          not: null,
        },
      },
      _sum: {
        totalPrice: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          totalPrice: 'desc',
        },
      },
    });

    // Calculate total spend for percentage calculation
    const totalSpend = categorySpend.reduce(
      (sum, category) => sum + Number(category._sum.totalPrice || 0),
      0
    );

    // Transform the data
    const transformedData = categorySpend
      .filter((category) => category.category) // Filter out null categories
      .map((category) => ({
        category: category.category!,
        totalSpend: Number(category._sum.totalPrice || 0),
        percentage: totalSpend > 0 ? (Number(category._sum.totalPrice || 0) / totalSpend) * 100 : 0,
        itemCount: category._count.id,
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend);

    res.json({
      success: true,
      data: transformedData,
      summary: {
        totalSpend,
        categoryCount: transformedData.length,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching category spend:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category spend data',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;