import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Bot,
  MoreVertical,
  Play,
  Pause,
  Settings,
  Trash2,
  Copy,
  Hash,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react"
import type { TelegramBot } from "@/lib/types/bot"

interface BotCardProps {
  bot: TelegramBot
  onToggleStatus: (bot: TelegramBot) => void
  onDelete: (bot: TelegramBot) => void
  onCopyToken: (token: string) => void
  onOpenSettings: (bot: TelegramBot) => void
}

const statusConfig = {
  ACTIVE: { label: "Active", color: "bg-primary", icon: CheckCircle },
  INACTIVE: { label: "Inactive", color: "bg-gray-500", icon: Pause },
  ERROR: { label: "Error", color: "bg-red-500", icon: XCircle },
  CONNECTING: { label: "Connecting", color: "bg-yellow-500", icon: AlertCircle },
  // Handle potential case variations
  active: { label: "Active", color: "bg-primary", icon: CheckCircle },
  inactive: { label: "Inactive", color: "bg-gray-500", icon: Pause },
  error: { label: "Error", color: "bg-red-500", icon: XCircle },
  connecting: { label: "Connecting", color: "bg-yellow-500", icon: AlertCircle },
  // Add fallback for unknown statuses
  UNKNOWN: { label: "Unknown", color: "bg-gray-500", icon: AlertCircle },
}

export function BotCard({ bot, onToggleStatus, onDelete, onCopyToken, onOpenSettings }: BotCardProps) {
  // More robust status lookup
  const getStatusInfo = (status: string) => {
    // Ensure status is a string and not null/undefined
    const safeStatus = String(status || 'UNKNOWN')
    
    // Try exact match first
    if (statusConfig[safeStatus as keyof typeof statusConfig]) {
      return statusConfig[safeStatus as keyof typeof statusConfig]
    }
    
    // Try case-insensitive match
    const lowerStatus = safeStatus.toLowerCase()
    const upperStatus = safeStatus.toUpperCase()
    
    if (statusConfig[lowerStatus as keyof typeof statusConfig]) {
      return statusConfig[lowerStatus as keyof typeof statusConfig]
    }
    
    if (statusConfig[upperStatus as keyof typeof statusConfig]) {
      return statusConfig[upperStatus as keyof typeof statusConfig]
    }
    
    // Fallback to unknown
    return statusConfig.UNKNOWN
  }


  const renderBotAvatar = (bot: TelegramBot) => {
    if (bot.logo?.url) {
      return <AvatarImage src={bot.logo.url} />
    }
    return <AvatarFallback>
      <Bot className="h-6 w-6" />
    </AvatarFallback>
  }
  
  const statusInfo = getStatusInfo(bot.status)
  const StatusIcon = statusInfo.icon

  const formatUptime = (uptime: number) => {
    return uptime
  }

  const formatLastActive = (date?: Date) => {
    if (!date) return "Never"
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleDateString()
  }

  return (
    <Card className="lp-glass-card">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              {renderBotAvatar(bot)}
            </Avatar>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{bot.name}</h3>
                {bot.isDefault && <Badge variant="secondary">Default</Badge>}
                <Badge variant="outline" className={`${statusInfo.color} text-primary-foreground flex items-center gap-1`}>
                  <StatusIcon className="h-3 w-3" />
                  {statusInfo.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">@{bot.username}</p>
              {bot.description && <p className="text-sm text-muted-foreground">{bot.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch 
              checked={bot.status === "ACTIVE"} 
              onCheckedChange={() => onToggleStatus(bot)} 
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onOpenSettings(bot)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCopyToken(bot.token)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Token
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-red-600"
                  onClick={() => onDelete(bot)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Bot
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{bot.stats.totalMessages}</div>
            <div className="text-xs text-muted-foreground">Total Messages</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{bot.stats.activeConversations}</div>
            <div className="text-xs text-muted-foreground">Active Chats</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{formatUptime(bot.stats.uptime)}</div>
            <div className="text-xs text-muted-foreground">Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{formatLastActive(bot.lastActiveAt)}</div>
            <div className="text-xs text-muted-foreground">Last Active</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function BotCardSkeleton() {
  return (
    <Card className="lp-glass-card">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, j) => (
            <div key={j} className="text-center">
              <Skeleton className="h-8 w-16 mx-auto mb-1" />
              <Skeleton className="h-3 w-20 mx-auto" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
