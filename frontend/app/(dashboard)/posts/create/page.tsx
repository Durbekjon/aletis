"use client"

import { useRouter } from "next/navigation"
import { useTranslation } from "@/src/context/I18nContext"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { PostForm } from "@/components/posts/PostForm"
import { useCreatePostMutation } from "@/src/hooks/usePostsQuery"
import { type CreatePostRequest, type UpdatePostRequest } from "@/lib/types/post"

export default function CreatePostPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const createPostMutation = useCreatePostMutation()

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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('posts.createTitle')}</h1>
          <p className="text-muted-foreground">{t('posts.createDesc')}</p>
        </div>
      </div>

      <PostForm
        onSubmit={handleSubmit}
        isLoading={createPostMutation.isPending}
      />
    </div>
  )
}
