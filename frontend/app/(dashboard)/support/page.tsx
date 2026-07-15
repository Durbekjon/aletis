"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  LifeBuoy,
  Inbox,
  Loader2,
  CheckCircle2,
  PlayCircle,
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "@/src/context/I18nContext"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/lib/constants"
import {
  useSupportMetrics,
  useSupportTickets,
  useUpdateTicketStatus,
} from "@/src/hooks/useSupportQuery"
import type { TicketStatus } from "@/src/api/supportApi"

const STATUS_STYLES: Record<TicketStatus, string> = {
  OPEN: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  IN_PROGRESS: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  RESOLVED: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
}

const SENTIMENT_STYLES: Record<string, string> = {
  URGENT: "bg-red-500/15 text-red-400 border border-red-500/30",
  COMPLAINT: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  NORMAL: "bg-gray-500/15 text-gray-400 border border-gray-500/30",
}

const AVATAR_COLORS = [
  "bg-blue-600", "bg-purple-600", "bg-emerald-600", "bg-orange-600",
  "bg-pink-600", "bg-teal-600", "bg-indigo-600", "bg-rose-600",
]
const avatarColor = (name: string) =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]

type Filter = "ALL" | TicketStatus

export default function SupportPage() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const locale =
    i18n.language === "ru" ? "ru-RU" : i18n.language === "en" ? "en-US" : "uz-UZ"
  const fmtDate = (s: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(s))

  const [filter, setFilter] = useState<Filter>("ALL")
  const { data: metrics, isLoading: metricsLoading } = useSupportMetrics()
  const { data: tickets, isLoading } = useSupportTickets(
    filter === "ALL" ? undefined : filter,
  )
  const updateStatus = useUpdateTicketStatus()
  const [pendingId, setPendingId] = useState<number | null>(null)

  const handleUpdate = async (id: number, status: TicketStatus) => {
    setPendingId(id)
    try {
      await updateStatus.mutateAsync({ id, status })
      toast.success(t("support.statusUpdated"))
    } catch {
      toast.error(t("support.statusError"))
    } finally {
      setPendingId(null)
    }
  }

  const statCards = [
    { key: "open", icon: Inbox, color: "text-blue-400", bg: "bg-blue-500/10", value: metrics?.open },
    { key: "inProgress", icon: PlayCircle, color: "text-yellow-400", bg: "bg-yellow-500/10", value: metrics?.inProgress },
    { key: "resolved", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", value: metrics?.resolved },
    { key: "total", icon: LifeBuoy, color: "text-purple-400", bg: "bg-purple-500/10", value: metrics?.total },
  ] as const

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <LifeBuoy className="h-6 w-6 text-emerald-400" />
          {t("support.title")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1 max-w-xl">
          {t("support.subtitle")}
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c) => (
          <Card key={c.key} className="lp-glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", c.bg)}>
                <c.icon className={cn("h-4 w-4", c.color)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t(`support.metrics.${c.key}`)}</p>
                <p className="text-xl font-bold">
                  {metricsLoading ? <Skeleton className="h-5 w-8 mt-0.5" /> : c.value ?? 0}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          <TabsTrigger value="ALL">{t("support.filterAll")}</TabsTrigger>
          <TabsTrigger value="OPEN">{t("support.status.OPEN")}</TabsTrigger>
          <TabsTrigger value="IN_PROGRESS">{t("support.status.IN_PROGRESS")}</TabsTrigger>
          <TabsTrigger value="RESOLVED">{t("support.status.RESOLVED")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tickets table */}
      <Card className="lp-glass-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="pl-4">{t("support.col.customer")}</TableHead>
                <TableHead className="w-1/3">{t("support.col.reason")}</TableHead>
                <TableHead>{t("support.col.sentiment")}</TableHead>
                <TableHead>{t("support.col.status")}</TableHead>
                <TableHead>{t("support.col.created")}</TableHead>
                <TableHead className="text-right pr-4">{t("support.col.action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !tickets?.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 opacity-20" />
                      <p className="text-sm">{t("support.empty")}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => {
                  const name = ticket.customer?.name ?? `#${ticket.id}`
                  return (
                    <TableRow key={ticket.id}>
                      <TableCell className="pl-4 py-3">
                        <div
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() =>
                            ticket.customer &&
                            router.push(`${ROUTES.CUSTOMERS}/${ticket.customer.id}`)
                          }
                        >
                          <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0", avatarColor(name))}>
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{name}</p>
                            {ticket.customer?.username ? (
                              <p className="text-xs text-muted-foreground truncate">@{ticket.customer.username}</p>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground line-clamp-2 max-w-md">{ticket.reason}</p>
                      </TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", SENTIMENT_STYLES[ticket.sentiment] ?? SENTIMENT_STYLES.NORMAL)}>
                          {ticket.sentiment === "URGENT" ? <AlertTriangle className="h-3 w-3" /> : null}
                          {t(`support.sentiment.${ticket.sentiment}`, { defaultValue: ticket.sentiment })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", STATUS_STYLES[ticket.status])}>
                          {t(`support.status.${ticket.status}`)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(ticket.createdAt)}</TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-2">
                          {ticket.status === "OPEN" ? (
                            <Button size="sm" variant="secondary" className="gap-1.5" disabled={pendingId === ticket.id} onClick={() => handleUpdate(ticket.id, "IN_PROGRESS")}>
                              {pendingId === ticket.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
                              {t("support.markInProgress")}
                            </Button>
                          ) : null}
                          {ticket.status !== "RESOLVED" ? (
                            <Button size="sm" className="gap-1.5" disabled={pendingId === ticket.id} onClick={() => handleUpdate(ticket.id, "RESOLVED")}>
                              {pendingId === ticket.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                              {t("support.markResolved")}
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
