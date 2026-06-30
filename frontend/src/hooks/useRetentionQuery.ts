import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import retentionApi, { WinBackStatus } from "@/src/api/retentionApi"

export function useRetentionMetrics() {
  return useQuery({
    queryKey: ["retention", "metrics"],
    queryFn: () => retentionApi.getMetrics(),
    staleTime: 30 * 1000,
  })
}

export function useDormantCustomers(dormantDays?: number) {
  return useQuery({
    queryKey: ["retention", "dormant", dormantDays],
    queryFn: () => retentionApi.getDormant(dormantDays),
    staleTime: 30 * 1000,
  })
}

export function useWinBackAttempts(status?: WinBackStatus) {
  return useQuery({
    queryKey: ["retention", "attempts", status],
    queryFn: () => retentionApi.getAttempts(status),
    staleTime: 15 * 1000,
  })
}

function useInvalidateRetention() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ["retention"] })
}

export function useScanMutation() {
  const invalidate = useInvalidateRetention()
  return useMutation({
    mutationFn: (body: { dormantDays?: number; incentive?: string; limit?: number } = {}) =>
      retentionApi.scan(body),
    onSuccess: invalidate,
  })
}

export function useWinBackMutation() {
  const invalidate = useInvalidateRetention()
  return useMutation({
    mutationFn: ({ customerId, incentive }: { customerId: number; incentive?: string }) =>
      retentionApi.winback(customerId, incentive),
    onSuccess: invalidate,
  })
}
