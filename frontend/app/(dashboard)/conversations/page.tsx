"use client"

import { useState } from "react"
import { useTranslation } from "@/src/context/I18nContext"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, MessageSquare, Clock, CheckCircle, Archive, MoreVertical, User, Bot } from "lucide-react"
import Link from "next/link"
import type { Conversation } from "@/lib/types/conversation"

// Mock data
const mockConversations: Conversation[] = [
  {
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
    lastMessage: {
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "cust-1",
      senderType: "customer",
      senderName: "John Doe",
      content: "Do you have this product in blue color?",
      messageType: "text",
      isRead: false,
      createdAt: new Date(Date.now() - 5 * 60 * 1000),
    },
    unreadCount: 2,
    totalMessages: 15,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 5 * 60 * 1000),
  },
  {
    id: "conv-2",
    customerId: "cust-2",
    customer: {
      id: "cust-2",
      telegramId: "987654321",
      username: "jane_smith",
      firstName: "Jane",
      lastName: "Smith",
    },
    status: "waiting",
    priority: "medium",
    tags: ["order-issue"],
    lastMessage: {
      id: "msg-2",
      conversationId: "conv-2",
      senderId: "bot-1",
      senderType: "bot",
      senderName: "Sotuvchi Bot",
      content: "Your order #12345 has been processed. Is there anything else I can help you with?",
      messageType: "text",
      isRead: true,
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
    },
    unreadCount: 0,
    totalMessages: 8,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000),
  },
  {
    id: "conv-3",
    customerId: "cust-3",
    customer: {
      id: "cust-3",
      telegramId: "456789123",
      firstName: "Ahmad",
      lastName: "Karimov",
    },
    status: "resolved",
    priority: "low",
    tags: ["shipping-inquiry"],
    lastMessage: {
      id: "msg-3",
      conversationId: "conv-3",
      senderId: "op-1",
      senderType: "operator",
      senderName: "Sarah Wilson",
      content: "Thank you for your patience. Your order will be delivered tomorrow.",
      messageType: "text",
      isRead: true,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    unreadCount: 0,
    totalMessages: 12,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    resolvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
]

const statusConfig = {
  active: { label: "Active", color: "bg-primary", icon: MessageSquare },
  waiting: { label: "Waiting", color: "bg-yellow-500", icon: Clock },
  resolved: { label: "Resolved", color: "bg-blue-500", icon: CheckCircle },
  archived: { label: "Archived", color: "bg-gray-500", icon: Archive },
}

const priorityConfig = {
  low: { label: "Low", color: "bg-gray-500" },
  medium: { label: "Medium", color: "bg-blue-500" },
  high: { label: "High", color: "bg-orange-500" },
  urgent: { label: "Urgent", color: "bg-red-500" },
}

export default function ConversationsPage() {
  const { t } = useTranslation()
  const [conversations, setConversations] = useState(mockConversations)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")

  const filteredConversations = conversations.filter((conversation) => {
    const matchesSearch =
      conversation.customer.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.customer.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.customer.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || conversation.status === statusFilter
    const matchesPriority = priorityFilter === "all" || conversation.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
  })

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) return t("conversations.time.minutesAgo", { count: minutes })
    if (hours < 24) return t("conversations.time.hoursAgo", { count: hours })
    return t("conversations.time.daysAgo", { count: days })
  }

  const getSenderIcon = (senderType: string) => {
    switch (senderType) {
      case "bot":
        return <Bot className="h-3 w-3" />
      case "operator":
        return <User className="h-3 w-3" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('conversations.title')}</h1>
          <p className="text-muted-foreground">{t('conversations.subtitle')}</p>
        </div>
        <LanguageSwitcher />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('conversations.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t('conversations.statusPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('conversations.filters.allStatus')}</SelectItem>
                  <SelectItem value="active">{t('conversations.status.active')}</SelectItem>
                  <SelectItem value="waiting">{t('conversations.status.waiting')}</SelectItem>
                  <SelectItem value="resolved">{t('conversations.status.resolved')}</SelectItem>
                  <SelectItem value="archived">{t('conversations.status.archived')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t('conversations.priorityPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('conversations.filters.allPriority')}</SelectItem>
                  <SelectItem value="urgent">{t('conversations.priority.urgent')}</SelectItem>
                  <SelectItem value="high">{t('conversations.priority.high')}</SelectItem>
                  <SelectItem value="medium">{t('conversations.priority.medium')}</SelectItem>
                  <SelectItem value="low">{t('conversations.priority.low')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversations List */}
      <div className="space-y-4">
        {filteredConversations.map((conversation) => {
          const statusInfo = statusConfig[conversation.status]
          const priorityInfo = priorityConfig[conversation.priority]
          const StatusIcon = statusInfo.icon

          return (
            <Card key={conversation.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conversation.customer.avatar || "/placeholder.svg"} />
                    <AvatarFallback>
                      {conversation.customer.firstName?.[0]}
                      {conversation.customer.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {conversation.customer.firstName} {conversation.customer.lastName}
                        </h3>
                        {conversation.customer.username && (
                          <span className="text-sm text-muted-foreground">@{conversation.customer.username}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`${priorityInfo.color} text-white`}>
                          {t(`conversations.priority.${conversation.priority}`)}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {t(`conversations.status.${conversation.status}`)}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>{t('conversations.actions.markResolved')}</DropdownMenuItem>
                            <DropdownMenuItem>{t('conversations.actions.assignOperator')}</DropdownMenuItem>
                            <DropdownMenuItem>{t('conversations.actions.archive')}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      {conversation.lastMessage && (
                        <>
                          {getSenderIcon(conversation.lastMessage.senderType)}
                          <span className="text-sm text-muted-foreground">{conversation.lastMessage.senderName}:</span>
                        </>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {conversation.lastMessage?.content}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{formatTime(conversation.updatedAt)}</span>
                        <span>{t('conversations.messagesCount', { count: conversation.totalMessages })}</span>
                        {conversation.assignedOperator && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{conversation.assignedOperator.name}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {conversation.unreadCount > 0 && (
                          <Badge
                            variant="destructive"
                            className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                          >
                            {conversation.unreadCount}
                          </Badge>
                        )}
                        <Button asChild size="sm">
                          <Link href={`/dashboard/conversations/${conversation.id}`}>{t('conversations.openChat')}</Link>
                        </Button>
                      </div>
                    </div>

                    {conversation.tags.length > 0 && (
                      <div className="flex gap-1 mt-3">
                        {conversation.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredConversations.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('conversations.empty.title')}</h3>
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
                ? t('conversations.empty.filtersHint')
                : t('conversations.empty.defaultHint')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
