import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import postsApi, { channelsApi } from '@/src/api/postsApi'
import { 
  type Post, 
  type Channel, 
  type CreatePostRequest, 
  type UpdatePostRequest, 
  type PostsQuery,
  mapBackendPostToFrontend,
  mapBackendChannelToFrontend
} from '@/lib/types/post'

// Posts hooks
export function usePostsQuery(params?: PostsQuery) {
  return useQuery({
    queryKey: ['posts', params],
    queryFn: async () => {
      const response = await postsApi.getPosts(params)
      const items = response.items.map(mapBackendPostToFrontend)
      return {
        ...response,
        items,
      }
    },
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function usePostQuery(id: number) {
  return useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const response = await postsApi.getPostById(id)
      return mapBackendPostToFrontend(response)
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  })
}

export function useCreatePostMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreatePostRequest) => {
      const response = await postsApi.createPost(payload)
      return mapBackendPostToFrontend(response)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('Post created successfully')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create post')
    },
  })
}

export function useUpdatePostMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdatePostRequest }) => {
      const response = await postsApi.updatePost(id, payload)
      return mapBackendPostToFrontend(response)
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['post', id] })
      toast.success('Post updated successfully')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update post')
    },
  })
}

export function useDeletePostMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      return await postsApi.deletePost(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('Post deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete post')
    },
  })
}

// Channels hooks
export function useChannelsQuery() {
  return useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const response = await channelsApi.getChannels()
      return response.items.map(mapBackendChannelToFrontend)
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useChannelQuery(id: number) {
  return useQuery({
    queryKey: ['channel', id],
    queryFn: async () => {
      const response = await channelsApi.getChannelById(id)
      return mapBackendChannelToFrontend(response)
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}
