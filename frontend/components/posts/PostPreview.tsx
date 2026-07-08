import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { type Post, type PostStatus } from "@/lib/types/post"
import { useTranslation } from "@/src/context/I18nContext"

interface PostPreviewProps {
  post: {
    content: string
    status: PostStatus
    channel?: {
      title: string
      username: string
    }
    product?: {
      name: string
      images?: Array<{ id: number; key: string; url: string }>
    }
  }
}

export function PostPreview({ post }: PostPreviewProps) {
  const { t } = useTranslation()

  const getLogoUrl = (logo: { id: number; key: string; url?: string }) => {
    if (logo.url) return logo.url
    return `${process.env.NEXT_PUBLIC_BACKEND_URL}/${logo.key}`
  }

  const getStatusBadge = (status: PostStatus) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="secondary">{t('posts.statusDraft')}</Badge>
      case "SENT":
        return <Badge className="bg-primary">{t('posts.statusReadyToSend')}</Badge>
      case "SCHEDULED":
        return <Badge variant="outline" className="text-blue-600 border-blue-600">{t('posts.statusScheduled')}</Badge>
      case "FAILED":
        return <Badge variant="destructive">{t('posts.statusFailed')}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle>{t('posts.previewCardTitle')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('posts.previewCardDescription')}</p>
      </CardHeader>
      <CardContent>
        {post.channel && post.product ? (
          <div className="space-y-4">
            {/* Channel Header */}
            <div className="pb-4 border-b">
              <div className="font-semibold text-sm">{post.channel.title}</div>
              <div className="text-xs text-muted-foreground">@{post.channel.username}</div>
            </div>

            {/* Product Images */}
            {post.product.images && (
              <div className="space-y-2">
                {post.product.images.map((image) => (
                  <img
                    key={image.id}
                    src={getLogoUrl(image)}
                    alt={`Product ${image.id}`}
                    className="w-full rounded-lg object-cover max-h-48"
                  />
                ))}
              </div>
            )}

            {/* Post Content */}
            <div className="text-sm whitespace-pre-wrap break-words">{post.content}</div>

            {/* Status Badge */}
            <div className="pt-4 border-t">
              {getStatusBadge(post.status)}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">{t('posts.previewEmptyState')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
