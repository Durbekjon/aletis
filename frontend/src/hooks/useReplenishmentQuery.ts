import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import replenishmentApi, { ReplenishmentStatus } from "@/src/api/replenishmentApi"

export function useReplenishmentMetrics() {
  return useQuery({
    queryKey: ["replenishment", "metrics"],
    queryFn: () => replenishmentApi.getMetrics(),
    staleTime: 30 * 1000,
  })
}

export function useUpcomingReplenishments(limit?: number) {
  return useQuery({
    queryKey: ["replenishment", "upcoming", limit],
    queryFn: () => replenishmentApi.getUpcoming(limit),
    staleTime: 30 * 1000,
  })
}

export function useReplenishmentReminders(status?: ReplenishmentStatus) {
  return useQuery({
    queryKey: ["replenishment", "reminders", status],
    queryFn: () => replenishmentApi.getReminders(status),
    staleTime: 15 * 1000,
  })
}

function useInvalidateReplenishment() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ["replenishment"] })
}

export function useReplenishmentScanMutation() {
  const invalidate = useInvalidateReplenishment()
  return useMutation({
    mutationFn: () => replenishmentApi.scan(),
    onSuccess: invalidate,
  })
}

export function useSendReminderMutation() {
  const invalidate = useInvalidateReplenishment()
  return useMutation({
    mutationFn: (reminderId: number) => replenishmentApi.send(reminderId),
    onSuccess: invalidate,
  })
}
