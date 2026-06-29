export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price: number
  currency: "USD" | "UZS"
  interval: "monthly" | "yearly"
  features: string[]
  limits: {
    products: number
    orders: number
    conversations: number
    bots: number
    teamMembers: number
    storage: number // in GB
  }
  isPopular?: boolean
  isEnterprise?: boolean
}

export interface Subscription {
  id: string
  planId: string
  plan: SubscriptionPlan
  status: "active" | "cancelled" | "past_due" | "trialing" | "incomplete"
  currentPeriodStart: Date
  currentPeriodEnd: Date
  trialEnd?: Date
  cancelAtPeriodEnd: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Usage {
  products: { current: number; limit: number }
  orders: { current: number; limit: number }
  conversations: { current: number; limit: number }
  bots: { current: number; limit: number }
  teamMembers: { current: number; limit: number }
  storage: { current: number; limit: number } // in GB
}

export interface Invoice {
  id: string
  invoiceNumber: string
  subscriptionId: string
  amount: number
  currency: "USD" | "UZS"
  status: "draft" | "open" | "paid" | "void" | "uncollectible"
  paymentMethod?: "payme" | "uzcard" | "click" | "bank_transfer"
  paidAt?: Date
  dueDate: Date
  createdAt: Date
  items: InvoiceItem[]
}

export interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  period?: {
    start: Date
    end: Date
  }
}

export interface PaymentMethod {
  id: string
  type: "payme" | "uzcard" | "click" | "bank_transfer"
  isDefault: boolean
  details: {
    cardNumber?: string
    cardHolder?: string
    expiryDate?: string
    phoneNumber?: string
    accountNumber?: string
  }
  createdAt: Date
}

export type SubscriptionStatus = Subscription["status"]
export type InvoiceStatus = Invoice["status"]
export type PaymentMethodType = PaymentMethod["type"]
