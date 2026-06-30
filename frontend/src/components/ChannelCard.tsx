import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import {
  MoreVertical,
  Settings,
  Trash2,
  Play,
  Hash,
} from "lucide-react"
import type { TelegramChannel } from "@/lib/types/bot"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ChannelCardProps {
  channel: TelegramChannel
  onDelete: (channel: TelegramChannel) => void
  onConfigure: (channel: TelegramChannel) => void
  onTestConnection: (channel: TelegramChannel) => void
}

export function ChannelCard({ channel, onDelete, onConfigure, onTestConnection }: ChannelCardProps) {

  const getLogoUrl = (key: string) => `${process.env.NEXT_PUBLIC_BACKEND_URL}/${key}`

  const renderChannelAvatar = (channel: TelegramChannel) => {
    if (channel.logo?.key) {
      return <Avatar className="h-12 w-12"><AvatarImage src={getLogoUrl(channel.logo.key)} /></Avatar>
    }
    return <Avatar><AvatarFallback>{channel.channelName.charAt(0)}</AvatarFallback></Avatar>
  }
  return (
    <Card className="lp-glass-card">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              {renderChannelAvatar(channel)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{channel.channelName}</h3>
                <Badge variant={channel.isConnected ? "default" : "secondary"}>
                  {channel.isConnected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
              {channel.channelUsername && (
                <p className="text-sm text-muted-foreground">@{channel.channelUsername}</p>
              )}
              <p className="text-xs text-muted-foreground">ID: {channel.channelId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* <Switch checked={channel.autoPost.enabled} /> */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onConfigure(channel)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onTestConnection(channel)}>
                  <Play className="h-4 w-4 mr-2" />
                  Test Connection
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-red-600"
                  onClick={() => onDelete(channel)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {channel.autoPost.enabled && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <h4 className="text-sm font-medium mb-2">Auto-posting Settings</h4>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>New Products: {channel.autoPost.newProducts ? "✓" : "✗"}</span>
              <span>Promotions: {channel.autoPost.promotions ? "✓" : "✗"}</span>
              <span>Schedule: {channel.autoPost.schedule}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ChannelCardSkeleton() {
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
      </CardContent>
    </Card>
  )
}
