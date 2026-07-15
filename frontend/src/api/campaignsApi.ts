import axiosInstance from "./client"

export type CampaignSegment =
  | "ALL_BUYERS"
  | "NEW"
  | "VIP"
  | "AT_RISK"
  | "DORMANT"

export type CampaignStatus = "DRAFT" | "SENDING" | "SENT" | "FAILED"

export interface Campaign {
  id: number
  organizationId: number
  name: string
  segment: CampaignSegment
  messageTemplate: string | null
  incentive: string | null
  status: CampaignStatus
  targeted: number
  sent: number
  failed: number
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SegmentPreview {
  segment: CampaignSegment
  count: number
}

export interface CreateCampaignBody {
  name: string
  segment: CampaignSegment
  messageTemplate?: string
  incentive?: string
}

export const CAMPAIGN_SEGMENTS: CampaignSegment[] = [
  "ALL_BUYERS",
  "NEW",
  "VIP",
  "AT_RISK",
  "DORMANT",
]

export const campaignsApi = {
  async list(): Promise<Campaign[]> {
    const { data } = await axiosInstance.get<Campaign[]>("/v1/campaigns")
    return data
  },

  async get(id: number): Promise<Campaign> {
    const { data } = await axiosInstance.get<Campaign>(`/v1/campaigns/${id}`)
    return data
  },

  async preview(segment: CampaignSegment): Promise<SegmentPreview> {
    const { data } = await axiosInstance.get<SegmentPreview>(
      `/v1/campaigns/segments/${segment}/preview`,
    )
    return data
  },

  async create(body: CreateCampaignBody): Promise<Campaign> {
    const { data } = await axiosInstance.post<Campaign>("/v1/campaigns", body)
    return data
  },

  async launch(id: number): Promise<Campaign> {
    const { data } = await axiosInstance.post<Campaign>(
      `/v1/campaigns/${id}/launch`,
      {},
    )
    return data
  },
}

export default campaignsApi
