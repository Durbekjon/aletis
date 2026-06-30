import axiosInstance from "./client"

// Channel API types based on backend documentation
export interface Channel {
  id: number
  telegramId: string
  username: string
  description: string | null
  title: string
  status: "PENDING" | "NOT_FOUND" | "NOT_ADMIN" | "NO_REQUIRED_PERMISSIONS" | "DONE" | "FAIL"
  createdAt: string
  updatedAt: string
  connectedBotId: number
  organizationId: number
}

export interface CreateChannelRequest {
  botId: number
  username: string
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

export const channelsApi = {
  // Create a new channel
  async createChannel(payload: CreateChannelRequest): Promise<Channel> {
    const { data } = await axiosInstance.post<Channel>("/v1/channels", payload)
    return data
  },

  // Get all channels with pagination
  async getChannels(params?: PaginationQuery): Promise<PaginatedResponse<Channel>> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.search) searchParams.append('search', params.search)
    if (params?.order) searchParams.append('order', params.order)

    const queryString = searchParams.toString()
    const url = queryString ? `/v1/channels?${queryString}` : "/v1/channels"
    
    const { data } = await axiosInstance.get<PaginatedResponse<Channel>>(url)
    return data
  },

  // Get channel by ID
  async getChannelById(id: number): Promise<Channel> {
    const { data } = await axiosInstance.get<Channel>(`/v1/channels/${id}`)
    return data
  },

  // Update channel
  async updateChannel(id: number, payload: Partial<CreateChannelRequest>): Promise<Channel> {
    const { data } = await axiosInstance.patch<Channel>(`/v1/channels/${id}`, payload)
    return data
  },

  // Delete channel
  async deleteChannel(id: number): Promise<void> {
    await axiosInstance.delete(`/v1/channels/${id}`)
  }
}

export default channelsApi
