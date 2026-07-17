import { useQuery } from "@tanstack/react-query"
import adminJobsApi from "@/src/api/adminJobsApi"

export function useAdminJobsHealth() {
  return useQuery({
    queryKey: ["admin", "jobs", "health"],
    queryFn: () => adminJobsApi.getHealth(),
    staleTime: 30 * 1000,
  })
}

export function useAdminJobsFailures() {
  return useQuery({
    queryKey: ["admin", "jobs", "failures"],
    queryFn: () => adminJobsApi.getFailures(),
    staleTime: 30 * 1000,
  })
}
