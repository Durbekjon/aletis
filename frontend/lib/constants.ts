export const APP_CONFIG = {
  name: "Aletis",
  description: "Telegram Bot E-commerce Platform",
  url: "https://aletis.me",
  supportEmail: "support@aletis.me",
} as const

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/dashboard",
  PRODUCTS: "/products",
  ORDERS: "/orders",
  CUSTOMERS: "/customers",
  RETENTION: "/retention",
  REPLENISHMENT: "/replenishment",
  CAMPAIGNS: "/campaigns",
  SUPPORT: "/support",
  LOYALTY: "/loyalty",
  CONVERSATIONS: "/conversations",
  ANALYTICS: "/analytics",
  BOTS: "/bots",
  BILLING: "/billing",
  TEAM: "/team",
  SETTINGS: "/settings",
  POSTS: "/posts",
} as const

export const BUSINESS_CATEGORIES = [
  "fashion",
  "electronics",
  "cosmetics",
  "services",
  "food",
  "books",
  "home",
  "sports",
  "automotive",
  "other",
] as const
