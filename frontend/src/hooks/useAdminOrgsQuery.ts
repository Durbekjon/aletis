import { useQuery } from "@tanstack/react-query"
import adminOrgsApi from "@/src/api/adminOrgsApi"

export function useAdminOrgs() {
  return useQuery({
    queryKey: ["admin", "orgs"],
    queryFn: () => adminOrgsApi.list(),
    staleTime: 60 * 1000,
  })
}
