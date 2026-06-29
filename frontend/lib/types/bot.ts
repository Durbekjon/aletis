// Backend API types
export interface BackendBot {
  id: number
  createdAt: string
  updatedAt: string
  token: string
  status: "ACTIVE" | "INACTIVE" | "ERROR" | "CONNECTING"
  telegramId: string
  name: string
  username: string
  isDefault: boolean
  organizationId: number
  activatedAt: string | null
  deactivatedAt: string | null
  statistics: {
    totalMessages: number
    activeChats: number
    uptime: number
    lastActive: string | null
  }
  logo?: {
    id: number
    key: string
  }
}

// Frontend UI types (enhanced for display)
export interface TelegramBot {
  id: string
  name: string
  username: string
  token: string
  status: "ACTIVE" | "INACTIVE" | "ERROR" | "CONNECTING"
  isDefault: boolean
  description?: string
  logo?: {
    id: number
    key: string
  }
  createdAt: Date
  updatedAt: Date
  lastActiveAt?: Date
  stats: {
    totalMessages: number
    totalConversations: number
    activeConversations: number
    uptime: number
  }
  settings: {
    language: string
    autoDetectLanguage: boolean
    welcomeMessage: string
    fallbackMessage: string
    workingHours: {
      enabled: boolean
      timezone: string
      schedule: {
        [key: string]: { start: string; end: string; enabled: boolean }
      }
    }
  }
}

// Backend Channel API types
export interface BackendChannel {
  id: number
  telegramId: string
  username: string
  description: string | null
  title: string
  status: "PENDING" | "NOT_FOUND" | "NOT_ADMIN" | "NO_REQUIRED_PERMISSIONS" | "DONE" | "FAIL"
  createdAt: string
  updatedAt: string
  connectedBotId: number
  organizationId: number
  logo?: {
    id: number
    key: string
  }
}

// Frontend UI types (enhanced for display)
export interface TelegramChannel {
  id: string
  botId: string
  channelId: string
  channelName: string
  channelUsername?: string
  isConnected: boolean
  permissions: string[]
  autoPost: {
    enabled: boolean
    newProducts: boolean
    promotions: boolean
    schedule: string
  }
  createdAt: Date
  logo?: {
    id: number
    key: string
  }
}

export type BotStatus = TelegramBot["status"]
export type ChannelStatus = BackendChannel["status"]

// Utility functions to convert backend data to frontend format
export function mapBackendBotToFrontend(backendBot: BackendBot): TelegramBot {
  return {
    id: backendBot.id.toString(),
    name: backendBot.name,
    username: backendBot.username,
    token: backendBot.token,
    status: backendBot.status,
    isDefault: backendBot.isDefault,
    description: `Telegram bot #${backendBot.id}`,
    logo: backendBot?.logo ? {
      id: backendBot.logo.id,
      key: backendBot.logo.key,
    } : undefined,
    createdAt: new Date(backendBot.createdAt),
    updatedAt: new Date(backendBot.updatedAt),
    lastActiveAt: backendBot.statistics.lastActive ? new Date(backendBot.statistics.lastActive) : undefined,
    stats: {
      totalMessages: backendBot.statistics.totalMessages,
      totalConversations: 0, // Not provided in backend response
      activeConversations: backendBot.statistics.activeChats,
      uptime: backendBot.statistics.uptime,
    },
    settings: {
      language: "uz",
      autoDetectLanguage: true,
      welcomeMessage: "Assalomu alaykum! Sotuvchi botiga xush kelibsiz!",
      fallbackMessage: "Kechirasiz, sizning so'rovingizni tushunmadim. Operator bilan bog'lanish uchun /help yozing.",
      workingHours: {
        enabled: true,
        timezone: "Asia/Tashkent",
        schedule: {
          monday: { start: "09:00", end: "18:00", enabled: true },
          tuesday: { start: "09:00", end: "18:00", enabled: true },
          wednesday: { start: "09:00", end: "18:00", enabled: true },
          thursday: { start: "09:00", end: "18:00", enabled: true },
          friday: { start: "09:00", end: "18:00", enabled: true },
          saturday: { start: "10:00", end: "16:00", enabled: true },
          sunday: { start: "10:00", end: "16:00", enabled: false },
        },
      },
    },
  }
}

// Utility function to convert backend channel data to frontend format
export function mapBackendChannelToFrontend(backendChannel: BackendChannel): TelegramChannel {
  // Determine channel type based on telegramId prefix
  const getChannelType = (telegramId: string): "channel" | "group" | "supergroup" => {
    if (telegramId.startsWith('-100')) return 'supergroup'
    if (telegramId.startsWith('-')) return 'group'
    return 'channel'
  }

  // Determine if channel is connected based on status
  const isConnected = backendChannel.status === 'DONE'

  // Map status to permissions (simplified mapping)
  const getPermissions = (status: ChannelStatus): string[] => {
    if (status === 'DONE') {
      return ['can_post_messages', 'can_edit_messages', 'can_delete_messages']
    }
    return []
  }

  return {
    id: backendChannel.id.toString(),
    botId: backendChannel.connectedBotId.toString(),
    channelId: backendChannel.telegramId,
    channelName: backendChannel.title,
    channelUsername: backendChannel.username,
    isConnected,
    permissions: getPermissions(backendChannel.status),
    autoPost: {
      enabled: false, // Default value, would need separate API for auto-post settings
      newProducts: false,
      promotions: false,
      schedule: 'manual',
    },
    createdAt: new Date(backendChannel.createdAt),
    logo: backendChannel?.logo ? {
      id: backendChannel.logo.id,
      key: backendChannel.logo.key,
    } : undefined,
  }
}
