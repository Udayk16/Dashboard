import axios from 'axios'
import toast from 'react-hot-toast'
import type {
  StatsResponse,
  InvoiceTrendsResponse,
  TopVendorsResponse,
  CategorySpendResponse,
  CashOutflowResponse,
  InvoicesResponse,
  ChatRequest,
  ChatResponse,
  ChatSuggestionsResponse,
} from '@/types'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api'

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error)

    if (error.response?.status === 503) {
      toast.error('Service temporarily unavailable. Please try again later.')
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.')
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout. Please check your connection.')
    } else if (!error.response) {
      toast.error('Network error. Please check your connection.')
    }

    return Promise.reject(error)
  }
)

export const analyticsApi = {
  // Stats endpoints
  async getStats(): Promise<StatsResponse> {
    const response = await api.get('/stats')
    return response.data
  },

  // Invoice trends endpoints
  async getInvoiceTrends(period: 'year' | 'quarter' | 'month' = 'year', year?: number): Promise<InvoiceTrendsResponse> {
    const params = new URLSearchParams()
    params.append('period', period)
    if (year) params.append('year', year.toString())

    const response = await api.get(`/invoice-trends?${params}`)
    return response.data
  },

  // Vendor endpoints
  async getTopVendors(period: 'ytd' | 'quarter' | 'month' = 'ytd'): Promise<TopVendorsResponse> {
    const response = await api.get(`/vendors/top10?period=${period}`)
    return response.data
  },

  // Category spend endpoints
  async getCategorySpend(): Promise<CategorySpendResponse> {
    const response = await api.get('/category-spend')
    return response.data
  },

  // Cash outflow endpoints
  async getCashOutflow(startDate?: string, endDate?: string): Promise<CashOutflowResponse> {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    const response = await api.get(`/invoice-trends/cash-outflow?${params}`)
    return response.data
  },

  // Invoices endpoints
  async getInvoices(params: {
    page?: number
    limit?: number
    search?: string
    status?: string
    vendorId?: string
    dateFrom?: string
    dateTo?: string
    sortBy?: string
    sortOrder?: string
  } = {}): Promise<InvoicesResponse> {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, value.toString())
      }
    })

    const response = await api.get(`/invoices?${searchParams}`)
    return response.data
  },

  async getInvoiceById(id: string) {
    const response = await api.get(`/invoices/${id}`)
    return response.data
  },

  // Chat endpoints
  async sendChatQuery(request: ChatRequest): Promise<ChatResponse> {
    const response = await api.post('/chat-with-data', request)
    return response.data
  },

  async getChatSuggestions(): Promise<ChatSuggestionsResponse> {
    const response = await api.get('/chat-with-data/suggestions')
    return response.data
  },
}

// Health check endpoint
export async function healthCheck(): Promise<{ status: string }> {
  const response = await axios.get(`${API_BASE}/../health`)
  return response.data
}

export default analyticsApi