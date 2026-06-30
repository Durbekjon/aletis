import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import customersApi, { CustomersQueryParams } from "@/src/api/customersApi"

export function useCustomersQuery(params: CustomersQueryParams = {}) {
  return useQuery({
    queryKey: ["customers", params.page, params.limit, params.search, params.order],
    queryFn: () => customersApi.getCustomers(params),
    staleTime: 60 * 1000,
  })
}

export function useCustomerQuery(id: number) {
  return useQuery({
    queryKey: ["customer", id],
    queryFn: () => customersApi.getCustomerById(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  })
}

export function useAnalyzeCustomerMutation(customerId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => customersApi.analyzeCustomer(customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", customerId] })
      queryClient.invalidateQueries({ queryKey: ["customers"] })
    },
  })
}
