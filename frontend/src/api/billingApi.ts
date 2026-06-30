import axiosInstance from "./client"

export type PlanTier = 'FREE' | 'STARTER' | 'GROWTH' | 'SCALE'
export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED'
export type InvoiceStatus = 'DRAFT' | 'OPEN' | 'PAID' | 'VOID'
export type PaymentProvider = 'PAYME' | 'CLICK' | 'BANK_TRANSFER' | 'MANUAL'

export interface SubscriptionPlan {
  id: number
  tier: PlanTier
  name: string
  priceUsd: number
  convoLimit: number
  productLimit: number
  botLimit: number
  teamMemberLimit: number
  overagePriceUsd: number
  overageCap: number
}

export interface Subscription {
  id: number
  status: SubscriptionStatus
  trialEndsAt: string | null
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
}

export interface UsageStat {
  current: number
  limit: number // -1 = unlimited
}

export interface BillingDashboard {
  subscription: Subscription
  plan: SubscriptionPlan
  usage: {
    aiConvos: UsageStat
    products: UsageStat
    bots: UsageStat
    teamMembers: UsageStat
  }
  invoices: Invoice[]
}

export interface Invoice {
  id: number
  invoiceNumber: string
  subscriptionId: number
  amountUsd: number
  overageAmountUsd: number
  status: InvoiceStatus
  provider: PaymentProvider | null
  paidAt: string | null
  dueDate: string
  periodStart: string
  periodEnd: string
  paymentUrl: string | null
  createdAt: string
}

export interface CurrentUsage {
  aiConvos: number
  convoLimit: number
  periodStart: string
  periodEnd: string
}

export const billingApi = {
  async getPlans(): Promise<SubscriptionPlan[]> {
    const { data } = await axiosInstance.get<SubscriptionPlan[]>('/v1/billing/plans')
    return data
  },

  async getDashboard(): Promise<BillingDashboard> {
    const { data } = await axiosInstance.get<BillingDashboard>('/v1/billing/subscription')
    return data
  },

  async getUsage(): Promise<CurrentUsage> {
    const { data } = await axiosInstance.get<CurrentUsage>('/v1/billing/usage')
    return data
  },

  async getInvoices(): Promise<Invoice[]> {
    const { data } = await axiosInstance.get<Invoice[]>('/v1/billing/invoices')
    return data
  },

  async changePlan(tier: PlanTier): Promise<void> {
    await axiosInstance.post('/v1/billing/subscription/change', { tier })
  },

  async cancelSubscription(): Promise<void> {
    await axiosInstance.post('/v1/billing/subscription/cancel')
  },
}

export default billingApi
