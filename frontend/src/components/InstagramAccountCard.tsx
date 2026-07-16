import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Instagram, Trash2, AlertTriangle } from "lucide-react"
import type { InstagramAccount } from "@/src/api/instagramApi"

interface InstagramAccountCardProps {
  account: InstagramAccount
  onDisconnect: (account: InstagramAccount) => void
  isDisconnecting?: boolean
}

export function InstagramAccountCard({ account, onDisconnect, isDisconnecting }: InstagramAccountCardProps) {
  const expiresSoon =
    !!account.tokenExpiresAt &&
    new Date(account.tokenExpiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000

  return (
    <Card className="lp-glass-card">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback>
                <Instagram className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">
                  {account.instagramUsername ? `@${account.instagramUsername}` : account.instagramUserId}
                </h3>
                <Badge variant="outline" className="bg-primary text-primary-foreground">
                  Connected
                </Badge>
                {expiresSoon && (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Token expiring soon
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Ulangan: {new Date(account.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600"
            onClick={() => onDisconnect(account)}
            disabled={isDisconnecting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Uzish
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function InstagramAccountCardSkeleton() {
  return (
    <Card className="lp-glass-card">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      </CardContent>
    </Card>
  )
}
