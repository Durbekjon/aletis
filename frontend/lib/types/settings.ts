export interface OrganizationSettings {
  id: string
  name: string
  logo?: string
  description?: string
  contactInfo: {
    email: string
    phone?: string
    address?: string
    website?: string
  }
  businessInfo: {
    category: string
    taxId?: string
    registrationNumber?: string
  }
  timezone: string
  currency: string
  language: string
}

export interface NotificationSettings {
  id: string
  userId: string
  email: {
    enabled: boolean
    newOrders: boolean
    lowStock: boolean
    customerMessages: boolean
    systemUpdates: boolean
    weeklyReports: boolean
  }
  telegram: {
    enabled: boolean
    chatId?: string
    newOrders: boolean
    lowStock: boolean
    customerMessages: boolean
    systemAlerts: boolean
  }
  push: {
    enabled: boolean
    newOrders: boolean
    customerMessages: boolean
  }
}

export interface ApiKey {
  id: string
  name: string
  key: string
  permissions: string[]
  createdAt: string
  lastUsed?: string
  expiresAt?: string
  isActive: boolean
}

export interface UserPreferences {
  id: string
  userId: string
  theme: "light" | "dark" | "system"
  language: string
  dateFormat: string
  timeFormat: "12h" | "24h"
  currency: string
  itemsPerPage: number
  defaultView: {
    products: "grid" | "list"
    orders: "table" | "cards"
  }
}

export interface SecuritySettings {
  id: string
  userId: string
  twoFactorEnabled: boolean
  sessionTimeout: number
  allowedIpAddresses: string[]
  loginNotifications: boolean
  passwordLastChanged: string
  securityQuestions: {
    question: string
    answer: string
  }[]
}
