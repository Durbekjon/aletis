"use client"

import { useParams, useRouter } from "next/navigation"
import { useTranslation } from "@/src/context/I18nContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Trash2 } from "lucide-react"
import Link from "next/link"
import { usePostQuery, useUpdatePostMutation, useDeletePostMutation } from "@/src/hooks/usePostsQuery"
import { PostForm } from "@/components/posts/PostForm"
import { PageLoader } from "@/components/ui/spinner"
import { PostStatusBadge } from "@/components/posts/PostStatusBadge"
import { PostPreview } from "@/components/posts/PostPreview"
import { type CreatePostRequest, type UpdatePostRequest } from "@/lib/types/post"
import { formatPostDate } from "@/lib/utils/post-template"

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useTranslation()
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
    if (confirm(t("posts.detail.confirmDelete"))) {
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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('posts.detail.title')}</h1>
            <p className="text-muted-foreground">{t('posts.detail.loadingDesc')}</p>
          </div>
        </div>
        <PageLoader label={t('posts.detail.loading')} />
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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('posts.detail.title')}</h1>
            <p className="text-muted-foreground">{t('posts.detail.notFound')}</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-destructive">{t('posts.detail.loadFailed')}</p>
              <Button asChild className="mt-4">
                <Link href="/posts">{t('posts.detail.backToPosts')}</Link>
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/posts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('posts.detail.title')}</h1>
            <p className="text-muted-foreground">
              {post.channel?.title || t('posts.detail.unknownChannel')} • {formatPostDate(post.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditable && (
            <Button variant="outline" asChild>
              <Link href={`/posts/${post.id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                {t('posts.detail.edit')}
              </Link>
            </Button>
          )}
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={deletePostMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('posts.detail.delete')}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Post Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('posts.detail.info')}</CardTitle>
              <CardDescription>{t('posts.detail.infoDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('posts.detail.status')}</label>
                  <div className="mt-1">
                    <PostStatusBadge status={post.status} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('posts.detail.channel')}</label>
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
                  <label className="text-sm font-medium text-muted-foreground">{t('posts.detail.created')}</label>
                  <div className="mt-1 text-sm">{formatPostDate(post.createdAt)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('posts.detail.updated')}</label>
                  <div className="mt-1 text-sm">{formatPostDate(post.updatedAt)}</div>
                </div>
              </div>

              {post.sentAt && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('posts.detail.sentAt')}</label>
                  <div className="mt-1 text-sm">{formatPostDate(post.sentAt)}</div>
                </div>
              )}

              {post.scheduledAt && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('posts.detail.scheduledFor')}</label>
                  <div className="mt-1 text-sm">{formatPostDate(post.scheduledAt)}</div>
                </div>
              )}

              {post.telegramMessageId && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('posts.detail.telegramMessageId')}</label>
                  <div className="mt-1 text-sm font-mono">{post.telegramMessageId}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('posts.detail.content')}</CardTitle>
              <CardDescription>{t('posts.detail.contentDesc')}</CardDescription>
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
                <CardTitle>{t('posts.detail.product')}</CardTitle>
                <CardDescription>{t('posts.detail.productDesc')}</CardDescription>
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
                <CardTitle>{t('posts.detail.editPost')}</CardTitle>
                <CardDescription>{t('posts.detail.editPostDesc')}</CardDescription>
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
