"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Repeat,
  MoonStar,
  Send,
  MessageCircleReply,
  PartyPopper,
  Coins,
  Sparkles,
  Loader2,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "@/src/context/I18nContext"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/lib/constants"
import {
  useRetentionMetrics,
  useDormantCustomers,
  useWinBackAttempts,
  useScanMutation,
  useWinBackMutation,
} from "@/src/hooks/useRetentionQuery"
import type { WinBackStatus } from "@/src/api/retentionApi"

const STATUS_STYLES: Record<WinBackStatus, string> = {
  QUEUED: "bg-gray-500/15 text-gray-400 border border-gray-500/30",
  SENT: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  RESPONDED: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  RECOVERED: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  FAILED: "bg-red-500/15 text-red-400 border border-red-500/30",
  SKIPPED: "bg-gray-500/15 text-gray-400 border border-gray-500/30",
}

const CHANNEL_STYLES: Record<string, string> = {
  TELEGRAM: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
  INSTAGRAM: "bg-pink-500/15 text-pink-400 border border-pink-500/30",
}

const HEALTH_STYLES: Record<string, string> = {
  cooling: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  at_risk: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  lost: "bg-red-500/15 text-red-400 border border-red-500/30",
}

const AVATAR_COLORS = [
  "bg-blue-600", "bg-purple-600", "bg-emerald-600", "bg-orange-600",
  "bg-pink-600", "bg-teal-600", "bg-indigo-600", "bg-rose-600",
]
const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]

export default function RetentionPage() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const locale = i18n.language === "ru" ? "ru-RU" : i18n.language === "en" ? "en-US" : "uz-UZ"

  const { data: metrics, isLoading: metricsLoading } = useRetentionMetrics()
  const { data: dormant, isLoading: dormantLoading } = useDormantCustomers()
  const { data: attempts, isLoading: attemptsLoading } = useWinBackAttempts()
  const scanMutation = useScanMutation()
  const winBackMutation = useWinBackMutation()
  const [pendingId, setPendingId] = useState<number | null>(null)

  const fmt = (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n)

  const handleScan = async () => {
    try {
      const res = await scanMutation.mutateAsync({})
      toast.success(t("retention.scanDone", { dormant: res.dormant, enqueued: res.enqueued }))
    } catch {
      toast.error(t("retention.scanError"))
    }
  }

  const handleWinBack = async (customerId: number, name: string) => {
    setPendingId(customerId)
    try {
      await winBackMutation.mutateAsync({ customerId })
      toast.success(t("retention.winBackQueued", { name }))
    } catch {
      toast.error(t("retention.winBackError"))
    } finally {
      setPendingId(null)
    }
  }

  const statCards = [
    { key: "dormant", icon: MoonStar, color: "text-amber-400", bg: "bg-amber-500/10", value: metrics?.dormantCount },
    { key: "sent", icon: Send, color: "text-blue-400", bg: "bg-blue-500/10", value: metrics?.sent },
    { key: "responded", icon: MessageCircleReply, color: "text-yellow-400", bg: "bg-yellow-500/10", value: metrics?.responded },
    { key: "recovered", icon: PartyPopper, color: "text-emerald-400", bg: "bg-emerald-500/10", value: metrics?.recovered },
  ] as const

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Repeat className="h-6 w-6 text-emerald-400" />
            {t("retention.title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-xl">{t("retention.subtitle")}</p>
        </div>
        <Button onClick={handleScan} disabled={scanMutation.isPending} className="gap-2">
          {scanMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {scanMutation.isPending ? t("retention.scanning") : t("retention.runScan")}
        </Button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {statCards.map((c) => (
          <Card key={c.key} className="lp-glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", c.bg)}>
                <c.icon className={cn("h-4 w-4", c.color)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t(`retention.metrics.${c.key}`)}</p>
                <p className="text-xl font-bold">
                  {metricsLoading ? <Skeleton className="h-5 w-8 mt-0.5" /> : fmt(c.value ?? 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Revenue recovered */}
        <Card className="lp-glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Coins className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("retention.metrics.revenue")}</p>
              <p className="text-xl font-bold text-emerald-400">
                {metricsLoading ? <Skeleton className="h-5 w-12 mt-0.5" /> : fmt(metrics?.revenueRecovered ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recovery rate */}
        <Card className="lp-glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
              <Repeat className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("retention.metrics.recoveryRate")}</p>
              <p className="text-xl font-bold">
                {metricsLoading ? <Skeleton className="h-5 w-10 mt-0.5" /> : `${(metrics?.recoveryRate ?? 0).toFixed(0)}%`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: dormant vs history */}
      <Tabs defaultValue="dormant" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dormant">{t("retention.tabs.dormant")}</TabsTrigger>
          <TabsTrigger value="attempts">{t("retention.tabs.attempts")}</TabsTrigger>
        </TabsList>

        {/* Dormant customers */}
        <TabsContent value="dormant">
          <Card className="lp-glass-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b">
                    <TableHead className="pl-4">{t("common.name")}</TableHead>
                    <TableHead>{t("retention.col.channel")}</TableHead>
                    <TableHead>{t("retention.col.dormant")}</TableHead>
                    <TableHead>{t("retention.col.orders")}</TableHead>
                    <TableHead>{t("retention.col.spent")}</TableHead>
                    <TableHead>{t("retention.col.churn")}</TableHead>
                    <TableHead className="text-right pr-4">{t("retention.col.action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dormantLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="pl-4"><Skeleton className="h-8 w-40" /></TableCell>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : !dormant?.length ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-20">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <PartyPopper className="h-12 w-12 opacity-20" />
                          <p className="text-sm">{t("retention.dormant.empty")}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    dormant.map((d) => (
                      <TableRow key={d.id} className="group">
                        <TableCell className="pl-4 py-3">
                          <div
                            className="flex items-center gap-3 cursor-pointer"
                            onClick={() => router.push(`${ROUTES.CUSTOMERS}/${d.id}`)}
                          >
                            <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0", avatarColor(d.name))}>
                              {d.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate">{d.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {d.username ? `@${d.username}` : `#${d.id}`}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", CHANNEL_STYLES[d.channel])}>
                            {d.channel === "TELEGRAM" ? "Telegram" : "Instagram"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-amber-400">
                            <Clock className="h-3.5 w-3.5" />
                            <span className="text-sm font-medium">
                              {d.dormantDays} {t("retention.daysShort")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell><span className="text-sm">{d.orderCount}</span></TableCell>
                        <TableCell>
                          <span className="text-sm font-medium text-emerald-400">
                            {fmt(d.totalSpent)} {d.currency}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", HEALTH_STYLES[d.healthTier])}>
                              {t(`retention.health.${d.healthTier}`)}
                            </span>
                            <span className="text-xs text-muted-foreground">{d.churnRisk}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="gap-1.5"
                            disabled={pendingId === d.id}
                            onClick={() => handleWinBack(d.id, d.name)}
                          >
                            {pendingId === d.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                            {t("retention.winBack")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Win-back history */}
        <TabsContent value="attempts">
          <Card className="lp-glass-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b">
                    <TableHead className="pl-4">{t("common.name")}</TableHead>
                    <TableHead>{t("retention.col.status")}</TableHead>
                    <TableHead className="w-1/2">{t("retention.col.message")}</TableHead>
                    <TableHead className="text-right pr-4">{t("retention.col.recovered")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attemptsLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 4 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : !attempts?.length ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-20">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <Send className="h-12 w-12 opacity-20" />
                          <p className="text-sm">{t("retention.attempts.empty")}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    attempts.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="pl-4 py-3">
                          <p
                            className="font-semibold text-sm truncate cursor-pointer hover:underline"
                            onClick={() => router.push(`${ROUTES.CUSTOMERS}/${a.customerId}`)}
                          >
                            {a.customer?.name ?? `#${a.customerId}`}
                          </p>
                        </TableCell>
                        <TableCell>
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", STATUS_STYLES[a.status])}>
                            {t(`retention.status.${a.status}`)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs text-muted-foreground line-clamp-2 max-w-md">
                            {a.generatedMessage ?? <span className="italic opacity-60">{t("retention.notSentYet")}</span>}
                          </p>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          {a.recoveredRevenue != null ? (
                            <span className="text-sm font-semibold text-emerald-400">
                              +{fmt(a.recoveredRevenue)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
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
