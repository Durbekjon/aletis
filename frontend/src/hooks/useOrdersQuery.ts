import { useQuery } from "@tanstack/react-query"
import ordersApi, { OrdersQueryParams } from "@/src/api/ordersApi"

export function useOrdersQuery(params: OrdersQueryParams = {}) {
  return useQuery({
    queryKey: ["orders", params.page, params.limit, params.search, params.status, params.paymentStatus],
    queryFn: () => ordersApi.getOrders(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })
}