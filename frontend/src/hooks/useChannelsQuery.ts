import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import channelsApi, { type CreateChannelRequest, type PaginationQuery } from '@/src/api/channelsApi'
import { type TelegramChannel, mapBackendChannelToFrontend } from '@/lib/types/bot'

export function useChannelsQuery(params?: PaginationQuery) {
  return useQuery({
    queryKey: ['channels', params],
    queryFn: async () => {
      const response = await channelsApi.getChannels(params)
      return {
        ...response,
        items: response.items.map(mapBackendChannelToFrontend)
      }
    },
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useCreateChannelMutation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (payload: CreateChannelRequest) => {
      return await channelsApi.createChannel(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      toast.success('Channel created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create channel')
    },
  })
}

export function useDeleteChannelMutation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: number) => {
      return await channelsApi.deleteChannel(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      toast.success('Channel deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete channel')
    },
  })
}
