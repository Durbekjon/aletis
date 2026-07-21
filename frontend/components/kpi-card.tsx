import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  label: string
  value: string
  icon: LucideIcon
  color?: string
  bg?: string
  loading?: boolean
}

export function KpiCard({ label, value, icon: Icon, color = "text-emerald-400", bg = "bg-emerald-500/10", loading }: KpiCardProps) {
  return (
    <Card className="lp-glass-card">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", bg)}>
          <Icon className={cn("h-4 w-4", color)} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{loading ? <Skeleton className="h-5 w-12 mt-0.5" /> : value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
