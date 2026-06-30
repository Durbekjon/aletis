"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Search,
  MoreHorizontal,
  Eye,
  MessageSquare,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useOrdersQuery } from "@/src/hooks/useOrdersQuery"
import { OrderStatus, PaymentStatus, Order, OrderItem, OrderCustomer } from "@/src/api/ordersApi"
import { useToast } from "@/hooks/use-toast"
import { useDebounce } from "@/src/hooks/useDebounce"
import { useTranslation } from "@/src/context/I18nContext"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function OrdersPage() {
  const { t, i18n } = useTranslation()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [paymentFilter, setPaymentFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const { toast } = useToast()
  
  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // Reset page when filters change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setPage(1)
  }

  const handlePaymentFilterChange = (value: string) => {
    setPaymentFilter(value)
    setPage(1)
  }

  // Build query parameters
  const queryParams = {
    page,
    limit: 20,
    search: debouncedSearchQuery || undefined,
    status: statusFilter !== "all" ? (statusFilter as OrderStatus) : undefined,
    paymentStatus: paymentFilter !== "all" ? (paymentFilter as PaymentStatus) : undefined,
  }

  const ordersQuery = useOrdersQuery(queryParams)
  const { data, isLoading, error } = ordersQuery
  const locale = i18n.language === "ru" ? "ru-RU" : i18n.language === "en" ? "en-US" : "uz-UZ"

  useEffect(() => {
    if (error) {
      toast({
        title: t("common.error"),
        description: t("orders.error"),
        variant: "destructive",
      })
    }
  }, [error, toast, t])

  const getStatusBadge = (status: OrderStatus) => {
    const statusConfig = {
      [OrderStatus.NEW]: { variant: "secondary" as const, icon: Clock, label: t("orders.statusNew") },
      [OrderStatus.PENDING]: { variant: "secondary" as const, icon: Clock, label: t("orders.statusPending") },
      [OrderStatus.CONFIRMED]: { variant: "default" as const, icon: CheckCircle, label: t("orders.statusConfirmed") },
      [OrderStatus.SHIPPED]: { variant: "default" as const, icon: Package, label: t("orders.statusShipped") },
      [OrderStatus.DELIVERED]: { variant: "default" as const, icon: CheckCircle, label: t("orders.statusDelivered") },
      [OrderStatus.CANCELLED]: { variant: "destructive" as const, icon: XCircle, label: t("orders.statusCancelled") },
      [OrderStatus.REFUNDED]: { variant: "outline" as const, icon: RefreshCw, label: t("orders.statusRefunded") },
    }

    const config = statusConfig[status]
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getPaymentBadge = (paymentStatus: PaymentStatus) => {
    switch (paymentStatus) {
      case PaymentStatus.PAID:
        return <Badge className="bg-primary">{t("orders.paymentPaid")}</Badge>
      case PaymentStatus.PENDING:
        return <Badge variant="secondary">{t("orders.paymentPending")}</Badge>
      case PaymentStatus.FAILED:
        return <Badge variant="destructive">{t("orders.paymentFailed")}</Badge>
      case PaymentStatus.REFUNDED:
        return <Badge variant="outline">{t("orders.paymentRefunded")}</Badge>
      default:
        return <Badge variant="secondary">{paymentStatus}</Badge>
    }
  }

  const getCustomerLink = (customer: OrderCustomer) => {
    return `https://t.me/${customer.username}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const getProductImage = (item: OrderItem) => {
    if (item.product && item.product.images && item.product.images.length > 0) {
      return item.product.images[0].url
    }
    return "/placeholder.svg?height=32&width=32"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("orders.title")}</h1>
          <p className="text-muted-foreground">{t("orders.subtitle")}</p>
        </div>
        <LanguageSwitcher />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="lp-glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("orders.stats.total")}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.total || 0}</div>
          </CardContent>
        </Card>

        <Card className="lp-glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("orders.stats.pending")}</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.items?.filter((o: Order) => o.status === OrderStatus.PENDING).length || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="lp-glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("orders.stats.processing")}</CardTitle>
            <RefreshCw className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.items?.filter((o: Order) => [OrderStatus.CONFIRMED].includes(o.status)).length || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="lp-glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("orders.stats.shipped")}</CardTitle>
            <Package className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.items?.filter((o: Order) => o.status === OrderStatus.SHIPPED).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="lp-glass-card">
        <CardHeader>
          <CardTitle>{t("orders.filtersTitle")}</CardTitle>
          <CardDescription>{t("orders.filtersDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("orders.searchOrders")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t("orders.statusPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("orders.statusAll")}</SelectItem>
                <SelectItem value={OrderStatus.NEW}>{t("orders.statusNew")}</SelectItem>
                <SelectItem value={OrderStatus.PENDING}>{t("orders.statusPending")}</SelectItem>
                <SelectItem value={OrderStatus.CONFIRMED}>{t("orders.statusConfirmed")}</SelectItem>
                <SelectItem value={OrderStatus.SHIPPED}>{t("orders.statusShipped")}</SelectItem>
                <SelectItem value={OrderStatus.DELIVERED}>{t("orders.statusDelivered")}</SelectItem>
                <SelectItem value={OrderStatus.CANCELLED}>{t("orders.statusCancelled")}</SelectItem>
                <SelectItem value={OrderStatus.REFUNDED}>{t("orders.statusRefunded")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={handlePaymentFilterChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t("orders.paymentPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("orders.paymentAll")}</SelectItem>
                <SelectItem value={PaymentStatus.PENDING}>{t("orders.paymentPending")}</SelectItem>
                <SelectItem value={PaymentStatus.PAID}>{t("orders.paymentPaid")}</SelectItem>
                <SelectItem value={PaymentStatus.FAILED}>{t("orders.paymentFailed")}</SelectItem>
                <SelectItem value={PaymentStatus.REFUNDED}>{t("orders.paymentRefunded")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="lp-glass-card">
        <CardHeader>
          <CardTitle>{t("orders.tableTitle", { count: data?.total || 0 })}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[160px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t("orders.error")}</p>
            </div>
          ) : data?.items && data.items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("orders.columnOrder")}</TableHead>
                  <TableHead>{t("orders.columnCustomer")}</TableHead>
                  <TableHead>{t("orders.columnStatus")}</TableHead>
                  <TableHead>{t("orders.columnPayment")}</TableHead>
                  <TableHead>{t("orders.columnTotal")}</TableHead>
                  <TableHead>{t("orders.columnDate")}</TableHead>
                  <TableHead className="text-right">{t("orders.columnActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((order: Order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link href={`/orders/${order.id}`}>
                        <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                          {order.orderItems.slice(0, 3).map((item: OrderItem, index: number) => (
                            <img
                              key={index}
                              src={getProductImage(item)}
                              alt={item.product.name}
                              className="rounded-full border-2 border-background bg-white min-w-10 max-w-10 h-10 object-cover"
                            />
                          ))}
                          {order.orderItems.length > 3 && (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                              +{order.orderItems.length - 3}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{order.orderNumber}</div>
                          <div className="text-sm text-muted-foreground">{t("orders.itemsCount", { count: order.orderItems.length })}</div>
                        </div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 rounded-lg">
                          {/* <AvatarImage src="/diverse-user-avatars.png" /> */}
                          <AvatarFallback className="rounded-lg bg-primary-foreground">
                            {order.customer.name?.split(' ').map((name) => name[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{order.customer.name}</div>
                          {order.customer.username && (
                            <div className="text-sm text-muted-foreground">
                              <a href={getCustomerLink(order.customer)} target="_blank" rel="noopener noreferrer">@{order.customer.username ? order.customer.username : order.customer.telegramId}</a>
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>{getPaymentBadge(order.paymentStatus)}</TableCell>
                    <TableCell>
                      <div className="font-medium">${order.totalPrice}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDate(order.createdAt)}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{t("orders.actionsLabel")}</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/orders/${order.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              {t("orders.viewDetails")}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            {t("orders.contactCustomer")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>{t("orders.updateStatus")}</DropdownMenuItem>
                          <DropdownMenuItem>{t("orders.addNote")}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t("orders.noOrders")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <Card className="lp-glass-card">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {t("orders.paginationSummary", {
                  start: ((page - 1) * 20) + 1,
                  end: Math.min(page * 20, data.total),
                  total: data.total,
                })}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={!data.hasPrevious}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t("orders.previous")}
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                    const pageNum = i + 1
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={!data.hasNext}
                >
                  {t("orders.next")}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
