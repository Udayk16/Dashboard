import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../server';

const router = Router();

// Query parameters schema for top vendors endpoint
const topVendorsQuerySchema = z.object({
  period: z.enum(['ytd', 'quarter', 'month']).default('ytd'),
});

// GET /api/vendors/top10 - Returns top 10 vendors by spend
router.get('/top10', async (req: Request, res: Response) => {
  try {
    const query = topVendorsQuerySchema.parse(req.query);

    const now = new Date();
    let startDate: Date;

    // Determine date range based on period
    switch (query.period) {
      case 'ytd':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), 0, 1);
    }

    const endDate = new Date();

    // Get top vendors by total spend
    const topVendors = await prisma.invoice.groupBy({
      by: ['vendorId'],
      where: {
        issueDate: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['PAID', 'PENDING', 'OVERDUE'],
        },
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        invoiceNumber: true,
      },
      orderBy: {
        _sum: {
          totalAmount: 'desc',
        },
      },
      take: 10,
    });

    // Get vendor details for each group
    const vendorIds = topVendors.map(v => v.vendorId);
    const vendorDetails = await prisma.vendor.findMany({
      where: {
        id: {
          in: vendorIds,
        },
      },
      select: {
        id: true,
        name: true,
        category: true,
      },
    });

    // Create vendor lookup map
    const vendorMap = new Map(vendorDetails.map(v => [v.id, v]));

    // Transform the data
    const transformedVendors = topVendors.map((vendor) => {
      const details = vendorMap.get(vendor.vendorId);
      return {
        vendorId: vendor.vendorId,
        vendorName: details?.name || 'Unknown Vendor',
        totalSpend: Number(vendor._sum.totalAmount || 0),
        invoiceCount: vendor._count.invoiceNumber,
        category: details?.category || 'Uncategorized',
      };
    });

    res.json({
      success: true,
      data: transformedVendors,
      period: query.period,
      dateRange: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
    });
  } catch (error) {
    console.error('❌ Error fetching top vendors:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch top vendors',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/vendors - Returns all vendors with optional filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, category } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category;
    }

    const vendors = await prisma.vendor.findMany({
      where,
      include: {
        _count: {
          select: {
            invoices: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Transform the data
    const transformedVendors = vendors.map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
      email: vendor.email,
      phone: vendor.phone,
      category: vendor.category,
      taxId: vendor.taxId,
      invoiceCount: vendor._count.invoices,
      createdAt: vendor.createdAt.toISOString().split('T')[0],
    }));

    res.json({
      success: true,
      data: transformedVendors,
    });
  } catch (error) {
    console.error('❌ Error fetching vendors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vendors',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;