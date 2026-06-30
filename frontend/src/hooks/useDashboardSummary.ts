import { useQuery } from "@tanstack/react-query"
import dashboardApi from "@/src/api/dashboardApi"

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => dashboardApi.getSummary(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })
}
