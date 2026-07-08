"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Bot,
  Plus,
  Settings,
  Hash,
  Search,
  AlertCircle,
} from "lucide-react"
import { RefreshButton } from "@/components/ui/refresh-button"
import type { TelegramBot, TelegramChannel } from "@/lib/types/bot"
import { useBotsQuery, useCreateBotMutation, useDeleteBotMutation, useStartBotMutation, useStopBotMutation } from "@/src/hooks/useBotsQuery"
import { useChannelsQuery, useCreateChannelMutation, useDeleteChannelMutation } from "@/src/hooks/useChannelsQuery"
import { BotCard, BotCardSkeleton } from "@/src/components/BotCard"
import { ChannelCard, ChannelCardSkeleton } from "@/src/components/ChannelCard"
import { toast } from "sonner"
import { DataPagination } from "@/components/ui/data-pagination"
import { useTranslation } from "@/src/context/I18nContext"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function BotsPage() {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState<"bots" | "channels">(
    tabParam === "channels" ? "channels" : "bots"
  )

  useEffect(() => {
    if (tabParam === "channels" || tabParam === "bots") {
      setActiveTab(tabParam)
    }
  }, [tabParam])
  
  // Separate search states for each tab
  const [botsSearchQuery, setBotsSearchQuery] = useState("")
  const [channelsSearchQuery, setChannelsSearchQuery] = useState("")

  // Pagination state per tab
  const [botsPage, setBotsPage] = useState<number>(1)
  const [channelsPage, setChannelsPage] = useState<number>(1)

  // Bot-related state
  const [selectedBot, setSelectedBot] = useState<TelegramBot | null>(null)
  const [isCreateBotDialogOpen, setIsCreateBotDialogOpen] = useState(false)
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false)
  const [newBotToken, setNewBotToken] = useState("")

  // Channel-related state
  const [isCreateChannelDialogOpen, setIsCreateChannelDialogOpen] = useState(false)
  const [newChannelUsername, setNewChannelUsername] = useState("")
  const [selectedBotForChannel, setSelectedBotForChannel] = useState<TelegramBot | null>(null)

  // Queries with tab-specific search
  const botsQuery = useBotsQuery({ search: botsSearchQuery || undefined, page: botsPage })
  const channelsQuery = useChannelsQuery({ search: channelsSearchQuery || undefined, page: channelsPage })

  // Mutations
  const createBotMutation = useCreateBotMutation()
  const deleteBotMutation = useDeleteBotMutation()
  const startBotMutation = useStartBotMutation()
  const stopBotMutation = useStopBotMutation()
  const createChannelMutation = useCreateChannelMutation()
  const deleteChannelMutation = useDeleteChannelMutation()

  // Separate items for each tab to ensure correct typing
  const bots = botsQuery.data?.items || []
  const channels = channelsQuery.data?.items || []

  // Dynamic header configuration
  const headerConfig = {
    bots: {
      title: t("bots.title"),
      subtitle: t("bots.subtitle"),
      primaryButtonText: t("bots.addBot"),
      primaryButtonIcon: Plus,
    },
    channels: {
      title: t("bots.channelManagement"),
      subtitle: t("bots.channelSubtitle"),
      primaryButtonText: t("bots.connectChannel"),
      primaryButtonIcon: Plus,
    }
  }

  const currentConfig = headerConfig[activeTab]

  // Handler functions
  const handleRefresh = () => {
    if (activeTab === "bots") {
      botsQuery.refetch()
    } else {
      channelsQuery.refetch()
    }
  }

  const handleBotsPageChange = (nextPage: number) => {
    setBotsPage(nextPage)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleChannelsPageChange = (nextPage: number) => {
    setChannelsPage(nextPage)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePrimaryAction = () => {
    if (activeTab === "bots") {
      setIsCreateBotDialogOpen(true)
    } else {
      setIsCreateChannelDialogOpen(true)
    }
  }

  const handleCreateBot = async () => {
    if (!newBotToken.trim()) {
      toast.error(t("bots.pleaseEnterBotToken"))
      return
    }

    try {
      await createBotMutation.mutateAsync({ token: newBotToken.trim() })
      setNewBotToken("")
      setIsCreateBotDialogOpen(false)
    } catch (error) {
      // Error is already handled in the mutation
    }
  }

  const handleToggleBotStatus = async (bot: TelegramBot) => {
    try {
      if (bot.status === "ACTIVE") {
        await stopBotMutation.mutateAsync(parseInt(bot.id))
      } else {
        await startBotMutation.mutateAsync(parseInt(bot.id))
      }
    } catch (error) {
      // Error is already handled in the mutation
    }
  }

  const handleDeleteBot = async (bot: TelegramBot) => {
    if (window.confirm(t("bots.areYouSureDeleteBot", { name: bot.name }))) {
      try {
        await deleteBotMutation.mutateAsync(parseInt(bot.id))
      } catch (error) {
        // Error is already handled in the mutation
      }
    }
  }

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token)
    toast.success(t("bots.tokenCopied"))
  }

  const handleCreateChannel = async () => {
    if (!newChannelUsername.trim()) {
      toast.error(t("bots.pleaseEnterChannelUsername"))
      return
    }

    if (!selectedBotForChannel) {
      toast.error(t("bots.pleaseSelectBot"))
      return
    }

    try {
      await createChannelMutation.mutateAsync({
        botId: parseInt(selectedBotForChannel.id),
        username: newChannelUsername.trim()
      })
      setNewChannelUsername("")
      setSelectedBotForChannel(null)
      setIsCreateChannelDialogOpen(false)
    } catch (error) {
      // Error is already handled in the mutation
    }
  }

  const handleDeleteChannel = async (channel: TelegramChannel) => {
    if (window.confirm(t("bots.areYouSureDeleteChannel", { name: channel.channelName }))) {
      try {
        await deleteChannelMutation.mutateAsync(parseInt(channel.id))
      } catch (error) {
        // Error is already handled in the mutation
      }
    }
  }

  const handleConfigureChannel = (channel: TelegramChannel) => {
    // TODO: Implement channel configuration
    toast.info(t("bots.channelConfigurationComingSoon"))
  }

  const handleTestChannelConnection = (channel: TelegramChannel) => {
    // TODO: Implement connection test
    toast.info(t("bots.connectionTestComingSoon"))
  }

  return (
    <div className="space-y-6">
      {/* Dynamic Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{currentConfig.title}</h1>
          <p className="text-muted-foreground">{currentConfig.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <RefreshButton
            variant="outline"
            onClick={handleRefresh}
            isLoading={botsQuery.isLoading || channelsQuery.isLoading}
            disabled={botsQuery.isLoading || channelsQuery.isLoading}
          >
            {t("common.refresh")}
          </RefreshButton>
          <Button onClick={handlePrimaryAction}>
            <currentConfig.primaryButtonIcon className="h-4 w-4 mr-2" />
            {currentConfig.primaryButtonText}
                </Button>
              </div>
            </div>

      {/* Error Alert */}
      {(botsQuery.error || channelsQuery.error) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {activeTab === "bots" 
              ? (botsQuery.error?.message || t("bots.failedToLoadBots"))
              : (channelsQuery.error?.message || t("bots.failedToLoadChannels"))
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("bots.searchPlaceholder", { type: t(`bots.tabs.${activeTab}`).toLowerCase() })}
            value={activeTab === "bots" ? botsSearchQuery : channelsSearchQuery}
            onChange={(e) => {
              if (activeTab === "bots") {
                setBotsSearchQuery(e.target.value)
              } else {
                setChannelsSearchQuery(e.target.value)
              }
            }}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs 
        value={activeTab} 
        onValueChange={(value) => {
          setActiveTab(value as "bots" | "channels")
          // Clear search when switching tabs to avoid confusion
          setBotsSearchQuery("")
          setChannelsSearchQuery("")
        }} 
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="bots">{t("bots.tabs.bots")}</TabsTrigger>
          <TabsTrigger value="channels">{t("bots.tabs.channels")}</TabsTrigger>
        </TabsList>

        <TabsContent value="bots" className="space-y-4">
          {botsQuery.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <BotCardSkeleton key={i} />
              ))}
                        </div>
          ) : bots.length === 0 ? (
            <Card className="lp-glass-card">
              <CardContent className="p-12 text-center">
                <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">{t("bots.noBotsFound")}</h3>
                <p className="text-muted-foreground mb-4">
                  {botsSearchQuery ? t("bots.noBotsMatch") : t("bots.getStarted")}
                </p>
                {!botsSearchQuery && (
                  <Button onClick={() => setIsCreateBotDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("bots.addYourFirstBot")}
                          </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            bots.map((bot) => (
              <BotCard
                key={bot.id}
                bot={bot as TelegramBot}
                onToggleStatus={handleToggleBotStatus}
                onDelete={handleDeleteBot}
                onCopyToken={handleCopyToken}
                onOpenSettings={(bot) => {
                              setSelectedBot(bot)
                              setIsSettingsDialogOpen(true)
                            }}
              />
            ))
          )}
          {/* Bots Pagination: render only if next page exists */}
          {botsQuery.data?.hasNext === true && (
            <div className="mt-6">
              <DataPagination
                currentPage={botsQuery.data.page}
                totalPages={botsQuery.data.totalPages}
                hasNextPage={botsQuery.data.hasNext}
                hasPreviousPage={botsQuery.data.hasPrevious}
                onPageChange={handleBotsPageChange}
              />
                    </div>
          )}
        </TabsContent>

        <TabsContent value="channels" className="space-y-4">
          {channelsQuery.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <ChannelCardSkeleton key={i} />
              ))}
            </div>
          ) : channels.length === 0 ? (
            <Card className="lp-glass-card">
              <CardContent className="p-12 text-center">
                <Hash className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">{t("bots.noChannelsConnected")}</h3>
                <p className="text-muted-foreground mb-4">
                  {channelsSearchQuery ? t("bots.noChannelsMatch") : t("bots.connectFirstChannel")}
                </p>
                {!channelsSearchQuery && (
                  <Button onClick={() => setIsCreateChannelDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
                    {t("bots.connectYourFirstChannel")}
                        </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            channels.map((channel) => (
              <ChannelCard
                key={channel.id}
                channel={channel as TelegramChannel}
                onDelete={handleDeleteChannel}
                onConfigure={handleConfigureChannel}
                onTestConnection={handleTestChannelConnection}
              />
            ))
          )}
          {/* Channels Pagination: render only if next page exists */}
          {channelsQuery.data?.hasNext === true && (
            <div className="mt-6">
              <DataPagination
                currentPage={channelsQuery.data.page}
                totalPages={channelsQuery.data.totalPages}
                hasNextPage={channelsQuery.data.hasNext}
                hasPreviousPage={channelsQuery.data.hasPrevious}
                onPageChange={handleChannelsPageChange}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Bot Dialog */}
      <Dialog open={isCreateBotDialogOpen} onOpenChange={setIsCreateBotDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("bots.addNewBot")}</DialogTitle>
            <DialogDescription>
              {t("bots.connectDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bot-token">{t("bots.botToken")}</Label>
              <Input 
                id="bot-token" 
                placeholder="1234567890:AAEhBOweik9ai2u982u98u2wuAisuzia" 
                type="password"
                value={newBotToken}
                onChange={(e) => setNewBotToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t("bots.getBotToken")}</p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateBotDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleCreateBot} disabled={createBotMutation.isPending}>
                {createBotMutation.isPending ? t("bots.creating") : t("bots.connectBot")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Channel Dialog */}
      <Dialog open={isCreateChannelDialogOpen} onOpenChange={setIsCreateChannelDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("bots.connectNewChannel")}</DialogTitle>
            <DialogDescription>
              {t("bots.connectChannelDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bot-select">{t("bots.selectBot")}</Label>
              <Select value={selectedBotForChannel?.id || ""} onValueChange={(value) => {
                const bot = botsQuery.data?.items.find(b => b.id === value)
                setSelectedBotForChannel(bot || null)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder={t("bots.chooseBot")} />
                </SelectTrigger>
                <SelectContent>
                  {botsQuery.data?.items.map((bot) => (
                    <SelectItem key={bot.id} value={bot.id}>
                      {bot.name} (@{bot.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel-username">{t("bots.channelUsername")}</Label>
              <Input 
                id="channel-username" 
                placeholder={t("bots.channelUsernamePlaceholder")} 
                value={newChannelUsername}
                onChange={(e) => setNewChannelUsername(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t("bots.enterChannelUsername")}
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateChannelDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleCreateChannel} disabled={createChannelMutation.isPending}>
                {createChannelMutation.isPending ? t("bots.connecting") : t("bots.connectChannelButton")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bot Settings Dialog */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("bots.botSettings")}</DialogTitle>
            <DialogDescription>{t("bots.configureBotBehavior")}</DialogDescription>
          </DialogHeader>
          {selectedBot && (
            <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="language">{t("bots.defaultLanguage")}</Label>
                  <Select value={selectedBot.settings.language}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="uz">O'zbek</SelectItem>
                    <SelectItem value="ru">Русский</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="auto-detect" checked={selectedBot.settings.autoDetectLanguage} />
                  <Label htmlFor="auto-detect">{t("bots.autoDetectLanguage")}</Label>
                    </div>
                  </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button>{t("bots.saveChanges")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
