import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import instagramApi from '@/src/api/instagramApi'

export function useInstagramAccountQuery() {
  return useQuery({
    queryKey: ['instagram-account'],
    queryFn: () => instagramApi.getAccount(),
    staleTime: 30 * 1000,
  })
}

export function useConnectInstagramMutation() {
  return useMutation({
    mutationFn: () => instagramApi.getConnectUrl(),
    onSuccess: (data) => {
      window.location.href = data.url
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to start Instagram connection')
    },
  })
}

export function useDisconnectInstagramMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => instagramApi.disconnect(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-account'] })
      toast.success('Instagram account disconnected')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to disconnect Instagram account')
    },
  })
}
