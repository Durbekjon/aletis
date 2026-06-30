"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Search,
  Users,
  ShoppingBag,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Package,
} from "lucide-react"
import { useCustomersQuery } from "@/src/hooks/useCustomersQuery"
import { useDebounce } from "@/src/hooks/useDebounce"
import { useTranslation } from "@/src/context/I18nContext"
import { DataPagination } from "@/components/ui/data-pagination"
import { ROUTES } from "@/lib/constants"
import { cn } from "@/lib/utils"

const AI_TAG_COLORS: Record<string, string> = {
  VIP: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
  "High Intent": "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  "Frequent Buyer": "bg-green-500/15 text-green-400 border border-green-500/30",
  "Price Sensitive": "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  "New Customer": "bg-gray-500/15 text-gray-400 border border-gray-500/30",
  "At Risk": "bg-red-500/15 text-red-400 border border-red-500/30",
  "Loyal Customer": "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
}

const SENSITIVITY_STYLES: Record<string, string> = {
  LOW: "text-green-400",
  MEDIUM: "text-yellow-400",
  HIGH: "text-red-400",
}

const SENSITIVITY_DOTS: Record<string, string> = {
  LOW: "bg-green-400",
  MEDIUM: "bg-yellow-400",
  HIGH: "bg-red-400",
}

const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-purple-600",
  "bg-emerald-600",
  "bg-orange-600",
  "bg-pink-600",
  "bg-teal-600",
  "bg-indigo-600",
  "bg-rose-600",
]

function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

function relativeTime(dateStr: string, locale: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)

  if (locale === "ru-RU") {
    if (mins < 60) return `${mins} мин. назад`
    if (hours < 24) return `${hours} ч. назад`
    if (days === 1) return "вчера"
    if (days < 30) return `${days} дн. назад`
    return `${months} мес. назад`
  }
  if (locale === "en-US") {
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days === 1) return "yesterday"
    if (days < 30) return `${days}d ago`
    return `${months}mo ago`
  }
  // uz
  if (mins < 60) return `${mins} daq. oldin`
  if (hours < 24) return `${hours} soat oldin`
  if (days === 1) return "kecha"
  if (days < 30) return `${days} kun oldin`
  return `${months} oy oldin`
}

export default function CustomersPage() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(searchQuery, 400)
  const locale = i18n.language === "ru" ? "ru-RU" : i18n.language === "en" ? "en-US" : "uz-UZ"

  const { data, isLoading } = useCustomersQuery({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    order: "desc",
  })

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setPage(1)
  }

  const formatCurrency = (amount: number, currency: string) =>
    `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount)} ${currency}`

  // Page-level stats derived from loaded items
  const items = data?.items ?? []
  const withAICount = items.filter((c) => (c.aiNote?.aiTags?.length ?? 0) > 0).length
  const buyersCount = items.filter((c) => (c._count?.orders ?? 0) > 0).length
  const highValueCount = items.filter(
    (c) => c.aiNote?.aiTags?.includes("VIP") || c.aiNote?.aiTags?.includes("High Intent"),
  ).length

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("customers.title")}</h1>
        {data?.total !== undefined && (
          <p className="text-muted-foreground text-sm mt-1">
            {data.total} {t("customers.title").toLowerCase()}
          </p>
        )}
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="lp-glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("customers.title")}</p>
              <p className="text-xl font-bold">
                {isLoading ? <Skeleton className="h-5 w-8 mt-0.5" /> : data?.total ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lp-glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <ShoppingBag className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("customers.totalOrders")}</p>
              <p className="text-xl font-bold">
                {isLoading ? <Skeleton className="h-5 w-8 mt-0.5" /> : buyersCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lp-glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">VIP / High Intent</p>
              <p className="text-xl font-bold">
                {isLoading ? <Skeleton className="h-5 w-8 mt-0.5" /> : highValueCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lp-glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">AI tahlil qilingan</p>
              <p className="text-xl font-bold">
                {isLoading ? <Skeleton className="h-5 w-8 mt-0.5" /> : withAICount}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table card */}
      <Card className="lp-glass-card">
        <CardHeader className="pb-0 pt-4 px-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("customers.search")}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0 mt-4">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="pl-4 w-65">{t("common.name")}</TableHead>
                <TableHead>{t("customers.totalOrders")}</TableHead>
                <TableHead>{t("customers.customerValue")}</TableHead>
                <TableHead>{t("customers.lastPurchase")}</TableHead>
                <TableHead>Narx sezgirligi</TableHead>
                <TableHead>{t("customers.aiTags")}</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <Skeleton className="h-3.5 w-28" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    </TableCell>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                    ))}
                    <TableCell />
                  </TableRow>
                ))
              ) : !items.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Users className="h-12 w-12 opacity-20" />
                      <p className="text-sm">{t("customers.noCustomers")}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((customer) => {
                  const lastOrder = customer.orders?.[0]
                  const totalValue = customer.orders?.reduce((sum, o) => sum + (o.totalPrice || 0), 0) ?? 0
                  const orderCount = customer._count?.orders ?? 0
                  const initials = customer.name.charAt(0).toUpperCase()
                  const avatarColor = getAvatarColor(customer.name)
                  const sensitivity = customer.aiNote?.priceSensitivity
                  const tags = customer.aiNote?.aiTags ?? []

                  return (
                    <TableRow
                      key={customer.id}
                      className="cursor-pointer group"
                      onClick={() => router.push(`${ROUTES.CUSTOMERS}/${customer.id}`)}
                    >
                      {/* Customer */}
                      <TableCell className="pl-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0",
                              avatarColor,
                            )}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{customer.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {customer.username ? `@${customer.username}` : customer.telegramId}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Orders */}
                      <TableCell>
                        {orderCount > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium">{orderCount}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>

                      {/* Revenue */}
                      <TableCell>
                        {lastOrder && totalValue > 0 ? (
                          <span className="text-sm font-medium text-emerald-400">
                            {formatCurrency(totalValue, lastOrder.currency)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>

                      {/* Last purchase */}
                      <TableCell>
                        {lastOrder ? (
                          <span className="text-sm text-muted-foreground">
                            {relativeTime(lastOrder.createdAt, locale)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>

                      {/* Price sensitivity */}
                      <TableCell>
                        {sensitivity ? (
                          <div className="flex items-center gap-1.5">
                            <div className={cn("w-1.5 h-1.5 rounded-full", SENSITIVITY_DOTS[sensitivity])} />
                            <span className={cn("text-xs font-medium", SENSITIVITY_STYLES[sensitivity])}>
                              {sensitivity === "LOW"
                                ? i18n.language === "ru" ? "Низкая" : i18n.language === "en" ? "Low" : "Past"
                                : sensitivity === "HIGH"
                                  ? i18n.language === "ru" ? "Высокая" : i18n.language === "en" ? "High" : "Yuqori"
                                  : i18n.language === "ru" ? "Средняя" : i18n.language === "en" ? "Medium" : "O'rta"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>

                      {/* AI Tags */}
                      <TableCell>
                        {tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                                  AI_TAG_COLORS[tag] ?? "bg-gray-500/15 text-gray-400 border border-gray-500/30",
                                )}
                              >
                                {tag}
                              </span>
                            ))}
                            {tags.length > 3 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs text-muted-foreground">
                                +{tags.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>

                      {/* Arrow */}
                      <TableCell className="pr-4">
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>

          {data && data.totalPages > 1 && (
            <div className="px-4 py-4 border-t">
              <DataPagination
                currentPage={page}
                totalPages={data.totalPages}
                hasNextPage={data.hasNext}
                hasPreviousPage={data.hasPrevious}
                onPageChange={setPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
