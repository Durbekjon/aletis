import axiosInstance from "./client"

export interface OrgHealthRow {
  id: number
  name: string
  category: string
  createdAt: string
  planTier: string | null
  subscriptionStatus: string | null
  convoLimit: number | null
  botCount: number
  lastActivityAt: string | null
  aiCostThisMonthUsd: number
  revenueThisMonth: { currency: string; amount: number }[]
}

export const adminOrgsApi = {
  async list(): Promise<OrgHealthRow[]> {
    const { data } = await axiosInstance.get<OrgHealthRow[]>("/v1/admin/orgs")
    return data
  },
}

export default adminOrgsApi
