import axiosInstance from "./client"

export interface Revenue {
  amount: number
  currency: string
  change: string
}

export interface ActiveConversations {
  count: number
  needAttention: number
}

export interface ConversionRate {
  value: number
  change: string
}

export interface DashboardSummary {
  ordersToday: number
  ordersChange: string
  revenue: Revenue
  activeConversations: ActiveConversations
  conversionRate: ConversionRate
}

export const dashboardApi = {
  async getSummary(): Promise<DashboardSummary> {
    const { data } = await axiosInstance.get<DashboardSummary>("/v1/dashboard/summary")
    return data
  },
}

export default dashboardApi
