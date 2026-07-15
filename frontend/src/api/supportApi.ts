import axiosInstance from "./client"

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED"
export type TicketSentiment = "URGENT" | "NORMAL" | "COMPLAINT"
export type CustomerChannel = "TELEGRAM" | "INSTAGRAM"

export interface SupportTicket {
  id: number
  reason: string
  sentiment: TicketSentiment | string
  status: TicketStatus
  createdAt: string
  updatedAt: string
  customer?: {
    id: number
    name: string
    username: string | null
    channel: CustomerChannel
  }
}

export interface SupportMetrics {
  open: number
  inProgress: number
  resolved: number
  total: number
}

export const supportApi = {
  async getMetrics(): Promise<SupportMetrics> {
    const { data } = await axiosInstance.get<SupportMetrics>(
      "/v1/support/metrics",
    )
    return data
  },

  async getTickets(status?: TicketStatus): Promise<SupportTicket[]> {
    const { data } = await axiosInstance.get<SupportTicket[]>(
      "/v1/support/tickets",
      { params: status ? { status } : {} },
    )
    return data
  },

  async updateStatus(id: number, status: TicketStatus): Promise<SupportTicket> {
    const { data } = await axiosInstance.patch<SupportTicket>(
      `/v1/support/tickets/${id}/status`,
      { status },
    )
    return data
  },
}

export default supportApi
