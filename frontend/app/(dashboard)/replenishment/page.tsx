"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  PackageCheck,
  CalendarClock,
  Send,
  MessageCircleReply,
  ShoppingBag,
  Repeat2,
  Sparkles,
  Loader2,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "@/src/context/I18nContext"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/lib/constants"
import {
  useReplenishmentMetrics,
  useUpcomingReplenishments,
  useReplenishmentReminders,
  useReplenishmentScanMutation,
  useSendReminderMutation,
} from "@/src/hooks/useReplenishmentQuery"
import type { ReplenishmentStatus, ReplenishmentMethod } from "@/src/api/replenishmentApi"

const STATUS_STYLES: Record<ReplenishmentStatus, string> = {
  SCHEDULED: "bg-gray-500/15 text-gray-400 border border-gray-500/30",
  SENT: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  RESPONDED: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  PURCHASED: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  DISMISSED: "bg-gray-500/15 text-gray-400 border border-gray-500/30",
  FAILED: "bg-red-500/15 text-red-400 border border-red-500/30",
  SKIPPED: "bg-gray-500/15 text-gray-400 border border-gray-500/30",
}

const METHOD_STYLES: Record<ReplenishmentMethod, string> = {
  CADENCE: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30",
  DOSAGE: "bg-teal-500/15 text-teal-400 border border-teal-500/30",
  AI_ESTIMATE: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
}

const AVATAR_COLORS = [
  "bg-blue-600", "bg-purple-600", "bg-emerald-600", "bg-orange-600",
  "bg-pink-600", "bg-teal-600", "bg-indigo-600", "bg-rose-600",
]
const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]

export default function ReplenishmentPage() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const locale = i18n.language === "ru" ? "ru-RU" : i18n.language === "en" ? "en-US" : "uz-UZ"

  const { data: metrics, isLoading: metricsLoading } = useReplenishmentMetrics()
  const { data: upcoming, isLoading: upcomingLoading } = useUpcomingReplenishments()
  const { data: reminders, isLoading: remindersLoading } = useReplenishmentReminders()
  const scanMutation = useReplenishmentScanMutation()
  const sendMutation = useSendReminderMutation()
  const [pendingId, setPendingId] = useState<number | null>(null)

  const fmtDate = (d: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(d))
  const daysLeft = (d: string) =>
    Math.ceil((new Date(d).getTime() - Date.now()) / (24 * 60 * 60 * 1000))

  const handleScan = async () => {
    try {
      const res = await scanMutation.mutateAsync()
      toast.success(t("replenishment.scanDone", { due: res.due, enqueued: res.enqueued }))
    } catch {
      toast.error(t("replenishment.scanError"))
    }
  }

  const handleSend = async (id: number, name: string) => {
    setPendingId(id)
    try {
      await sendMutation.mutateAsync(id)
      toast.success(t("replenishment.sendQueued", { name }))
    } catch {
      toast.error(t("replenishment.sendError"))
    } finally {
      setPendingId(null)
    }
  }

  const statCards = [
    { key: "scheduled", icon: CalendarClock, color: "text-amber-400", bg: "bg-amber-500/10", value: metrics?.scheduled },
    { key: "sent", icon: Send, color: "text-blue-400", bg: "bg-blue-500/10", value: metrics?.sent },
    { key: "responded", icon: MessageCircleReply, color: "text-yellow-400", bg: "bg-yellow-500/10", value: metrics?.responded },
    { key: "purchased", icon: ShoppingBag, color: "text-emerald-400", bg: "bg-emerald-500/10", value: metrics?.purchased },
  ] as const

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <PackageCheck className="h-6 w-6 text-teal-400" />
            {t("replenishment.title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-xl">{t("replenishment.subtitle")}</p>
        </div>
        <Button onClick={handleScan} disabled={scanMutation.isPending} className="gap-2">
          {scanMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {scanMutation.isPending ? t("replenishment.scanning") : t("replenishment.runScan")}
        </Button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((c) => (
          <Card key={c.key} className="lp-glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", c.bg)}>
                <c.icon className={cn("h-4 w-4", c.color)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t(`replenishment.metrics.${c.key}`)}</p>
                <p className="text-xl font-bold">
                  {metricsLoading ? <Skeleton className="h-5 w-8 mt-0.5" /> : c.value ?? 0}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Reorder rate */}
        <Card className="lp-glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
              <Repeat2 className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("replenishment.metrics.reorderRate")}</p>
              <p className="text-xl font-bold">
                {metricsLoading ? <Skeleton className="h-5 w-10 mt-0.5" /> : `${(metrics?.reorderRate ?? 0).toFixed(0)}%`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: upcoming vs history */}
      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">{t("replenishment.tabs.upcoming")}</TabsTrigger>
          <TabsTrigger value="history">{t("replenishment.tabs.history")}</TabsTrigger>
        </TabsList>

        {/* Upcoming run-outs */}
        <TabsContent value="upcoming">
          <Card className="lp-glass-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b">
                    <TableHead className="pl-4">{t("common.name")}</TableHead>
                    <TableHead>{t("replenishment.col.product")}</TableHead>
                    <TableHead>{t("replenishment.col.method")}</TableHead>
                    <TableHead>{t("replenishment.col.runsOut")}</TableHead>
                    <TableHead className="text-right pr-4">{t("replenishment.col.action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="pl-4"><Skeleton className="h-8 w-40" /></TableCell>
                        {Array.from({ length: 4 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : !upcoming?.length ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-20">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <PackageCheck className="h-12 w-12 opacity-20" />
                          <p className="text-sm">{t("replenishment.upcoming.empty")}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    upcoming.map((r) => {
                      const dl = daysLeft(r.predictedDepletionDate)
                      return (
                        <TableRow key={r.id} className="group">
                          <TableCell className="pl-4 py-3">
                            <div
                              className="flex items-center gap-3 cursor-pointer"
                              onClick={() => r.customer && router.push(`${ROUTES.CUSTOMERS}/${r.customer.id}`)}
                            >
                              <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0", avatarColor(r.customer?.name ?? "?"))}>
                                {(r.customer?.name ?? "?").charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">{r.customer?.name ?? `#${r.customerId}`}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {r.customer?.username ? `@${r.customer.username}` : `#${r.customerId}`}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><span className="text-sm truncate max-w-[220px] inline-block">{r.product?.name ?? `#${r.productId}`}</span></TableCell>
                          <TableCell>
                            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", METHOD_STYLES[r.method])}>
                              {t(`replenishment.method.${r.method}`)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className={cn("flex items-center gap-1.5", dl <= 0 ? "text-red-400" : "text-amber-400")}>
                              <Clock className="h-3.5 w-3.5" />
                              <span className="text-sm font-medium">
                                {dl <= 0
                                  ? t("replenishment.runningOut")
                                  : `${dl} ${t("replenishment.daysShort")} · ${fmtDate(r.predictedDepletionDate)}`}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="gap-1.5"
                              disabled={pendingId === r.id}
                              onClick={() => handleSend(r.id, r.customer?.name ?? `#${r.customerId}`)}
                            >
                              {pendingId === r.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Send className="h-3.5 w-3.5" />
                              )}
                              {t("replenishment.sendNow")}
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reminder history */}
        <TabsContent value="history">
          <Card className="lp-glass-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b">
                    <TableHead className="pl-4">{t("common.name")}</TableHead>
                    <TableHead>{t("replenishment.col.product")}</TableHead>
                    <TableHead>{t("replenishment.col.status")}</TableHead>
                    <TableHead className="w-2/5">{t("replenishment.col.message")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {remindersLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 4 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : !reminders?.length ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-20">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <Send className="h-12 w-12 opacity-20" />
                          <p className="text-sm">{t("replenishment.history.empty")}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    reminders.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="pl-4 py-3">
                          <p
                            className="font-semibold text-sm truncate cursor-pointer hover:underline"
                            onClick={() => r.customer && router.push(`${ROUTES.CUSTOMERS}/${r.customer.id}`)}
                          >
                            {r.customer?.name ?? `#${r.customerId}`}
                          </p>
                        </TableCell>
                        <TableCell><span className="text-sm truncate max-w-[180px] inline-block">{r.product?.name ?? `#${r.productId}`}</span></TableCell>
                        <TableCell>
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", STATUS_STYLES[r.status])}>
                            {t(`replenishment.status.${r.status}`)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs text-muted-foreground line-clamp-2 max-w-md">
                            {r.generatedMessage ?? <span className="italic opacity-60">{t("replenishment.notSentYet")}</span>}
                          </p>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
