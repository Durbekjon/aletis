import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import channelsApi, { type Channel, type CreateChannelRequest, type PaginationQuery } from '@/src/api/channelsApi'
import { type TelegramChannel, mapBackendChannelToFrontend } from '@/lib/types/bot'

interface UseChannelsReturn {
  channels: TelegramChannel[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
  } | null
  createChannel: (payload: CreateChannelRequest) => Promise<void>
  updateChannel: (id: number, payload: Partial<CreateChannelRequest>) => Promise<void>
  deleteChannel: (id: number) => Promise<void>
  refreshChannels: () => Promise<void>
  setPage: (page: number) => void
  setSearch: (search: string) => void
}

export function useChannels(initialParams?: PaginationQuery): UseChannelsReturn {
  const [channels, setChannels] = useState<TelegramChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<UseChannelsReturn['pagination']>(null)
  const [params, setParams] = useState<PaginationQuery>({
    page: 1,
    limit: 20,
    order: 'desc',
    ...initialParams
  })

  const fetchChannels = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await channelsApi.getChannels(params)
      
      // Convert backend channels to frontend format
      const frontendChannels = response.items.map(mapBackendChannelToFrontend)
      
      setChannels(frontendChannels)
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
        hasNext: response.hasNext,
        hasPrevious: response.hasPrevious,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch channels'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [params])

  const createChannel = useCallback(async (payload: CreateChannelRequest) => {
    try {
      await channelsApi.createChannel(payload)
      toast.success('Channel created successfully')
      await fetchChannels() // Refresh the list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create channel'
      toast.error(errorMessage)
      throw err
    }
  }, [fetchChannels])

  const updateChannel = useCallback(async (id: number, payload: Partial<CreateChannelRequest>) => {
    try {
      await channelsApi.updateChannel(id, payload)
      toast.success('Channel updated successfully')
      await fetchChannels() // Refresh the list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update channel'
      toast.error(errorMessage)
      throw err
    }
  }, [fetchChannels])

  const deleteChannel = useCallback(async (id: number) => {
    try {
      await channelsApi.deleteChannel(id)
      toast.success('Channel deleted successfully')
      await fetchChannels() // Refresh the list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete channel'
      toast.error(errorMessage)
      throw err
    }
  }, [fetchChannels])

  const refreshChannels = useCallback(async () => {
    await fetchChannels()
  }, [fetchChannels])

  const setPage = useCallback((page: number) => {
    setParams(prev => ({ ...prev, page }))
  }, [])

  const setSearch = useCallback((search: string) => {
    setParams(prev => ({ ...prev, search, page: 1 }))
  }, [])

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  return {
    channels,
    loading,
    error,
    pagination,
    createChannel,
    updateChannel,
    deleteChannel,
    refreshChannels,
    setPage,
    setSearch,
  }
}
