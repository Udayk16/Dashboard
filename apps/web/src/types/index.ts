export interface Invoice {
  id: string;
  invoiceNumber: string;
  vendor: {
    id: string;
    name: string;
    category?: string;
  };
  customer: {
    id: string;
    name: string;
    company?: string;
  };
  issueDate: string;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  totalAmount: number;
  currency: string;
  lineItemsCount?: number;
  paymentsCount?: number;
}

export interface InvoiceDetails extends Invoice {
  vendor: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    category?: string;
  };
  customer: {
    id: string;
    name: string;
    email?: string;
    company?: string;
  };
  subtotal: number;
  taxAmount: number;
  notes?: string;
  lineItems: InvoiceLineItem[];
  payments: Payment[];
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
}

export interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  status: string;
  referenceNumber?: string;
}

export interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  category?: string;
  taxId?: string;
  invoiceCount: number;
  createdAt: string;
}

export interface StatsResponse {
  success: boolean;
  data: {
    totalSpendYTD: number;
    totalInvoicesProcessed: number;
    documentsUploaded: number;
    averageInvoiceValue: number;
    trends?: {
      spendTrend: number;
      monthlyTrend: number;
    };
  };
}

export interface InvoiceTrend {
  month: string;
  invoiceCount: number;
  totalSpend: number;
}

export interface InvoiceTrendsResponse {
  success: boolean;
  data: InvoiceTrend[];
  period: 'year' | 'quarter' | 'month';
  year: number;
}

export interface TopVendor {
  vendorId: string;
  vendorName: string;
  totalSpend: number;
  invoiceCount: number;
  category?: string;
}

export interface TopVendorsResponse {
  success: boolean;
  data: TopVendor[];
  period: 'ytd' | 'quarter' | 'month';
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export interface CategorySpend {
  category: string;
  totalSpend: number;
  percentage: number;
  itemCount: number;
}

export interface CategorySpendResponse {
  success: boolean;
  data: CategorySpend[];
  summary: {
    totalSpend: number;
    categoryCount: number;
  };
}

export interface CashOutflow {
  date: string;
  amount: number;
  invoiceCount: number;
  vendors: string[];
}

export interface CashOutflowResponse {
  success: boolean;
  data: CashOutflow[];
  summary: {
    totalAmount: number;
    totalInvoices: number;
    dateRange: {
      startDate: string;
      endDate: string;
    };
  };
}

export interface InvoicesResponse {
  success: boolean;
  data: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ChatRequest {
  query: string;
  context?: {
    userId?: string;
  };
}

export interface ChatResponse {
  success: boolean;
  query: string;
  generatedSQL: string | null;
  results: any[];
  chartType: 'metric' | 'bar' | 'line' | 'pie' | 'table';
  executionTime: number;
  error: string | null;
  suggestedFollowUp?: string[];
}

export interface ChatSuggestionsResponse {
  success: boolean;
  data: string[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'date' | 'amount' | 'vendor' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface InvoiceFilters extends PaginationParams {
  status?: Invoice['status'];
  vendorId?: string;
  dateFrom?: string;
  dateTo?: string;
}