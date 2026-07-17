import axiosInstance from "./client"

export type AiCostPeriod = "today" | "month" | "year"

export interface AiCostPeriodTotals {
  callCount: number
  promptTokens: number
  candidatesTokens: number
  totalTokens: number
  costUsd: number
}

export interface AiCostSummary {
  today: AiCostPeriodTotals
  month: AiCostPeriodTotals
  year: AiCostPeriodTotals
  pricingVerified: boolean
}

export interface AiCostByModel {
  model: string
  callCount: number
  totalTokens: number
  avgLatencyMs: number
  costUsd: number
}

export interface AiCostByFeature {
  feature: string
  callCount: number
  totalTokens: number
  costUsd: number
}

export interface AiCostByOrg {
  organizationId: number | null
  organizationName: string | null
  callCount: number
  totalTokens: number
  costUsd: number
}

export const adminAiCostApi = {
  async getSummary(): Promise<AiCostSummary> {
    const { data } = await axiosInstance.get<AiCostSummary>("/v1/admin/ai-cost/summary")
    return data
  },

  async getByModel(period: AiCostPeriod): Promise<AiCostByModel[]> {
    const { data } = await axiosInstance.get<AiCostByModel[]>("/v1/admin/ai-cost/by-model", {
      params: { period },
    })
    return data
  },

  async getByFeature(period: AiCostPeriod): Promise<AiCostByFeature[]> {
    const { data } = await axiosInstance.get<AiCostByFeature[]>("/v1/admin/ai-cost/by-feature", {
      params: { period },
    })
    return data
  },

  async getByOrg(period: AiCostPeriod): Promise<AiCostByOrg[]> {
    const { data } = await axiosInstance.get<AiCostByOrg[]>("/v1/admin/ai-cost/by-org", {
      params: { period },
    })
    return data
  },
}

export default adminAiCostApi
