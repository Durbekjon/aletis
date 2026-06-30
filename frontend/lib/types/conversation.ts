export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderType: "customer" | "bot" | "operator"
  senderName: string
  content: string
  messageType: "text" | "image" | "file" | "product" | "order"
  metadata?: {
    productId?: string
    orderId?: string
    fileUrl?: string
    fileName?: string
  }
  isRead: boolean
  createdAt: Date
}

export interface Conversation {
  id: string
  customerId: string
  customer: {
    id: string
    telegramId: string
    username?: string
    firstName?: string
    lastName?: string
    avatar?: string
  }
  botId?: string
  assignedOperatorId?: string
  assignedOperator?: {
    id: string
    name: string
    avatar?: string
  }
  status: "active" | "waiting" | "resolved" | "archived"
  priority: "low" | "medium" | "high" | "urgent"
  tags: string[]
  lastMessage?: Message
  unreadCount: number
  totalMessages: number
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
}

export type ConversationStatus = Conversation["status"]
export type MessageType = Message["messageType"]
export type SenderType = Message["senderType"]
