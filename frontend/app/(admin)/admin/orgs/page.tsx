"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Building2 } from "lucide-react"
import { useAdminOrgs } from "@/src/hooks/useAdminOrgsQuery"

const fmtUsd = (n: number) => `$${n.toFixed(2)}`

function timeAgo(iso: string | null): string {
  if (!iso) return "never"
  const diffMs = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days === 0) return "today"
  if (days === 1) return "1 day ago"
  return `${days} days ago`
}

export default function AdminOrgsPage() {
  const { data: orgs, isLoading } = useAdminOrgs()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="h-6 w-6 text-emerald-400" />
          Organizations
        </h1>
        <p className="text-muted-foreground text-sm mt-1 max-w-xl">
          Plan, activity, and AI cost vs. revenue per tenant.
        </p>
      </div>

      <Card className="lp-glass-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="pl-4">Organization</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bots</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead>AI cost (month)</TableHead>
                <TableHead className="text-right pr-4">Revenue (month)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !orgs?.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                    No organizations yet.
                  </TableCell>
                </TableRow>
              ) : (
                orgs.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="pl-4 py-3">
                      <p className="font-semibold text-sm">{org.name}</p>
                      <p className="text-xs text-muted-foreground">{org.category}</p>
                    </TableCell>
                    <TableCell>{org.planTier ?? "—"}</TableCell>
                    <TableCell>{org.subscriptionStatus ?? "—"}</TableCell>
                    <TableCell>{org.botCount}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{timeAgo(org.lastActivityAt)}</TableCell>
                    <TableCell className="font-medium">{fmtUsd(org.aiCostThisMonthUsd)}</TableCell>
                    <TableCell className="text-right pr-4">
                      {org.revenueThisMonth.length === 0
                        ? <span className="text-muted-foreground">—</span>
                        : org.revenueThisMonth.map((r, i) => (
                            <div key={i} className="text-emerald-400 font-medium">
                              {r.amount.toLocaleString()} {r.currency}
                            </div>
                          ))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
