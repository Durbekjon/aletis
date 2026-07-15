"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft,
  Bot,
  RefreshCw,
  Calendar,
  Globe,
  ShoppingBag,
  Lightbulb,
  MessageCircle,
  Send,
  Loader2,
  Star,
  TrendingUp,
  Tag,
  User,
  Gift,
  Copy,
  UserPlus,
} from "lucide-react"
import { toast } from "sonner"
import {
  useCustomerQuery,
  useAnalyzeCustomerMutation,
  useSendCustomerMessageMutation,
} from "@/src/hooks/useCustomersQuery"
import { useCustomerLoyalty } from "@/src/hooks/useLoyaltyQuery"
import { useTranslation } from "@/src/context/I18nContext"
import { ROUTES } from "@/lib/constants"
import { cn } from "@/lib/utils"

const AI_TAG_COLORS: Record<string, string> = {
  VIP: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "High Intent": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Frequent Buyer": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "Price Sensitive": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "New Customer": "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  "At Risk": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "Loyal Customer": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
}

const SENSITIVITY_STYLES: Record<string, string> = {
  LOW: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-red-100 text-red-700",
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

export default function CustomerProfilePage() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const params = useParams()
  const customerId = Number(params.id)
  const locale = i18n.language === "ru" ? "ru-RU" : i18n.language === "en" ? "en-US" : "uz-UZ"

  const { data: customer, isLoading } = useCustomerQuery(customerId)
  const { data: loyalty } = useCustomerLoyalty(customerId)
  const analyzeMutation = useAnalyzeCustomerMutation(customerId)
  const sendMessageMutation = useSendCustomerMessageMutation(customerId)
  const [draft, setDraft] = useState("")

  const handleSend = () => {
    const content = draft.trim()
    if (!content || sendMessageMutation.isPending) return
    sendMessageMutation.mutate(content, {
      onSuccess: () => {
        setDraft("")
        toast.success(t("customers.messageSent"))
      },
    })
  }

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })

  const formatDayLabel = (dateStr: string) => {
    const d = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (isSameDay(d, today)) return i18n.language === "ru" ? "Сегодня" : i18n.language === "en" ? "Today" : "Bugun"
    if (isSameDay(d, yesterday)) return i18n.language === "ru" ? "Вчера" : i18n.language === "en" ? "Yesterday" : "Kecha"
    return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })
  }

  const formatShortDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col gap-6">
        <Skeleton className="h-8 w-48 shrink-0" />
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-full w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">{t("common.notFound")}</p>
        <Button variant="outline" onClick={() => router.push(ROUTES.CUSTOMERS)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("common.back")}
        </Button>
      </div>
    )
  }

  const aiNote = customer.aiNote

  // Group messages by date for day separators
  const messages = customer.messages ?? []
  const groupedMessages: { label: string; msgs: typeof messages }[] = []
  let lastDay = ""
  for (const msg of messages) {
    const day = new Date(msg.createdAt).toDateString()
    if (day !== lastDay) {
      groupedMessages.push({ label: formatDayLabel(msg.createdAt), msgs: [] })
      lastDay = day
    }
    groupedMessages[groupedMessages.length - 1].msgs.push(msg)
  }

  return (
    <div className="flex flex-col gap-6" style={{ height: "calc(100vh - 120px)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.CUSTOMERS)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t("common.back")}
        </Button>
        <h1 className="text-xl font-bold">{customer.name}</h1>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Left column: scrollable */}
        <div className="overflow-y-auto space-y-4 pr-1">
          {/* Customer info card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                {t("customers.profile")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Telegram</span>
                <span className="font-medium">
                  {customer.username ? `@${customer.username}` : customer.telegramId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <ShoppingBag className="h-3 w-3" />
                  {t("customers.totalOrders")}
                </span>
                <span className="font-medium">{customer._count?.orders ?? customer.orders?.length ?? 0}</span>
              </div>
              {customer.lang && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {t("common.language")}
                  </span>
                  <span className="font-medium uppercase">{customer.lang}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Joined
                </span>
                <span className="font-medium">{formatShortDate(customer.createdAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Loyalty & referral card */}
          {loyalty && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Gift className="h-4 w-4 text-emerald-500" />
                  {t("loyalty.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {t("loyalty.balance")}
                  </span>
                  <span className="font-bold text-emerald-500">{loyalty.balance}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <UserPlus className="h-3 w-3" />
                    {t("loyalty.referralsMade")}
                  </span>
                  <span className="font-medium">{loyalty.referralCount}</span>
                </div>
                {loyalty.referral && (
                  <div className="space-y-1.5">
                    <span className="text-muted-foreground text-xs">{t("loyalty.referralLink")}</span>
                    <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2">
                      <span className="flex-1 truncate text-xs">{loyalty.referral.link}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(loyalty.referral!.link)
                          toast.success(t("loyalty.linkCopied"))
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
                {loyalty.transactions?.length ? (
                  <div className="space-y-1 pt-1">
                    <span className="text-muted-foreground text-xs">{t("loyalty.recentActivity")}</span>
                    {loyalty.transactions.slice(0, 5).map((tx, i) => (
                      <div key={tx.id ?? i} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {t(`loyalty.reasons.${tx.reason}`, { defaultValue: tx.reason })}
                        </span>
                        <span className={cn("font-medium", tx.points >= 0 ? "text-emerald-500" : "text-orange-500")}>
                          {tx.points >= 0 ? "+" : ""}{tx.points}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* AI Insights panel */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  {t("customers.aiInsights")}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={analyzeMutation.isPending}
                  onClick={() => analyzeMutation.mutate()}
                >
                  <RefreshCw className={cn("h-3 w-3 mr-1", analyzeMutation.isPending && "animate-spin")} />
                  {t("customers.analyzeNow")}
                </Button>
              </div>
              {aiNote?.lastAnalyzedAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t("customers.lastAnalyzed")}: {formatShortDate(aiNote.lastAnalyzedAt)}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {!aiNote ? (
                <p className="text-muted-foreground text-center py-4">{t("customers.noInsights")}</p>
              ) : (
                <>
                  {aiNote.aiTags?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {t("customers.aiTags")}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {aiNote.aiTags.map((tag) => (
                          <span
                            key={tag}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${AI_TAG_COLORS[tag] ?? "bg-gray-100 text-gray-700"}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiNote.aiSummary && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">{t("customers.aiSummary")}</p>
                      <p className="text-xs leading-relaxed">{aiNote.aiSummary}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{t("customers.priceSensitivity")}</p>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${SENSITIVITY_STYLES[aiNote.priceSensitivity] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {aiNote.priceSensitivity}
                    </span>
                  </div>

                  {aiNote.productInterests?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {t("customers.productInterests")}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {aiNote.productInterests.map((interest, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 rounded-full text-xs"
                          >
                            {typeof interest === "string" ? interest : interest.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiNote.favoriteCategories?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">{t("customers.favoriteCategories")}</p>
                      <div className="flex flex-wrap gap-1">
                        {aiNote.favoriteCategories.map((cat, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiNote.buyingBehavior?.notes && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {t("customers.buyingBehavior")}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{aiNote.buyingBehavior.notes}</p>
                    </div>
                  )}

                  {aiNote.salesOpportunities?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">{t("customers.salesOpportunities")}</p>
                      <ul className="space-y-1.5">
                        {aiNote.salesOpportunities.map((opp, i) => (
                          <li key={i} className="text-xs bg-green-50 dark:bg-green-900/20 rounded-lg p-2.5">
                            <span className="font-semibold text-green-800 dark:text-green-300">{opp.type}: </span>
                            <span className="text-green-700 dark:text-green-400">{opp.description}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: conversation history — fills remaining height, scrolls internally */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <CardHeader className="pb-3 border-b shrink-0">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                {t("customers.conversationHistory")}
                <span className="text-muted-foreground font-normal text-xs">({messages.length})</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 min-h-0">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <MessageCircle className="h-10 w-10 opacity-20" />
                  <p className="text-sm">No messages yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {groupedMessages.map((group) => (
                    <div key={group.label}>
                      {/* Day separator */}
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground px-2 shrink-0">{group.label}</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>

                      <div className="space-y-2">
                        {group.msgs.map((msg) => (
                          <div
                            key={msg.id}
                            className={cn(
                              "flex items-end gap-2",
                              msg.sender === "USER" ? "flex-row-reverse" : "flex-row",
                            )}
                          >
                            {/* Avatar */}
                            <div
                              className={cn(
                                "shrink-0 w-7 h-7 rounded-full flex items-center justify-center mb-0.5",
                                msg.sender === "USER"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted-foreground/10 text-muted-foreground",
                              )}
                            >
                              {msg.sender === "USER"
                                ? <User className="h-3.5 w-3.5" />
                                : <Bot className="h-3.5 w-3.5" />
                              }
                            </div>

                            {/* Bubble */}
                            <div
                              className={cn(
                                "max-w-[72%] rounded-2xl px-3.5 py-2 text-sm wrap-break-word",
                                msg.sender === "USER"
                                  ? "bg-primary text-primary-foreground rounded-br-sm"
                                  : "bg-muted text-foreground rounded-bl-sm",
                              )}
                            >
                              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                              <p
                                className={cn(
                                  "text-[10px] mt-1 text-right leading-none",
                                  msg.sender === "USER"
                                    ? "text-primary-foreground/60"
                                    : "text-muted-foreground/70",
                                )}
                              >
                                {formatTime(msg.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>

            {/* Reply input — sends via the customer's own channel (Telegram bot / Instagram) */}
            <div className="shrink-0 border-t p-3 flex items-end gap-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder={t("customers.messagePlaceholder")}
                rows={1}
                className="min-h-9 max-h-32 resize-none"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!draft.trim() || sendMessageMutation.isPending}
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
