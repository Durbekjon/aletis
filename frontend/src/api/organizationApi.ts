import axiosInstance from "./client"

export interface Organization {
  id: number
  name: string
  description?: string
  category: "ELECTRONICS" | "FASHION" | "COSMETICS" | "SERVICES" | "FOOD" | "BOOKS" | "HOME" | "SPORTS" | "AUTOMOTIVE" | "OTHER"
  createdAt: string
  updatedAt: string
  logo?: {
    id: number
    key: string
    url: string
  }
  categories?: { id: number; name_uz: string; name_ru: string; name_en: string; isLeaf: boolean }[]
}

export interface UpdateOrganizationDto {
  name?: string
  description?: string
  category?: Organization["category"]
  logoId?: number | null
  categoryIds?: number[]
}

// ─── Fulfillment Settings ─────────────────────────────────────────────────────

export type FulfillmentMode = "PICKUP_ONLY" | "DELIVERY" | "PICKUP_AND_DELIVERY"
export type DeliveryMethod = "MERCHANT" | "EXTERNAL_COURIER"
export type DeliveryFeeType = "FREE" | "FIXED" | "CUSTOMER_PAYS_SEPARATELY"

export interface FulfillmentSettings {
  id: number
  organizationId: number
  fulfillmentMode: FulfillmentMode
  deliveryMethod: DeliveryMethod | null
  deliveryFeeType: DeliveryFeeType | null
  deliveryFee: number | null
  pickupAddress: string | null
  pickupInstructions: string | null
  createdAt: string
  updatedAt: string
}

export interface UpsertFulfillmentSettingsDto {
  fulfillmentMode: FulfillmentMode
  deliveryMethod?: DeliveryMethod | null
  deliveryFeeType?: DeliveryFeeType | null
  deliveryFee?: number | null
  pickupAddress?: string | null
  pickupInstructions?: string | null
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const organizationApi = {
  async getOrganization(): Promise<Organization> {
    const { data } = await axiosInstance.get<Organization>("/v1/organizations")
    return data
  },

  async updateOrganization(id: number, payload: UpdateOrganizationDto): Promise<Organization> {
    const { data } = await axiosInstance.patch<Organization>(`/v1/organizations/${id}`, payload)
    return data
  },
}

export const fulfillmentApi = {
  async getFulfillmentSettings(orgId: number): Promise<FulfillmentSettings | null> {
    try {
      const { data } = await axiosInstance.get<FulfillmentSettings>(
        `/v1/organizations/${orgId}/fulfillment`,
      )
      return data
    } catch (e: any) {
      if (e?.response?.status === 404) return null
      throw e
    }
  },

  async upsertFulfillmentSettings(
    orgId: number,
    payload: UpsertFulfillmentSettingsDto,
  ): Promise<FulfillmentSettings> {
    const { data } = await axiosInstance.patch<FulfillmentSettings>(
      `/v1/organizations/${orgId}/fulfillment`,
      payload,
    )
    return data
  },
}

export default organizationApi
