import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import supportApi, { TicketStatus } from "@/src/api/supportApi"

export function useSupportMetrics() {
  return useQuery({
    queryKey: ["support", "metrics"],
    queryFn: () => supportApi.getMetrics(),
    staleTime: 15 * 1000,
  })
}

export function useSupportTickets(status?: TicketStatus) {
  return useQuery({
    queryKey: ["support", "tickets", status],
    queryFn: () => supportApi.getTickets(status),
    staleTime: 15 * 1000,
  })
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: TicketStatus }) =>
      supportApi.updateStatus(id, status),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["support"] }),
  })
}
