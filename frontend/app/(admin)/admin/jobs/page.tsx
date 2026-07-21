"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Cpu, AlertTriangle } from "lucide-react"
import { useAdminJobsHealth, useAdminJobsFailures } from "@/src/hooks/useAdminJobsQuery"

export default function AdminJobsPage() {
  const { data: health, isLoading: healthLoading } = useAdminJobsHealth()
  const { data: failures, isLoading: failuresLoading } = useAdminJobsFailures()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Cpu className="h-6 w-6 text-emerald-400" />
          Background jobs
        </h1>
        <p className="text-muted-foreground text-sm mt-1 max-w-xl">
          Queue health and recent failures across all BullMQ queues.
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Queue health</h2>
        <Card className="lp-glass-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b">
                  <TableHead className="pl-4">Queue</TableHead>
                  <TableHead>Waiting</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead className="text-right pr-4">Delayed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {healthLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-12" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : !health?.length ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">No queues found.</TableCell></TableRow>
                ) : (
                  health.map((q) => (
                    <TableRow key={q.name}>
                      <TableCell className="pl-4 font-medium">{q.name}</TableCell>
                      <TableCell>{q.waiting}</TableCell>
                      <TableCell>{q.active}</TableCell>
                      <TableCell>{q.completed}</TableCell>
                      <TableCell>
                        {q.failed > 0 ? (
                          <span className="text-red-400 font-medium">{q.failed}</span>
                        ) : (
                          q.failed
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-4">{q.delayed}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Recent failures</h2>
        {failuresLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !failures?.length ? (
          <Card className="lp-glass-card">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No recent job failures.
            </CardContent>
          </Card>
        ) : (
          failures.map((f) => (
            <Card key={f.queue} className="lp-glass-card">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1.5 text-red-400 border-red-500/30 bg-red-500/10">
                    <AlertTriangle className="h-3 w-3" />
                    {f.queue}
                  </Badge>
                </div>
                {f.failures.map((job) => (
                  <div key={job.id} className="text-xs border-t border-border/50 pt-2">
                    <p className="font-medium">{job.jobName} <span className="text-muted-foreground">#{job.id}</span></p>
                    <p className="text-muted-foreground truncate">{job.failedReason}</p>
                    <p className="text-muted-foreground">Attempts: {job.attemptsMade}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
