"use client"

import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Trash2 } from "lucide-react"
import Link from "next/link"
import { usePostQuery, useUpdatePostMutation, useDeletePostMutation } from "@/src/hooks/usePostsQuery"
import { PostForm } from "@/components/posts/PostForm"
import { PostStatusBadge } from "@/components/posts/PostStatusBadge"
import { PostPreview } from "@/components/posts/PostPreview"
import { type CreatePostRequest, type UpdatePostRequest } from "@/lib/types/post"
import { formatPostDate } from "@/lib/utils/post-template"

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const postId = parseInt(params.id as string)
  
  const { data: post, isLoading, error } = usePostQuery(postId)
  const updatePostMutation = useUpdatePostMutation()
  const deletePostMutation = useDeletePostMutation()

  const handleUpdate = async (data: CreatePostRequest | UpdatePostRequest) => {
    try {
      // For update, we only handle UpdatePostRequest
      if ('content' in data) {
        await updatePostMutation.mutateAsync({ id: postId, payload: data as UpdatePostRequest })
      }
    } catch (error) {
      // Error handling is done in the mutation
    }
  }

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this post?")) {
      try {
        await deletePostMutation.mutateAsync(postId)
        router.push("/posts")
      } catch (error) {
        // Error handling is done in the mutation
      }
    }
  }

  const getLogoUrl = (logo: { id: number; key: string; url?: string }) => {
    if (logo.url) return logo.url
    return `${process.env.NEXT_PUBLIC_BACKEND_URL}/${logo.key}`
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/posts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Post Details</h1>
            <p className="text-muted-foreground">Loading post details...</p>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/posts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Post Details</h1>
            <p className="text-muted-foreground">Post not found</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-destructive">Failed to load post. Please try again.</p>
              <Button asChild className="mt-4">
                <Link href="/posts">Back to Posts</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isEditable = post.status !== "SENT"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/posts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Post Details</h1>
            <p className="text-muted-foreground">
              {post.channel?.title || "Unknown Channel"} • {formatPostDate(post.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditable && (
            <Button variant="outline" asChild>
              <Link href={`/posts/${post.id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          )}
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={deletePostMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Post Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Post Information</CardTitle>
              <CardDescription>Details about this post</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <PostStatusBadge status={post.status} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Channel</label>
                  <div className="mt-1">
                    {post.channel ? (
                      <Badge className="bg-blue-500">
                        {post.channel.title}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <div className="mt-1 text-sm">{formatPostDate(post.createdAt)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Updated</label>
                  <div className="mt-1 text-sm">{formatPostDate(post.updatedAt)}</div>
                </div>
              </div>

              {post.sentAt && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Sent At</label>
                  <div className="mt-1 text-sm">{formatPostDate(post.sentAt)}</div>
                </div>
              )}

              {post.scheduledAt && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Scheduled For</label>
                  <div className="mt-1 text-sm">{formatPostDate(post.scheduledAt)}</div>
                </div>
              )}

              {post.telegramMessageId && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Telegram Message ID</label>
                  <div className="mt-1 text-sm font-mono">{post.telegramMessageId}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
              <CardDescription>The post content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap break-words text-sm">
                {post.content}
              </div>
            </CardContent>
          </Card>

          {post.product && (
            <Card>
              <CardHeader>
                <CardTitle>Product</CardTitle>
                <CardDescription>Associated product information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  {post.product.images && (
                    <img
                      src={getLogoUrl(post.product.images[0])}
                      alt={post.product.name}
                      className="h-16 w-16 rounded-md object-cover"
                    />
                  )}
                  <div>
                    <div className="font-medium">{post.product.name}</div>
                    <div className="text-sm text-muted-foreground">
                      ${post.product.price} {post.product.currency}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Edit Form */}
          {isEditable && (
            <Card>
              <CardHeader>
                <CardTitle>Edit Post</CardTitle>
                <CardDescription>Update the post content and settings</CardDescription>
              </CardHeader>
              <CardContent>
                <PostForm
                  initialData={post}
                  onSubmit={handleUpdate}
                  isLoading={updatePostMutation.isPending}
                  isEditing={true}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Preview */}
        <div className="lg:col-span-1">
          <PostPreview
            post={{
              content: post.content,
              status: post.status,
              channel: post.channel,
              product: post.product
            }}
          />
        </div>
      </div>
    </div>
  )
}
