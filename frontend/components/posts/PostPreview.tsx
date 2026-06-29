import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { type Post, type PostStatus } from "@/lib/types/post"

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
      images?: Array<{ id: number; key: string }>
    }
  }
}

export function PostPreview({ post }: PostPreviewProps) {
  const getLogoUrl = (logo: { id: number; key: string }) => {
    return `${process.env.NEXT_PUBLIC_BACKEND_URL}/${logo.key}`
  }

  const getStatusBadge = (status: PostStatus) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="secondary">Draft</Badge>
      case "SENT":
        return <Badge className="bg-primary">Ready to Send</Badge>
      case "SCHEDULED":
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Scheduled</Badge>
      case "FAILED":
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle>Preview</CardTitle>
        <p className="text-sm text-muted-foreground">Telegram channel preview</p>
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
            <p className="text-sm">Select a channel and product to see preview</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
