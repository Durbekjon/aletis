export interface CustomerAiNote {
  id: number
  customerId: number
  organizationId: number
  purchaseHistory: Array<{
    productName: string
    price: number
    currency: string
    quantity: number
    date: string
  }>
  productInterests: Array<{
    name: string
    category: string
    confidence: "HIGH" | "MEDIUM" | "LOW"
  }>
  favoriteCategories: string[]
  frequentQuestions: string[]
  priceSensitivity: "LOW" | "MEDIUM" | "HIGH"
  buyingBehavior: {
    avgOrderValue?: number
    orderFrequency?: string
    preferredLanguage?: string
    notes?: string
  }
  aiSummary: string | null
  salesOpportunities: Array<{
    type: string
    description: string
    suggestedProducts: string[]
  }>
  aiTags: string[]
  lastAnalyzedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface BackendCustomer {
  id: number
  name: string
  username: string | null
  telegramId: string
  lang: string | null
  createdAt: string
  updatedAt: string
  organizationId: number
  botId: number
  _count: { orders: number }
  orders: Array<{
    createdAt: string
    totalPrice: number
    currency: string
  }>
  aiNote: {
    aiTags: string[]
    priceSensitivity: "LOW" | "MEDIUM" | "HIGH"
  } | null
}

export interface BackendCustomerMessage {
  id: string
  content: string
  sender: "USER" | "BOT"
  createdAt: string
  customerId: number
  botId: number
  isInquiry: boolean
}

export interface BackendCustomerOrder {
  id: number
  status: string
  paymentStatus: string
  totalPrice: number
  currency: string
  createdAt: string
  orderItems: Array<{
    id: number
    quantity: number
    price: number
    product: { id: number; name: string; price: number; currency: string }
  }>
}

export interface BackendCustomerDetail extends BackendCustomer {
  messages: BackendCustomerMessage[]
  orders: BackendCustomerOrder[]
  aiNote: CustomerAiNote | null
}
