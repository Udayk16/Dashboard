'use client'

import { useEffect, useState } from 'react'
import {
  DollarSign,
  FileText,
  Upload,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { analyticsApi } from '@/lib/api'
import { formatCurrency, formatNumber } from '@/lib/utils'
import type { StatsResponse } from '@/types'
import { cn } from '@/lib/utils'

interface StatCard {
  title: string
  value: string
  subtitle: string
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
  }
  icon: React.ComponentType<{ className?: string }>
  color: string
}

export default function OverviewCards() {
  const [stats, setStats] = useState<StatsResponse['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await analyticsApi.getStats()
        if (response.success) {
          setStats(response.data)
        } else {
          setError('Failed to load statistics')
        }
      } catch (err) {
        console.error('Error fetching stats:', err)
        setError('Failed to load statistics')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const getTrendIcon = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Minus className="h-4 w-4 text-gray-600" />
    }
  }

  const getTrendColor = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return 'text-green-600 bg-green-50'
      case 'down':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const cards: StatCard[] = stats ? [
    {
      title: 'Total Spend (YTD)',
      value: formatCurrency(stats.totalSpendYTD),
      subtitle: 'Year to date',
      trend: {
        value: stats.trends?.spendTrend || 0,
        direction: stats.trends?.spendTrend > 0 ? 'up' :
                 stats.trends?.spendTrend < 0 ? 'down' : 'neutral'
      },
      icon: DollarSign,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      title: 'Total Invoices Processed',
      value: formatNumber(stats.totalInvoicesProcessed),
      subtitle: 'All time',
      trend: {
        value: stats.trends?.monthlyTrend || 0,
        direction: stats.trends?.monthlyTrend > 0 ? 'up' :
                 stats.trends?.monthlyTrend < 0 ? 'down' : 'neutral'
      },
      icon: FileText,
      color: 'text-green-600 bg-green-50',
    },
    {
      title: 'Documents Uploaded',
      value: formatNumber(stats.documentsUploaded),
      subtitle: 'This month',
      icon: Upload,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      title: 'Average Invoice Value',
      value: formatCurrency(stats.averageInvoiceValue),
      subtitle: 'Per invoice',
      icon: TrendingUp,
      color: 'text-orange-600 bg-orange-50',
    },
  ] : []

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-gray-200 rounded"></div>
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, index) => (
          <Card key={index} className="border-red-200 bg-red-50/50">
            <CardContent className="flex items-center justify-center h-32">
              <div className="text-center">
                <p className="text-sm text-red-600">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="text-xs text-red-700 underline mt-1"
                >
                  Retry
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={cn('p-2 rounded-lg', card.color)}>
              <card.icon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.subtitle}
                </p>
              </div>
              {card.trend && (
                <Badge
                  variant="outline"
                  className={cn('flex items-center gap-1', getTrendColor(card.trend.direction))}
                >
                  {getTrendIcon(card.trend.direction)}
                  <span className="text-xs font-medium">
                    {Math.abs(card.trend.value).toFixed(1)}%
                  </span>
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}