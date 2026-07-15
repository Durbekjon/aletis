"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Gift, Coins, MinusCircle, UserPlus, Trophy } from "lucide-react"
import { useTranslation } from "@/src/context/I18nContext"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/lib/constants"
import { useLoyaltyMetrics } from "@/src/hooks/useLoyaltyQuery"

const AVATAR_COLORS = [
  "bg-blue-600", "bg-purple-600", "bg-emerald-600", "bg-orange-600",
  "bg-pink-600", "bg-teal-600", "bg-indigo-600", "bg-rose-600",
]
const avatarColor = (name: string) =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]

export default function LoyaltyPage() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const locale =
    i18n.language === "ru" ? "ru-RU" : i18n.language === "en" ? "en-US" : "uz-UZ"
  const fmt = (n: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n)

  const { data: metrics, isLoading } = useLoyaltyMetrics()

  const statCards = [
    { key: "issued", icon: Coins, color: "text-emerald-400", bg: "bg-emerald-500/10", value: metrics?.pointsIssued },
    { key: "redeemed", icon: MinusCircle, color: "text-orange-400", bg: "bg-orange-500/10", value: metrics?.pointsRedeemed },
    { key: "referrals", icon: UserPlus, color: "text-sky-400", bg: "bg-sky-500/10", value: metrics?.successfulReferrals },
  ] as const

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Gift className="h-6 w-6 text-emerald-400" />
          {t("loyalty.title")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1 max-w-xl">
          {t("loyalty.subtitle")}
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((c) => (
          <Card key={c.key} className="lp-glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", c.bg)}>
                <c.icon className={cn("h-4 w-4", c.color)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t(`loyalty.metrics.${c.key}`)}</p>
                <p className="text-xl font-bold">
                  {isLoading ? <Skeleton className="h-5 w-10 mt-0.5" /> : fmt(c.value ?? 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top referrers */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
          <Trophy className="h-4 w-4 text-amber-400" />
          {t("loyalty.topReferrers")}
        </h2>
        <Card className="lp-glass-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b">
                  <TableHead className="pl-4">{t("loyalty.col.customer")}</TableHead>
                  <TableHead>{t("loyalty.col.referrals")}</TableHead>
                  <TableHead className="text-right pr-4">{t("loyalty.col.points")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 3 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : !metrics?.topReferrers?.length ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <UserPlus className="h-12 w-12 opacity-20" />
                        <p className="text-sm">{t("loyalty.empty")}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  metrics.topReferrers.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="pl-4 py-3">
                        <div
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => router.push(`${ROUTES.CUSTOMERS}/${r.id}`)}
                        >
                          <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0", avatarColor(r.name))}>
                            {r.name.charAt(0).toUpperCase()}
                          </div>
                          <p className="font-semibold text-sm truncate">{r.name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-sky-400 text-sm font-medium">
                          <UserPlus className="h-3.5 w-3.5" />
                          {r.referrals}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <span className="text-sm font-semibold text-emerald-400">
                          {fmt(r.points)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
