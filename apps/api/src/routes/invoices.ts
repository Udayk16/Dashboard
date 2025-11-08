import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { InvoiceStatus } from '@prisma/client';

const router = Router();

// Query parameters schema for invoices endpoint
const invoicesQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
  vendorId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sortBy: z.enum(['date', 'amount', 'vendor', 'status']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// GET /api/invoices - Returns paginated list of invoices with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = invoicesQuerySchema.parse(req.query);

    // Build where clause
    const where: any = {};

    if (query.search) {
      where.OR = [
        { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
        { vendor: { name: { contains: query.search, mode: 'insensitive' } } },
        { customer: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.vendorId) {
      where.vendorId = query.vendorId;
    }

    if (query.dateFrom || query.dateTo) {
      where.issueDate = {};
      if (query.dateFrom) {
        where.issueDate.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.issueDate.lte = new Date(query.dateTo);
      }
    }

    // Build order by clause
    const orderBy: any = {};
    switch (query.sortBy) {
      case 'date':
        orderBy.issueDate = query.sortOrder;
        break;
      case 'amount':
        orderBy.totalAmount = query.sortOrder;
        break;
      case 'vendor':
        orderBy.vendor = { name: query.sortOrder };
        break;
      case 'status':
        orderBy.status = query.sortOrder;
        break;
      default:
        orderBy.issueDate = 'desc';
    }

    // Get total count for pagination
    const total = await prisma.invoice.count({ where });

    // Calculate pagination
    const skip = (query.page - 1) * query.limit;
    const totalPages = Math.ceil(total / query.limit);

    // Fetch invoices with related data
    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            company: true,
          },
        },
        _count: {
          select: {
            lineItems: true,
            payments: true,
          },
        },
      },
      orderBy,
      skip,
      take: query.limit,
    });

    // Transform the data to match the API specification
    const transformedInvoices = invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      vendor: invoice.vendor,
      customer: invoice.customer,
      issueDate: invoice.issueDate.toISOString().split('T')[0],
      dueDate: invoice.dueDate.toISOString().split('T')[0],
      status: invoice.status,
      totalAmount: Number(invoice.totalAmount),
      currency: invoice.currency,
      lineItemsCount: invoice._count.lineItems,
      paymentsCount: invoice._count.payments,
    }));

    const response = {
      success: true,
      data: transformedInvoices,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('❌ Error fetching invoices:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoices',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/invoices/:id - Returns a single invoice with full details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        vendor: true,
        customer: true,
        lineItems: true,
        payments: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    // Transform the data
    const transformedInvoice = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      vendor: {
        id: invoice.vendor.id,
        name: invoice.vendor.name,
        email: invoice.vendor.email,
        phone: invoice.vendor.phone,
        category: invoice.vendor.category,
      },
      customer: {
        id: invoice.customer.id,
        name: invoice.customer.name,
        email: invoice.customer.email,
        company: invoice.customer.company,
      },
      issueDate: invoice.issueDate.toISOString().split('T')[0],
      dueDate: invoice.dueDate.toISOString().split('T')[0],
      status: invoice.status,
      subtotal: Number(invoice.subtotal),
      taxAmount: Number(invoice.taxAmount),
      totalAmount: Number(invoice.totalAmount),
      currency: invoice.currency,
      notes: invoice.notes,
      lineItems: invoice.lineItems.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        category: item.category,
      })),
      payments: invoice.payments.map((payment) => ({
        id: payment.id,
        amount: Number(payment.amount),
        paymentDate: payment.paymentDate.toISOString().split('T')[0],
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        referenceNumber: payment.referenceNumber,
      })),
    };

    res.json({
      success: true,
      data: transformedInvoice,
    });
  } catch (error) {
    console.error('❌ Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoice',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;