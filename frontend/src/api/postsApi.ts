import axiosInstance from "./client"
import type { 
  BackendPost, 
  BackendChannel, 
  CreatePostRequest, 
  UpdatePostRequest, 
  PostsQuery, 
  PaginatedResponse 
} from "@/lib/types/post"

export const postsApi = {
  // Get all posts with pagination and filtering
  async getPosts(params?: PostsQuery): Promise<PaginatedResponse<BackendPost>> {
    const searchParams = new URLSearchParams()
    if (params?.channelId) searchParams.append('channelId', params.channelId.toString())
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.search) searchParams.append('search', params.search)
    if (params?.status) searchParams.append('status', params.status)

    const queryString = searchParams.toString()
    const url = queryString ? `/v1/posts?${queryString}` : "/v1/posts"
    
    const { data } = await axiosInstance.get<PaginatedResponse<BackendPost>>(url)
    return data
  },

  // Get single post by ID
  async getPostById(id: number): Promise<BackendPost> {
    const { data } = await axiosInstance.get<BackendPost>(`/v1/posts/${id}`)
    return data
  },

  // Create a new post
  async createPost(payload: CreatePostRequest): Promise<BackendPost> {
    const { data } = await axiosInstance.post<BackendPost>("/v1/posts", payload)
    return data
  },

  // Update an existing post
  async updatePost(id: number, payload: UpdatePostRequest): Promise<BackendPost> {
    const { data } = await axiosInstance.patch<BackendPost>(`/v1/posts/${id}`, payload)
    return data
  },

  // Delete a post
  async deletePost(id: number): Promise<void> {
    await axiosInstance.delete(`/v1/posts/${id}`)
  }
}

export const channelsApi = {
  // Get all channels
  async getChannels(): Promise<PaginatedResponse<BackendChannel>> {
    const { data } = await axiosInstance.get<PaginatedResponse<BackendChannel>>("/v1/channels")
    return data
  },

  // Get channel by ID
  async getChannelById(id: number): Promise<BackendChannel> {
    const { data } = await axiosInstance.get<BackendChannel>(`/v1/channels/${id}`)
    return data
  }
}

export default postsApi
