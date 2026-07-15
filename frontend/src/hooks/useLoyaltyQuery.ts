import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import loyaltyApi from "@/src/api/loyaltyApi"

export function useLoyaltyMetrics() {
  return useQuery({
    queryKey: ["loyalty", "metrics"],
    queryFn: () => loyaltyApi.getMetrics(),
    staleTime: 30 * 1000,
  })
}

export function useCustomerLoyalty(id: number | null) {
  return useQuery({
    queryKey: ["loyalty", "customer", id],
    queryFn: () => loyaltyApi.getCustomer(id as number),
    enabled: id != null,
    staleTime: 15 * 1000,
  })
}

export function useAdjustPoints() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      points,
      note,
    }: {
      id: number
      points: number
      note?: string
    }) => loyaltyApi.adjust(id, points, note),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["loyalty"] }),
  })
}
