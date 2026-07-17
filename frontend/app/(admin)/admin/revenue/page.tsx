"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DollarSign, TrendingUp, Users, Wallet } from "lucide-react"
import { KpiCard } from "@/components/kpi-card"
import {
  useAdminRevenueSummary,
  useAdminPaymentTrend,
  useAdminInvoices,
} from "@/src/hooks/useAdminRevenueQuery"

const fmtUsd = (n: number) => `$${n.toFixed(2)}`

export default function AdminRevenuePage() {
  const { data: summary, isLoading: summaryLoading } = useAdminRevenueSummary()
  const { data: trend, isLoading: trendLoading } = useAdminPaymentTrend(6)
  const { data: invoices, isLoading: invoicesLoading } = useAdminInvoices()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Wallet className="h-6 w-6 text-emerald-400" />
          Revenue
        </h1>
        <p className="text-muted-foreground text-sm mt-1 max-w-xl">
          Subscription MRR/ARR and collected payments across all organizations.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="MRR" value={fmtUsd(summary?.mrrUsd ?? 0)} icon={DollarSign} color="text-emerald-400" bg="bg-emerald-500/10" loading={summaryLoading} />
        <KpiCard label="ARR" value={fmtUsd(summary?.arrUsd ?? 0)} icon={TrendingUp} color="text-blue-400" bg="bg-blue-500/10" loading={summaryLoading} />
        <KpiCard label="Active subscriptions" value={String(summary?.activeSubscriptions ?? 0)} icon={Users} color="text-purple-400" bg="bg-purple-500/10" loading={summaryLoading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">By plan tier</h2>
          <Card className="lp-glass-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b">
                    <TableHead className="pl-4">Tier</TableHead>
                    <TableHead>Subs</TableHead>
                    <TableHead className="text-right pr-4">MRR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryLoading ? (
                    <TableRow><TableCell colSpan={3}><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                  ) : !summary?.byTier.length ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-sm text-muted-foreground">No active subscriptions.</TableCell></TableRow>
                  ) : (
                    summary.byTier.map((t) => (
                      <TableRow key={t.tier}>
                        <TableCell className="pl-4 font-medium">{t.tier}</TableCell>
                        <TableCell>{t.count}</TableCell>
                        <TableCell className="text-right pr-4 text-emerald-400 font-medium">{fmtUsd(t.mrrUsd)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">By subscription status</h2>
          <Card className="lp-glass-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b">
                    <TableHead className="pl-4">Status</TableHead>
                    <TableHead className="text-right pr-4">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryLoading ? (
                    <TableRow><TableCell colSpan={2}><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                  ) : !summary?.byStatus.length ? (
                    <TableRow><TableCell colSpan={2} className="text-center py-8 text-sm text-muted-foreground">No subscriptions.</TableCell></TableRow>
                  ) : (
                    summary.byStatus.map((s) => (
                      <TableRow key={s.status}>
                        <TableCell className="pl-4 font-medium">{s.status}</TableCell>
                        <TableCell className="text-right pr-4">{s.count}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Collected payments (last 6 months, per currency)</h2>
        <Card className="lp-glass-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b">
                  <TableHead className="pl-4">Month</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right pr-4">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trendLoading ? (
                  <TableRow><TableCell colSpan={3}><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                ) : !trend?.length ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-sm text-muted-foreground">No payments collected in this window.</TableCell></TableRow>
                ) : (
                  trend.map((t, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-4 font-medium">{t.month}</TableCell>
                      <TableCell>{t.currency}</TableCell>
                      <TableCell className="text-right pr-4 text-emerald-400 font-medium">
                        {t.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Invoices by status</h2>
        <Card className="lp-glass-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b">
                  <TableHead className="pl-4">Status</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead className="text-right pr-4">Total (USD)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoicesLoading ? (
                  <TableRow><TableCell colSpan={3}><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                ) : !invoices?.length ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-sm text-muted-foreground">No invoices yet.</TableCell></TableRow>
                ) : (
                  invoices.map((inv) => (
                    <TableRow key={inv.status}>
                      <TableCell className="pl-4 font-medium">{inv.status}</TableCell>
                      <TableCell>{inv.count}</TableCell>
                      <TableCell className="text-right pr-4 font-medium">{fmtUsd(inv.totalUsd)}</TableCell>
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
