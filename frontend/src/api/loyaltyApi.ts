import axiosInstance from "./client"

export interface TopReferrer {
  id: number
  name: string
  referrals: number
  points: number
}

export interface LoyaltyMetrics {
  pointsIssued: number
  pointsRedeemed: number
  successfulReferrals: number
  topReferrers: TopReferrer[]
}

export interface LoyaltyTransaction {
  id?: number
  points: number
  reason: string
  createdAt?: string
}

export interface CustomerLoyalty {
  customerId: number
  name: string
  balance: number
  referralCount: number
  wasReferred: boolean
  referral: {
    code: string
    link: string
    botUsername: string | null
  } | null
  transactions: LoyaltyTransaction[]
}

export const loyaltyApi = {
  async getMetrics(): Promise<LoyaltyMetrics> {
    const { data } = await axiosInstance.get<LoyaltyMetrics>(
      "/v1/loyalty/metrics",
    )
    return data
  },

  async getCustomer(id: number): Promise<CustomerLoyalty> {
    const { data } = await axiosInstance.get<CustomerLoyalty>(
      `/v1/loyalty/customers/${id}`,
    )
    return data
  },

  async adjust(
    id: number,
    points: number,
    note?: string,
  ): Promise<CustomerLoyalty> {
    const { data } = await axiosInstance.post<CustomerLoyalty>(
      `/v1/loyalty/customers/${id}/adjust`,
      { points, note },
    )
    return data
  },
}

export default loyaltyApi
