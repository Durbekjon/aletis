"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Zap, Hash, AlertTriangle, Sparkles } from "lucide-react"
import { KpiCard } from "@/components/kpi-card"
import {
  useAdminAiCostSummary,
  useAdminAiCostByModel,
  useAdminAiCostByFeature,
  useAdminAiCostByOrg,
} from "@/src/hooks/useAdminAiCostQuery"
import type { AiCostPeriod } from "@/src/api/adminAiCostApi"

const fmtUsd = (n: number) => `$${n.toFixed(2)}`
const fmtTokens = (n: number) => new Intl.NumberFormat("en-US", { notation: "compact" }).format(n)

export default function AdminAiCostPage() {
  const [period, setPeriod] = useState<AiCostPeriod>("month")

  const { data: summary, isLoading: summaryLoading } = useAdminAiCostSummary()
  const { data: byModel, isLoading: byModelLoading } = useAdminAiCostByModel(period)
  const { data: byFeature, isLoading: byFeatureLoading } = useAdminAiCostByFeature(period)
  const { data: byOrg, isLoading: byOrgLoading } = useAdminAiCostByOrg(period)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-emerald-400" />
            AI Cost
          </h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-xl">
            Gemini token spend across all organizations.
          </p>
        </div>
        {summary && !summary.pricingVerified && (
          <Badge variant="outline" className="gap-1.5 text-amber-400 border-amber-500/30 bg-amber-500/10">
            <AlertTriangle className="h-3 w-3" />
            Estimated — pricing not yet verified
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          label="Today"
          value={fmtUsd(summary?.today.costUsd ?? 0)}
          icon={DollarSign}
          color="text-emerald-400"
          bg="bg-emerald-500/10"
          loading={summaryLoading}
        />
        <KpiCard
          label="This month"
          value={fmtUsd(summary?.month.costUsd ?? 0)}
          icon={DollarSign}
          color="text-blue-400"
          bg="bg-blue-500/10"
          loading={summaryLoading}
        />
        <KpiCard
          label="This year"
          value={fmtUsd(summary?.year.costUsd ?? 0)}
          icon={DollarSign}
          color="text-purple-400"
          bg="bg-purple-500/10"
          loading={summaryLoading}
        />
        <KpiCard
          label="Tokens today"
          value={fmtTokens(summary?.today.totalTokens ?? 0)}
          icon={Zap}
          color="text-amber-400"
          bg="bg-amber-500/10"
          loading={summaryLoading}
        />
        <KpiCard
          label="Calls today"
          value={fmtTokens(summary?.today.callCount ?? 0)}
          icon={Hash}
          color="text-sky-400"
          bg="bg-sky-500/10"
          loading={summaryLoading}
        />
        <KpiCard
          label="Tokens this month"
          value={fmtTokens(summary?.month.totalTokens ?? 0)}
          icon={Zap}
          color="text-amber-400"
          bg="bg-amber-500/10"
          loading={summaryLoading}
        />
      </div>

      <Tabs value={period} onValueChange={(v) => setPeriod(v as AiCostPeriod)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="month">This month</TabsTrigger>
          <TabsTrigger value="year">This year</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="space-y-6">
          <BreakdownTable
            title="By model"
            loading={byModelLoading}
            rows={byModel ?? []}
            columns={["Model", "Calls", "Tokens", "Avg latency", "Cost"]}
            renderRow={(r: any) => (
              <TableRow key={r.model}>
                <TableCell className="pl-4 font-medium">{r.model}</TableCell>
                <TableCell>{fmtTokens(r.callCount)}</TableCell>
                <TableCell>{fmtTokens(r.totalTokens)}</TableCell>
                <TableCell>{r.avgLatencyMs}ms</TableCell>
                <TableCell className="text-right pr-4 font-medium text-emerald-400">
                  {fmtUsd(r.costUsd)}
                </TableCell>
              </TableRow>
            )}
          />

          <BreakdownTable
            title="By feature"
            loading={byFeatureLoading}
            rows={byFeature ?? []}
            columns={["Feature", "Calls", "Tokens", "Cost"]}
            renderRow={(r: any) => (
              <TableRow key={r.feature}>
                <TableCell className="pl-4 font-medium">{r.feature}</TableCell>
                <TableCell>{fmtTokens(r.callCount)}</TableCell>
                <TableCell>{fmtTokens(r.totalTokens)}</TableCell>
                <TableCell className="text-right pr-4 font-medium text-emerald-400">
                  {fmtUsd(r.costUsd)}
                </TableCell>
              </TableRow>
            )}
          />

          <BreakdownTable
            title="By organization"
            loading={byOrgLoading}
            rows={byOrg ?? []}
            columns={["Organization", "Calls", "Tokens", "Cost"]}
            renderRow={(r: any) => (
              <TableRow key={r.organizationId ?? "none"}>
                <TableCell className="pl-4 font-medium">
                  {r.organizationName ?? `#${r.organizationId ?? "unknown"}`}
                </TableCell>
                <TableCell>{fmtTokens(r.callCount)}</TableCell>
                <TableCell>{fmtTokens(r.totalTokens)}</TableCell>
                <TableCell className="text-right pr-4 font-medium text-emerald-400">
                  {fmtUsd(r.costUsd)}
                </TableCell>
              </TableRow>
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function BreakdownTable({
  title,
  loading,
  rows,
  columns,
  renderRow,
}: {
  title: string
  loading: boolean
  rows: any[]
  columns: string[]
  renderRow: (row: any) => React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      <Card className="lp-glass-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b">
                {columns.map((c, i) => (
                  <TableHead key={c} className={i === 0 ? "pl-4" : i === columns.length - 1 ? "text-right pr-4" : undefined}>
                    {c}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-12 text-sm text-muted-foreground">
                    No AI usage recorded for this period.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(renderRow)
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
