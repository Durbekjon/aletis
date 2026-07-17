import { useQuery } from "@tanstack/react-query"
import adminAiCostApi, { AiCostPeriod } from "@/src/api/adminAiCostApi"

export function useAdminAiCostSummary() {
  return useQuery({
    queryKey: ["admin", "ai-cost", "summary"],
    queryFn: () => adminAiCostApi.getSummary(),
    staleTime: 30 * 1000,
  })
}

export function useAdminAiCostByModel(period: AiCostPeriod) {
  return useQuery({
    queryKey: ["admin", "ai-cost", "by-model", period],
    queryFn: () => adminAiCostApi.getByModel(period),
    staleTime: 30 * 1000,
  })
}

export function useAdminAiCostByFeature(period: AiCostPeriod) {
  return useQuery({
    queryKey: ["admin", "ai-cost", "by-feature", period],
    queryFn: () => adminAiCostApi.getByFeature(period),
    staleTime: 30 * 1000,
  })
}

export function useAdminAiCostByOrg(period: AiCostPeriod) {
  return useQuery({
    queryKey: ["admin", "ai-cost", "by-org", period],
    queryFn: () => adminAiCostApi.getByOrg(period),
    staleTime: 30 * 1000,
  })
}
