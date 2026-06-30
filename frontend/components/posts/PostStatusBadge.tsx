import { Badge } from "@/components/ui/badge"
import { type PostStatus } from "@/lib/types/post"

interface PostStatusBadgeProps {
  status: PostStatus
}

export function PostStatusBadge({ status }: PostStatusBadgeProps) {
  switch (status) {
    case "SENT":
      return <Badge>Sent</Badge>
    case "SCHEDULED":
      return <Badge variant="secondary">Scheduled</Badge>
    case "DRAFT":
      return <Badge variant="outline">Draft</Badge>
    case "FAILED":
      return <Badge variant="destructive">Failed</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}
