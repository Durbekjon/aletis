import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import botsApi, { type CreateBotRequest, type PaginationQuery } from '@/src/api/botsApi'
import { type TelegramBot, mapBackendBotToFrontend } from '@/lib/types/bot'

export function useBotsQuery(params?: PaginationQuery) {
  return useQuery({
    queryKey: ['bots', params],
    queryFn: async () => {
      const response = await botsApi.getBots(params)
      return {
        ...response,
        items: response.items.map(mapBackendBotToFrontend)
      }
    },
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useCreateBotMutation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (payload: CreateBotRequest) => {
      return await botsApi.createBot(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] })
      toast.success('Bot created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create bot')
    },
  })
}

export function useDeleteBotMutation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: number) => {
      return await botsApi.deleteBot(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] })
      toast.success('Bot deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete bot')
    },
  })
}

export function useStartBotMutation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: number) => {
      return await botsApi.startBot(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] })
      toast.success('Bot started successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to start bot')
    },
  })
}

export function useStopBotMutation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: number) => {
      return await botsApi.stopBot(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] })
      toast.success('Bot stopped successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to stop bot')
    },
  })
}
