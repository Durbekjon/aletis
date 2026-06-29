import axiosInstance from "./client"
import { BackendBot } from "@/lib/types/bot"

// Bot API types based on backend documentation
export type Bot = BackendBot

export interface CreateBotRequest {
  token: string
}

export interface BotResponse {
  ok: boolean
  description: string
}

export interface PaginationQuery {
  page?: number
  limit?: number
  search?: string
  order?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export const botsApi = {
  // Create a new bot
  async createBot(payload: CreateBotRequest): Promise<Bot> {
    const { data } = await axiosInstance.post<Bot>("/v1/bots", payload)
    return data
  },

  // Get all bots with pagination
  async getBots(params?: PaginationQuery): Promise<PaginatedResponse<Bot>> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.search) searchParams.append('search', params.search)
    if (params?.order) searchParams.append('order', params.order)

    const queryString = searchParams.toString()
    const url = queryString ? `/v1/bots?${queryString}` : "/v1/bots"
    
    const { data } = await axiosInstance.get<PaginatedResponse<Bot>>(url)
    return data
  },

  // Get bot by ID
  async getBotById(id: number): Promise<Bot> {
    const { data } = await axiosInstance.get<Bot>(`/v1/bots/${id}`)
    return data
  },

  // Update bot
  async updateBot(id: number, payload: Partial<CreateBotRequest>): Promise<Bot> {
    const { data } = await axiosInstance.patch<Bot>(`/v1/bots/${id}`, payload)
    return data
  },

  // Delete bot
  async deleteBot(id: number): Promise<void> {
    await axiosInstance.delete(`/v1/bots/${id}`)
  },

  // Start bot (set webhook)
  async startBot(id: number): Promise<BotResponse> {
    const { data } = await axiosInstance.post<BotResponse>(`/v1/bots/${id}/start`)
    return data
  },

  // Stop bot (delete webhook)
  async stopBot(id: number): Promise<BotResponse> {
    const { data } = await axiosInstance.post<BotResponse>(`/v1/bots/${id}/stop`)
    return data
  }
}

export default botsApi
