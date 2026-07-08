"use client"

import { useState } from "react"
import { useTranslation } from "@/src/context/I18nContext"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts"
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"

// Mock data for analytics
const salesData = [
  { date: "Jan 1", revenue: 1200, orders: 24, customers: 18 },
  { date: "Jan 2", revenue: 1800, orders: 32, customers: 28 },
  { date: "Jan 3", revenue: 1600, orders: 28, customers: 22 },
  { date: "Jan 4", revenue: 2200, orders: 38, customers: 35 },
  { date: "Jan 5", revenue: 1900, orders: 34, customers: 29 },
  { date: "Jan 6", revenue: 2400, orders: 42, customers: 38 },
  { date: "Jan 7", revenue: 2100, orders: 36, customers: 32 },
]

const productData = [
  { name: "iPhone 15 Pro", sales: 45, revenue: 44955, stock: 25 },
  { name: "Samsung Galaxy S24", sales: 32, revenue: 25568, stock: 2 },
  { name: "MacBook Air M3", sales: 18, revenue: 23382, stock: 15 },
  { name: "AirPods Pro", sales: 28, revenue: 6972, stock: 42 },
  { name: "iPad Air", sales: 15, revenue: 8985, stock: 8 },
]

const categoryData = [
  { name: "Electronics", value: 65, color: "#8884d8" },
  { name: "Fashion", value: 20, color: "#82ca9d" },
  { name: "Cosmetics", value: 10, color: "#ffc658" },
  { name: "Services", value: 5, color: "#ff7300" },
]

const funnelData = [
  { name: "Conversations", value: 1000, fill: "#8884d8" },
  { name: "Product Inquiries", value: 650, fill: "#82ca9d" },
  { name: "Add to Cart", value: 420, fill: "#ffc658" },
  { name: "Orders Placed", value: 280, fill: "#ff7300" },
  { name: "Orders Completed", value: 245, fill: "#0088fe" },
]

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  orders: {
    label: "Orders",
    color: "hsl(var(--chart-2))",
  },
  customers: {
    label: "Customers",
    color: "hsl(var(--chart-3))",
  },
}

export default function AnalyticsPage() {
  const { t } = useTranslation()
  const [timeRange, setTimeRange] = useState("7d")
  const [activeTab, setActiveTab] = useState("overview")

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value)
  }

  const calculateGrowth = (current: number, previous: number) => {
    const growth = ((current - previous) / previous) * 100
    return {
      value: Math.abs(growth).toFixed(1),
      isPositive: growth > 0,
    }
  }

  // Mock growth calculations
  const revenueGrowth = calculateGrowth(15200, 12800)
  const ordersGrowth = calculateGrowth(234, 198)
  const customersGrowth = calculateGrowth(189, 156)
  const conversionGrowth = calculateGrowth(24.5, 21.2)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('analytics.title')}</h1>
          <p className="text-muted-foreground">{t('analytics.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LanguageSwitcher />
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">{t('analytics.timeRange.last7Days')}</SelectItem>
              <SelectItem value="30d">{t('analytics.timeRange.last30Days')}</SelectItem>
              <SelectItem value="90d">{t('analytics.timeRange.last90Days')}</SelectItem>
              <SelectItem value="1y">{t('analytics.timeRange.lastYear')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {t('analytics.export')}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('analytics.metrics.totalRevenue')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(15200)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {revenueGrowth.isPositive ? (
                <ArrowUpRight className="h-3 w-3 text-primary mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={revenueGrowth.isPositive ? "text-primary" : "text-red-500"}>
                {revenueGrowth.value}%
              </span>
              <span className="ml-1">{t('analytics.metrics.fromLastPeriod')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('analytics.metrics.totalOrders')}</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">234</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {ordersGrowth.isPositive ? (
                <ArrowUpRight className="h-3 w-3 text-primary mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={ordersGrowth.isPositive ? "text-primary" : "text-red-500"}>{ordersGrowth.value}%</span>
              <span className="ml-1">{t('analytics.metrics.fromLastPeriod')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('analytics.metrics.newCustomers')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">189</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {customersGrowth.isPositive ? (
                <ArrowUpRight className="h-3 w-3 text-primary mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={customersGrowth.isPositive ? "text-primary" : "text-red-500"}>
                {customersGrowth.value}%
              </span>
              <span className="ml-1">{t('analytics.metrics.fromLastPeriod')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('analytics.metrics.conversionRate')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24.5%</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {conversionGrowth.isPositive ? (
                <ArrowUpRight className="h-3 w-3 text-primary mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={conversionGrowth.isPositive ? "text-primary" : "text-red-500"}>
                {conversionGrowth.value}%
              </span>
              <span className="ml-1">{t('analytics.metrics.fromLastPeriod')}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t('analytics.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="products">{t('analytics.tabs.products')}</TabsTrigger>
          <TabsTrigger value="customers">{t('analytics.tabs.customers')}</TabsTrigger>
          <TabsTrigger value="funnel">{t('analytics.tabs.funnel')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.revenueTrend')}</CardTitle>
                <CardDescription>{t('analytics.revenueTrendDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <AreaChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--color-revenue)"
                      fill="var(--color-revenue)"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Orders & Customers Chart */}
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.ordersCustomers')}</CardTitle>
                <CardDescription>{t('analytics.ordersCustomersDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <LineChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line
                      type="monotone"
                      dataKey="orders"
                      stroke="var(--color-orders)"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="customers"
                      stroke="var(--color-customers)"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.salesByCategory')}</CardTitle>
              <CardDescription>{t('analytics.salesByCategoryDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
                <div className="space-y-4">
                  {categoryData.map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                        <span className="text-sm font-medium">{category.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{category.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.topProducts')}</CardTitle>
              <CardDescription>{t('analytics.topProductsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {productData.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.sales} {t('analytics.unitsSold')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(product.revenue)}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant={product.stock < 10 ? "destructive" : "secondary"}>
                          {product.stock} {t('analytics.inStock')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.productComparison')}</CardTitle>
              <CardDescription>{t('analytics.productComparisonDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[400px]">
                <BarChart data={productData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.customerAcquisition')}</CardTitle>
                <CardDescription>{t('analytics.customerAcquisitionDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <AreaChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="customers"
                      stroke="var(--color-customers)"
                      fill="var(--color-customers)"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.customerMetrics')}</CardTitle>
                <CardDescription>{t('analytics.customerMetricsDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">156</div>
                    <div className="text-sm text-muted-foreground">{t('analytics.totalCustomers')}</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">2.3</div>
                    <div className="text-sm text-muted-foreground">{t('analytics.avgOrdersCustomer')}</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{formatCurrency(97)}</div>
                    <div className="text-sm text-muted-foreground">{t('analytics.avgOrderValue')}</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">68%</div>
                    <div className="text-sm text-muted-foreground">{t('analytics.repeatRate')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.conversionFunnel')}</CardTitle>
              <CardDescription>{t('analytics.conversionFunnelDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[400px]">
                <FunnelChart>
                  <Funnel dataKey="value" data={funnelData} isAnimationActive>
                    <LabelList position="center" fill="#fff" stroke="none" />
                  </Funnel>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </FunnelChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.conversionRates')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('analytics.funnel.conversationInquiry')}</span>
                    <span className="font-medium">65%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('analytics.funnel.inquiryCart')}</span>
                    <span className="font-medium">64.6%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('analytics.funnel.cartOrder')}</span>
                    <span className="font-medium">66.7%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('analytics.funnel.orderCompletion')}</span>
                    <span className="font-medium">87.5%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.dropOffAnalysis')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('analytics.dropoff.lostInquiry')}</span>
                    <span className="text-red-500 font-medium">350</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('analytics.dropoff.lostCart')}</span>
                    <span className="text-red-500 font-medium">230</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('analytics.dropoff.lostCheckout')}</span>
                    <span className="text-red-500 font-medium">140</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('analytics.dropoff.incompleteOrders')}</span>
                    <span className="text-red-500 font-medium">35</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.optimizationTips')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="p-2 bg-blue-50 rounded text-blue-700">
                  {t('analytics.tips.descriptions')}
                </div>
                <div className="p-2 bg-yellow-50 rounded text-yellow-700">
                  {t('analytics.tips.checkout')}
                </div>
                <div className="p-2 bg-green-50 rounded text-green-700">
                  {t('analytics.tips.followup')}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
