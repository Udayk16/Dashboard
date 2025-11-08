import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

interface InvoiceData {
  invoiceNumber: string;
  vendorName: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    category: string;
  }>;
  payments: Array<{
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    status: string;
    referenceNumber: string;
  }>;
}

interface TestData {
  vendors: Array<{
    name: string;
    email: string;
    phone: string;
    address: string;
    category: string;
    taxId: string;
  }>;
  customers: Array<{
    name: string;
    email: string;
    phone: string;
    address: string;
    company: string;
  }>;
  invoices: InvoiceData[];
}

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Read test data
    const dataPath = join(__dirname, '../../../../data/Analytics_Test_Data.json');
    const testData: TestData = JSON.parse(readFileSync(dataPath, 'utf-8'));

    // Clear existing data
    await prisma.payment.deleteMany();
    await prisma.invoiceLineItem.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.customer.deleteMany();

    console.log('🗑️ Cleared existing data');

    // Create vendors
    const vendors = await Promise.all(
      testData.vendors.map(vendor =>
        prisma.vendor.create({
          data: vendor
        })
      )
    );

    console.log(`📦 Created ${vendors.length} vendors`);

    // Create customers
    const customers = await Promise.all(
      testData.customers.map(customer =>
        prisma.customer.create({
          data: customer
        })
      )
    );

    console.log(`👥 Created ${customers.length} customers`);

    // Create vendor and customer lookup maps
    const vendorMap = new Map(vendors.map(v => [v.name, v.id]));
    const customerMap = new Map(customers.map(c => [c.name, c.id]));

    // Create invoices with line items and payments
    for (const invoiceData of testData.invoices) {
      const vendorId = vendorMap.get(invoiceData.vendorName);
      const customerId = customerMap.get(invoiceData.customerName);

      if (!vendorId || !customerId) {
        console.warn(`⚠️ Skipping invoice ${invoiceData.invoiceNumber} - missing vendor or customer`);
        continue;
      }

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: invoiceData.invoiceNumber,
          vendorId,
          customerId,
          issueDate: new Date(invoiceData.issueDate),
          dueDate: new Date(invoiceData.dueDate),
          status: invoiceData.status as any,
          subtotal: invoiceData.subtotal,
          taxAmount: invoiceData.taxAmount,
          totalAmount: invoiceData.totalAmount,
          currency: invoiceData.currency,
          notes: `Auto-generated invoice for ${invoiceData.vendorName}`,
        }
      });

      // Create line items
      await Promise.all(
        invoiceData.lineItems.map(item =>
          prisma.invoiceLineItem.create({
            data: {
              invoiceId: invoice.id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              category: item.category,
            }
          })
        )
      );

      // Create payments
      await Promise.all(
        invoiceData.payments.map(payment =>
          prisma.payment.create({
            data: {
              invoiceId: invoice.id,
              amount: payment.amount,
              paymentDate: new Date(payment.paymentDate),
              paymentMethod: payment.paymentMethod as any,
              status: payment.status as any,
              referenceNumber: payment.referenceNumber,
            }
          })
        )
      );
    }

    console.log(`📄 Created ${testData.invoices.length} invoices with line items and payments`);

    // Create some summary statistics
    const stats = await prisma.invoice.aggregate({
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    console.log(`💰 Total invoice amount: $${stats._sum.totalAmount || 0}`);
    console.log(`📊 Total invoice count: ${stats._count.id}`);

    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default seedDatabase;