import axiosInstance from "./client"

export type WinBackStatus =
  | "QUEUED"
  | "SENT"
  | "RESPONDED"
  | "RECOVERED"
  | "FAILED"
  | "SKIPPED"

export type CustomerChannel = "TELEGRAM" | "INSTAGRAM"

export interface RetentionMetrics {
  dormantCount: number
  queued: number
  sent: number
  responded: number
  recovered: number
  failed: number
  revenueRecovered: number
  responseRate: number
  recoveryRate: number
}

export interface DormantCustomer {
  id: number
  name: string
  username: string | null
  channel: CustomerChannel
  lang: string | null
  lastActivityAt: string | null
  dormantDays: number
  orderCount: number
  totalSpent: number
  currency: string
  aiTags: string[]
  lastWinBackAt: string | null
}

export interface WinBackAttempt {
  id: number
  customerId: number
  channel: CustomerChannel
  status: WinBackStatus
  dormantDays: number | null
  generatedMessage: string | null
  incentive: string | null
  sentAt: string | null
  respondedAt: string | null
  recoveredAt: string | null
  recoveredOrderId: number | null
  recoveredRevenue: number | null
  createdAt: string
  customer?: {
    id: number
    name: string
    username: string | null
    channel: CustomerChannel
  }
}

export const retentionApi = {
  async getMetrics(): Promise<RetentionMetrics> {
    const { data } = await axiosInstance.get<RetentionMetrics>("/v1/retention/metrics")
    return data
  },

  async getDormant(dormantDays?: number): Promise<DormantCustomer[]> {
    const { data } = await axiosInstance.get<DormantCustomer[]>("/v1/retention/dormant", {
      params: dormantDays ? { dormantDays } : {},
    })
    return data
  },

  async getAttempts(status?: WinBackStatus): Promise<WinBackAttempt[]> {
    const { data } = await axiosInstance.get<WinBackAttempt[]>("/v1/retention/attempts", {
      params: status ? { status } : {},
    })
    return data
  },

  async scan(body: { dormantDays?: number; incentive?: string; limit?: number } = {}) {
    const { data } = await axiosInstance.post<{ dormant: number; enqueued: number }>(
      "/v1/retention/scan",
      body,
    )
    return data
  },

  async winback(customerId: number, incentive?: string) {
    const { data } = await axiosInstance.post(`/v1/retention/customers/${customerId}/winback`, {
      incentive,
    })
    return data
  },
}

export default retentionApi
