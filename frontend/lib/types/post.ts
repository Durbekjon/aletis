// Backend Types
export interface BackendPost {
  id: number
  content: string
  status: "DRAFT" | "SCHEDULED" | "SENT" | "FAILED"
  channelId: number
  productId?: number
  scheduledAt?: string
  sentAt?: string
  telegramMessageId?: string
  telegramChatId?: string
  createdAt: string
  updatedAt: string
  // Relations
  channel?: {
    id: number
    title: string
    username: string
    telegramId: string
  }
  product?: {
    id: number
    name: string
    price: number
    currency: string
    images: Array<{ id: number; key: string }>
  }
}

export interface BackendChannel {
  id: number
  telegramId: string
  username: string
  title: string
  description?: string
  status: "PENDING" | "NOT_FOUND" | "NOT_ADMIN" | "NO_REQUIRED_PERMISSIONS" | "DONE" | "FAIL"
  createdAt: string
  updatedAt: string
}

// Frontend Types
export type PostStatus = "DRAFT" | "SCHEDULED" | "SENT" | "FAILED"
export type PostChannel = "telegram" | "instagram" | "twitter"

export interface Post {
  id: string
  content: string
  status: PostStatus
  channelId: number
  productId?: number
  scheduledAt?: Date
  sentAt?: Date
  telegramMessageId?: string
  telegramChatId?: string
  createdAt: Date
  updatedAt: Date
  // Relations
  channel?: {
    id: number
    title: string
    username: string
    telegramId: string
  }
  product?: {
    id: number
    name: string
    price: number
    currency: string
    images?: Array<{ id: number; key: string }>
  }
}

export interface Channel {
  id: number
  telegramId: string
  username: string
  title: string
  description?: string
  status: "PENDING" | "NOT_FOUND" | "NOT_ADMIN" | "NO_REQUIRED_PERMISSIONS" | "DONE" | "FAIL"
  createdAt: Date
  updatedAt: Date
}

// API Request/Response Types
export interface CreatePostRequest {
  content: string
  status: PostStatus
  channelId: number
  productId?: number
  scheduledAt?: string
}

export interface UpdatePostRequest {
  content?: string
  status?: PostStatus
  channelId?: number
  productId?: number
  scheduledAt?: string
}

export interface PostsQuery {
  channelId?: number
  page?: number
  limit?: number
  search?: string
  status?: PostStatus
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

// Mapping functions
export function mapBackendPostToFrontend(backendPost: BackendPost): Post {
  return {
    id: backendPost.id.toString(),
    content: backendPost.content,
    status: backendPost.status,
    channelId: backendPost.channelId,
    productId: backendPost.productId,
    scheduledAt: backendPost.scheduledAt ? new Date(backendPost.scheduledAt) : undefined,
    sentAt: backendPost.sentAt ? new Date(backendPost.sentAt) : undefined,
    telegramMessageId: backendPost.telegramMessageId,
    telegramChatId: backendPost.telegramChatId,
    createdAt: new Date(backendPost.createdAt),
    updatedAt: new Date(backendPost.updatedAt),
    channel: backendPost.channel ? {
      id: backendPost.channel.id,
      title: backendPost.channel.title,
      username: backendPost.channel.username,
      telegramId: backendPost.channel.telegramId
    } : undefined,
    product: backendPost.product ? {
      id: backendPost.product.id,
      name: backendPost.product.name,
      price: backendPost.product.price,
      currency: backendPost.product.currency,
      images: backendPost.product.images
    } : undefined
  }
}

export function mapBackendChannelToFrontend(backendChannel: BackendChannel): Channel {
  return {
    id: backendChannel.id,
    telegramId: backendChannel.telegramId,
    username: backendChannel.username,
    title: backendChannel.title,
    description: backendChannel.description,
    status: backendChannel.status,
    createdAt: new Date(backendChannel.createdAt),
    updatedAt: new Date(backendChannel.updatedAt)
  }
}
