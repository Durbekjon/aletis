import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import botsApi, { type Bot, type CreateBotRequest, type PaginationQuery } from '@/src/api/botsApi'
import { type TelegramBot, mapBackendBotToFrontend } from '@/lib/types/bot'

interface UseBotsReturn {
  bots: TelegramBot[]
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
  createBot: (payload: CreateBotRequest) => Promise<void>
  updateBot: (id: number, payload: Partial<CreateBotRequest>) => Promise<void>
  deleteBot: (id: number) => Promise<void>
  startBot: (id: number) => Promise<void>
  stopBot: (id: number) => Promise<void>
  refreshBots: () => Promise<void>
  setPage: (page: number) => void
  setSearch: (search: string) => void
}

export function useBots(initialParams?: PaginationQuery): UseBotsReturn {
  const [bots, setBots] = useState<TelegramBot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<UseBotsReturn['pagination']>(null)
  const [params, setParams] = useState<PaginationQuery>({
    page: 1,
    limit: 20,
    order: 'desc',
    ...initialParams
  })

  const fetchBots = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await botsApi.getBots(params)
      
      // Convert backend bots to frontend format
      const frontendBots = response.items.map(mapBackendBotToFrontend)
      
      setBots(frontendBots)
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
        hasNext: response.hasNext,
        hasPrevious: response.hasPrevious,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch bots'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [params])

  const createBot = useCallback(async (payload: CreateBotRequest) => {
    try {
      await botsApi.createBot(payload)
      toast.success('Bot created successfully')
      await fetchBots() // Refresh the list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create bot'
      toast.error(errorMessage)
      throw err
    }
  }, [fetchBots])

  const updateBot = useCallback(async (id: number, payload: Partial<CreateBotRequest>) => {
    try {
      await botsApi.updateBot(id, payload)
      toast.success('Bot updated successfully')
      await fetchBots() // Refresh the list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update bot'
      toast.error(errorMessage)
      throw err
    }
  }, [fetchBots])

  const deleteBot = useCallback(async (id: number) => {
    try {
      await botsApi.deleteBot(id)
      toast.success('Bot deleted successfully')
      await fetchBots() // Refresh the list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete bot'
      toast.error(errorMessage)
      throw err
    }
  }, [fetchBots])

  const startBot = useCallback(async (id: number) => {
    try {
      await botsApi.startBot(id)
      toast.success('Bot started successfully')
      await fetchBots() // Refresh the list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start bot'
      toast.error(errorMessage)
      throw err
    }
  }, [fetchBots])

  const stopBot = useCallback(async (id: number) => {
    try {
      await botsApi.stopBot(id)
      toast.success('Bot stopped successfully')
      await fetchBots() // Refresh the list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop bot'
      toast.error(errorMessage)
      throw err
    }
  }, [fetchBots])

  const refreshBots = useCallback(async () => {
    await fetchBots()
  }, [fetchBots])

  const setPage = useCallback((page: number) => {
    setParams(prev => ({ ...prev, page }))
  }, [])

  const setSearch = useCallback((search: string) => {
    setParams(prev => ({ ...prev, search, page: 1 }))
  }, [])

  useEffect(() => {
    fetchBots()
  }, [fetchBots])

  return {
    bots,
    loading,
    error,
    pagination,
    createBot,
    updateBot,
    deleteBot,
    startBot,
    stopBot,
    refreshBots,
    setPage,
    setSearch,
  }
}
