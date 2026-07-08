"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { PostForm } from "@/components/posts/PostForm"
import { useCreatePostMutation } from "@/src/hooks/usePostsQuery"
import { useChannelsQuery } from "@/src/hooks/useChannelsQuery"
import { useTranslation } from "@/src/context/I18nContext"
import { type CreatePostRequest, type UpdatePostRequest } from "@/lib/types/post"

export default function CreatePostPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const createPostMutation = useCreatePostMutation()
  const { data: channelsData, isLoading: isChannelsLoading } = useChannelsQuery()

  const handleSubmit = async (data: CreatePostRequest | UpdatePostRequest) => {
    try {
      // For create page, we only handle CreatePostRequest
      if ('content' in data && data.content) {
        await createPostMutation.mutateAsync(data as CreatePostRequest)
        router.push("/posts")
      }
    } catch (error) {
      // Error handling is done in the mutation
    }
  }

  if (isChannelsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/posts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('posts.createPost')}</h1>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">{t('posts.loading')}</p>
        </div>
      </div>
    )
  }

  const noChannels = !channelsData || channelsData.items.length === 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/posts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('posts.createPost')}</h1>
          <p className="text-muted-foreground">
            {noChannels
              ? t('posts.noChannelsDescription')
              : t('posts.subtitle')
            }
          </p>
        </div>
      </div>

      {noChannels ? (
        <div className="text-center py-12 bg-muted/20 border border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">{t('posts.noChannelsDescription')}</p>
          <Button asChild>
            <Link href="/bots?tab=channels">
              {t('posts.noChannelsCta')}
            </Link>
          </Button>
        </div>
      ) : (
        <PostForm
          onSubmit={handleSubmit}
          isLoading={createPostMutation.isPending}
        />
      )}
    </div>
  )
}
