'use client'

import { useState } from 'react'
import {
  BarChart3,
  MessageCircle,
  FileText,
  Settings,
  User,
  Menu,
  X,
  TrendingUp,
  DollarSign,
  FileImage
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
  children?: React.ReactNode
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: BarChart3,
    current: true,
  },
  {
    name: 'Chat with Data',
    href: '/chat',
    icon: MessageCircle,
    current: false,
  },
]

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentTab, setCurrentTab] = useState('Dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={cn(
        "fixed inset-0 z-50 lg:hidden",
        sidebarOpen ? "block" : "hidden"
      )}>
        <div className="fixed inset-0 bg-gray-900/80" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">
                Analytics
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => (
              <Button
                key={item.name}
                variant={currentTab === item.name ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  currentTab === item.name
                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : "text-gray-700 hover:bg-gray-50"
                )}
                onClick={() => {
                  setCurrentTab(item.name)
                  setSidebarOpen(false)
                }}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Button>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white">
        <div className="flex h-16 items-center px-6">
          <TrendingUp className="h-8 w-8 text-blue-600" />
          <span className="ml-2 text-xl font-semibold text-gray-900">
            Analytics Platform
          </span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => (
            <Button
              key={item.name}
              variant={currentTab === item.name ? "default" : "ghost"}
              className={cn(
                "w-full justify-start",
                currentTab === item.name
                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : "text-gray-700 hover:bg-gray-50"
              )}
              onClick={() => setCurrentTab(item.name)}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Button>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <User className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">Admin User</p>
              <p className="text-xs text-gray-500">admin@analytics.com</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              <h1 className="text-lg font-semibold text-gray-900">
                {currentTab}
              </h1>
            </div>

            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">
            {currentTab === 'Dashboard' && (
              <div>
                {/* Dashboard content will go here */}
                <div className="text-center py-12">
                  <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">
                    Dashboard View
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Analytics dashboard components will be rendered here
                  </p>
                </div>
              </div>
            )}

            {currentTab === 'Chat with Data' && (
              <div>
                {/* Chat interface will go here */}
                <div className="text-center py-12">
                  <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">
                    Chat with Data
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    AI-powered data analysis interface
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}