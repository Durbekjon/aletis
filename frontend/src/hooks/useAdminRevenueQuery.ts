import { useQuery } from "@tanstack/react-query"
import adminRevenueApi from "@/src/api/adminRevenueApi"

export function useAdminRevenueSummary() {
  return useQuery({
    queryKey: ["admin", "revenue", "summary"],
    queryFn: () => adminRevenueApi.getSummary(),
    staleTime: 60 * 1000,
  })
}

export function useAdminPaymentTrend(months = 6) {
  return useQuery({
    queryKey: ["admin", "revenue", "payment-trend", months],
    queryFn: () => adminRevenueApi.getPaymentTrend(months),
    staleTime: 60 * 1000,
  })
}

export function useAdminInvoices() {
  return useQuery({
    queryKey: ["admin", "revenue", "invoices"],
    queryFn: () => adminRevenueApi.getInvoices(),
    staleTime: 60 * 1000,
  })
}
