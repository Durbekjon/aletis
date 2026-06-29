import { useQuery } from "@tanstack/react-query"
import authApi from "@/src/api/authApi"

export function useOnboardingProgress() {
  return useQuery({
    queryKey: ["onboarding-progress"],
    queryFn: () => authApi.getOnboardingProgress(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })
}
