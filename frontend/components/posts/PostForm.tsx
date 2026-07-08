"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Save, Send, Clock } from "lucide-react"
import { useChannelsQuery } from "@/src/hooks/useChannelsQuery"
import { useProductsQuery } from "@/src/hooks/useProductsQuery"
import { generatePostContent } from "@/lib/utils/post-template"
import { type Post, type PostStatus, type CreatePostRequest, type UpdatePostRequest } from "@/lib/types/post"
import { PostPreview } from "./PostPreview"
import { useTranslation } from "@/src/context/I18nContext"

interface PostFormProps {
  initialData?: Post
  onSubmit: (data: CreatePostRequest | UpdatePostRequest) => void
  isLoading?: boolean
  isEditing?: boolean
}

export function PostForm({ initialData, onSubmit, isLoading = false, isEditing = false }: PostFormProps) {
  const { t } = useTranslation()
  const [selectedChannel, setSelectedChannel] = useState<string>("")
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [content, setContent] = useState("")
  const [status, setStatus] = useState<PostStatus>("DRAFT")
  const [scheduledAt, setScheduledAt] = useState("")

  const { data: channels } = useChannelsQuery()
  const { data: products } = useProductsQuery()

  // Initialize form with existing data
  useEffect(() => {
    if (initialData) {
      setSelectedChannel(initialData.channelId.toString())
      setSelectedProduct(initialData.productId?.toString() || "")
      setContent(initialData.content)
      setStatus(initialData.status)
      if (initialData.scheduledAt) {
        setScheduledAt(new Date(initialData.scheduledAt).toISOString().slice(0, 16))
      }
    } 
    if(channels) {
      setSelectedChannel(channels.items[0].id.toString())
    }
    if (products) {
      handleProductChange(products.items[0].id.toString())
    }
  }, [initialData, channels, products])

  const selectedProductData = products?.items.find((p) => p.id === selectedProduct)
  const selectedChannelData = channels?.items.find((c) => c.id.toString() === selectedChannel)

  // Auto-generate content when product is selected
  const handleProductChange = (productId: string) => {
    setSelectedProduct(productId)
    const product = products?.items.find((p) => p.id === productId)
    if (product) {
      setContent(generatePostContent(product))
    }
  }

  const handleSubmit = () => {
    if (!selectedChannel || !content.trim()) return

    const baseData = {
      content: content.trim(),
      channelId: parseInt(selectedChannel),
      productId: selectedProduct ? parseInt(selectedProduct) : undefined,
    }

    if (status === "DRAFT") {
      onSubmit({ ...baseData, status: "DRAFT" })
    } else if (status === "SENT") {
      onSubmit({ ...baseData, status: "SENT" })
    } else if (status === "SCHEDULED") {
      onSubmit({ 
        ...baseData, 
        status: "SCHEDULED", 
        scheduledAt: new Date(scheduledAt).toISOString() 
      })
    }
  }

  const isContentEditable = !isEditing || initialData?.status !== "SENT"

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Form Section */}
      <div className="lg:col-span-2 space-y-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Channel Selection */}
          <Card>
            <CardHeader>
              <CardTitle>{t('posts.channelCardTitle')}</CardTitle>
              <CardDescription>{t('posts.channelCardDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Select 
                value={selectedChannel} 
                onValueChange={setSelectedChannel}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('posts.selectChannelPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {channels?.items.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id.toString()}>
                       @{channel.channelUsername}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Product Selection */}
          <Card>
            <CardHeader>
              <CardTitle>{t('posts.productCardTitle')}</CardTitle>
              <CardDescription>{t('posts.productCardDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Select 
                value={selectedProduct} 
                onValueChange={handleProductChange}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('posts.selectProductPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {products?.items.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.currency === 'USD' ? '$' : ''}{product.price})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Content Editor */}
        <Card>
          <CardHeader>
            <CardTitle>{t('posts.contentCardTitle')}</CardTitle>
            <CardDescription>{t('posts.contentCardDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder={t('posts.contentPlaceholder')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
              disabled={!isContentEditable || isLoading}
            />
            <div className="text-sm text-muted-foreground">{t('posts.charactersCount', { count: content.length })}</div>
          </CardContent>
        </Card>

        {/* Status and Scheduling */}
        <Card>
          <CardHeader>
            <CardTitle>{t('posts.publishingCardTitle')}</CardTitle>
            <CardDescription>{t('posts.publishingCardDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('posts.statusLabel')}</Label>
              <Select 
                value={status} 
                onValueChange={(value: PostStatus) => setStatus(value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">{t('posts.statusDraft')}</SelectItem>
                  <SelectItem value="SENT">{t('posts.actionSendNow')}</SelectItem>
                  <SelectItem value="SCHEDULED">{t('posts.statusScheduled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {status === "SCHEDULED" && (
              <div className="space-y-2">
                <Label>{t('posts.scheduledAtLabel')}</Label>
                <Input 
                  type="datetime-local" 
                  value={scheduledAt} 
                  onChange={(e) => setScheduledAt(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={() => handleSubmit()}
            disabled={isLoading || !selectedChannel || !content.trim()}
          >
            <Save className="h-4 w-4 mr-2" />
             {isEditing ? t('posts.editPost') : t('posts.createPost')}
          </Button>
        </div>
      </div>

      {/* Preview Section */}
      <div className="lg:col-span-1">
        <PostPreview
          post={{
            content,
            status,
            channel: selectedChannelData ? {
              title: selectedChannelData.channelName,
              username: selectedChannelData.channelUsername || ""
            } : undefined,
            product: selectedProductData ? {
              name: selectedProductData.name,
              images: selectedProductData.imageIds && selectedProductData.images
                ? selectedProductData.imageIds.map((id, index) => ({
                    id,
                    key: selectedProductData.images[index],
                    url: selectedProductData.images[index]
                  }))
                : undefined
            } : undefined
          }}
        />
      </div>
    </div>
  )
}
