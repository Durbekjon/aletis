"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useTranslation } from "@/src/context/I18nContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Send, Paperclip, MoreVertical, User, Bot, Clock, MessageSquare, ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { Message, Conversation } from "@/lib/types/conversation"

// Mock data
const mockConversation: Conversation = {
  id: "conv-1",
  customerId: "cust-1",
  customer: {
    id: "cust-1",
    telegramId: "123456789",
    username: "john_doe",
    firstName: "John",
    lastName: "Doe",
    avatar: "/diverse-user-avatars.png",
  },
  assignedOperatorId: "op-1",
  assignedOperator: {
    id: "op-1",
    name: "Sarah Wilson",
    avatar: "/diverse-user-avatars.png",
  },
  status: "active",
  priority: "high",
  tags: ["product-inquiry", "urgent"],
  unreadCount: 0,
  totalMessages: 15,
  createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  updatedAt: new Date(Date.now() - 5 * 60 * 1000),
}

const mockMessages: Message[] = [
  {
    id: "msg-1",
    conversationId: "conv-1",
    senderId: "cust-1",
    senderType: "customer",
    senderName: "John Doe",
    content: "Hello! I'm interested in your iPhone 15 Pro. Do you have it in blue?",
    messageType: "text",
    isRead: true,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: "msg-2",
    conversationId: "conv-1",
    senderId: "bot-1",
    senderType: "bot",
    senderName: "Sotuvchi Bot",
    content:
      "Hello! Yes, we have the iPhone 15 Pro in Natural Blue Titanium. The price is $999. Would you like to see more details?",
    messageType: "text",
    isRead: true,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 30000),
  },
  {
    id: "msg-3",
    conversationId: "conv-1",
    senderId: "cust-1",
    senderType: "customer",
    senderName: "John Doe",
    content: "Yes, please! Can you also tell me about warranty and delivery options?",
    messageType: "text",
    isRead: true,
    createdAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
  },
  {
    id: "msg-4",
    conversationId: "conv-1",
    senderId: "op-1",
    senderType: "operator",
    senderName: "Sarah Wilson",
    content:
      "Hi John! I'm Sarah from customer support. The iPhone 15 Pro comes with 1-year Apple warranty. We offer free delivery within Tashkent (1-2 days) and paid delivery to other regions (3-5 days). Would you like to place an order?",
    messageType: "text",
    isRead: true,
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
  {
    id: "msg-5",
    conversationId: "conv-1",
    senderId: "cust-1",
    senderType: "customer",
    senderName: "John Doe",
    content: "That sounds great! How can I pay for it?",
    messageType: "text",
    isRead: true,
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
  },
]

export default function ConversationDetailPage({ params }: { params: { id: string } }) {
  const { t } = useTranslation()
  const [messages, setMessages] = useState(mockMessages)
  const [newMessage, setNewMessage] = useState("")
  const [conversation, setConversation] = useState(mockConversation)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = () => {
    if (!newMessage.trim()) return

    const message: Message = {
      id: `msg-${Date.now()}`,
      conversationId: conversation.id,
      senderId: "current-operator",
      senderType: "operator",
      senderName: "You",
      content: newMessage,
      messageType: "text",
      isRead: true,
      createdAt: new Date(),
    }

    setMessages([...messages, message])
    setNewMessage("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (date: Date) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return t("conversations.detail.today")
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t("conversations.detail.yesterday")
    } else {
      return date.toLocaleDateString()
    }
  }

  const getSenderIcon = (senderType: string) => {
    switch (senderType) {
      case "bot":
        return <Bot className="h-4 w-4" />
      case "operator":
        return <User className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const getSenderColor = (senderType: string) => {
    switch (senderType) {
      case "customer":
        return "bg-primary text-primary-foreground"
      case "bot":
        return "bg-blue-500 text-white"
      case "operator":
        return "bg-primary text-white"
      default:
        return "bg-muted"
    }
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/conversations">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Avatar className="h-10 w-10">
              <AvatarImage src={conversation.customer.avatar || "/placeholder.svg"} />
              <AvatarFallback>
                {conversation.customer.firstName?.[0]}
                {conversation.customer.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold">
                {conversation.customer.firstName} {conversation.customer.lastName}
              </h2>
              <p className="text-sm text-muted-foreground">
                @{conversation.customer.username} • {t('conversations.detail.telegramId', { id: conversation.customer.telegramId })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-orange-500 text-white">
              {t('conversations.priority.high')}
            </Badge>
            <Badge variant="outline" className="bg-primary text-white flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {t('conversations.status.active')}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>{t('conversations.actions.markResolved')}</DropdownMenuItem>
                <DropdownMenuItem>{t('conversations.actions.changePriority')}</DropdownMenuItem>
                <DropdownMenuItem>{t('conversations.actions.assignOperator')}</DropdownMenuItem>
                <DropdownMenuItem>{t('conversations.actions.archiveConversation')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => {
              const showDate =
                index === 0 || formatDate(message.createdAt) !== formatDate(messages[index - 1].createdAt)

              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="text-center text-sm text-muted-foreground py-2">
                      {formatDate(message.createdAt)}
                    </div>
                  )}
                  <div className={`flex gap-3 ${message.senderType === "customer" ? "justify-end" : "justify-start"}`}>
                    {message.senderType !== "customer" && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={getSenderColor(message.senderType)}>
                          {getSenderIcon(message.senderType)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`max-w-[70%] ${message.senderType === "customer" ? "order-first" : ""}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{message.senderName}</span>
                        <span className="text-xs text-muted-foreground">{formatTime(message.createdAt)}</span>
                      </div>
                      <div
                        className={`rounded-lg p-3 ${
                          message.senderType === "customer" ? "bg-primary text-primary-foreground ml-auto" : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                    {message.senderType === "customer" && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={conversation.customer.avatar || "/placeholder.svg"} />
                        <AvatarFallback>
                          {conversation.customer.firstName?.[0]}
                          {conversation.customer.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Paperclip className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <Textarea
                  placeholder={t('conversations.detail.typeMessage')}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="min-h-[40px] max-h-[120px] resize-none"
                />
              </div>
              <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Customer Info Sidebar */}
        <div className="w-80 border-l bg-muted/30 p-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('conversations.detail.customerInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={conversation.customer.avatar || "/placeholder.svg"} />
                  <AvatarFallback>
                    {conversation.customer.firstName?.[0]}
                    {conversation.customer.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">
                    {conversation.customer.firstName} {conversation.customer.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">@{conversation.customer.username}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span>{t('conversations.detail.telegramId', { id: conversation.customer.telegramId })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{t('conversations.detail.joined', { date: formatDate(conversation.createdAt) })}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('conversations.detail.conversationDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('conversations.detail.statusLabel')}</label>
                <Select value={conversation.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('conversations.status.active')}</SelectItem>
                    <SelectItem value="waiting">{t('conversations.status.waiting')}</SelectItem>
                    <SelectItem value="resolved">{t('conversations.status.resolved')}</SelectItem>
                    <SelectItem value="archived">{t('conversations.status.archived')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('conversations.detail.priorityLabel')}</label>
                <Select value={conversation.priority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('conversations.priority.low')}</SelectItem>
                    <SelectItem value="medium">{t('conversations.priority.medium')}</SelectItem>
                    <SelectItem value="high">{t('conversations.priority.high')}</SelectItem>
                    <SelectItem value="urgent">{t('conversations.priority.urgent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('conversations.detail.assignedOperator')}</label>
                <Select value={conversation.assignedOperatorId || ""}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('conversations.detail.selectOperator')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="op-1">Sarah Wilson</SelectItem>
                    <SelectItem value="op-2">Mike Johnson</SelectItem>
                    <SelectItem value="op-3">Anna Smith</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('conversations.detail.tags')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {conversation.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
