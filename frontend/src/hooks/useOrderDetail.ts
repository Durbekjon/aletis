import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import ordersApi, { UpdateOrderDto } from "@/src/api/ordersApi"

export function useOrderDetail(orderId: number) {
  return useQuery({
    queryKey: ["order", orderId],
    queryFn: () => ordersApi.getOrderById(orderId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  })
}

export function useUpdateOrder() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ orderId, updateData }: { orderId: number; updateData: UpdateOrderDto }) =>
      ordersApi.updateOrder(orderId, updateData),
    onSuccess: (updatedOrder) => {
      // Update the order in the cache
      queryClient.setQueryData(["order", updatedOrder.id], updatedOrder)
      // Invalidate orders list to refresh
      queryClient.invalidateQueries({ queryKey: ["orders"] })
    },
  })
}
