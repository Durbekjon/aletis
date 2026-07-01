import axiosInstance from "./client"

export type ReplenishmentStatus =
  | "SCHEDULED"
  | "SENT"
  | "RESPONDED"
  | "PURCHASED"
  | "DISMISSED"
  | "FAILED"
  | "SKIPPED"

export type ReplenishmentMethod = "CADENCE" | "DOSAGE" | "AI_ESTIMATE"

export type CustomerChannel = "TELEGRAM" | "INSTAGRAM"

export interface ReplenishmentMetrics {
  scheduled: number
  sent: number
  responded: number
  purchased: number
  failed: number
  responseRate: number
  reorderRate: number
}

export interface ReplenishmentReminder {
  id: number
  customerId: number
  productId: number
  quantity: number
  predictedDepletionDate: string
  method: ReplenishmentMethod
  status: ReplenishmentStatus
  basis: Record<string, unknown> | null
  generatedMessage: string | null
  sentAt: string | null
  purchasedAt: string | null
  createdAt: string
  customer?: {
    id: number
    name: string
    username: string | null
    channel: CustomerChannel
  }
  product?: {
    id: number
    name: string
  }
}

export const replenishmentApi = {
  async getMetrics(): Promise<ReplenishmentMetrics> {
    const { data } = await axiosInstance.get<ReplenishmentMetrics>("/v1/replenishment/metrics")
    return data
  },

  async getUpcoming(limit?: number): Promise<ReplenishmentReminder[]> {
    const { data } = await axiosInstance.get<ReplenishmentReminder[]>("/v1/replenishment/upcoming", {
      params: limit ? { limit } : {},
    })
    return data
  },

  async getReminders(status?: ReplenishmentStatus): Promise<ReplenishmentReminder[]> {
    const { data } = await axiosInstance.get<ReplenishmentReminder[]>("/v1/replenishment/reminders", {
      params: status ? { status } : {},
    })
    return data
  },

  async scan() {
    const { data } = await axiosInstance.post<{ due: number; enqueued: number }>(
      "/v1/replenishment/scan",
    )
    return data
  },

  async send(reminderId: number) {
    const { data } = await axiosInstance.post(`/v1/replenishment/reminders/${reminderId}/send`)
    return data
  },
}

export default replenishmentApi
