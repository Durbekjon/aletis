import axiosInstance from "./client"

export type PaymentProvider = "PAYME" | "CLICK"

export interface PaymentLink {
  url: string
  transactionId: number
}

export const paymentsApi = {
  async createOrderLink(
    orderId: number,
    provider: PaymentProvider,
  ): Promise<PaymentLink> {
    const { data } = await axiosInstance.post<PaymentLink>(
      `/v1/payments/order/${orderId}/link`,
      { provider },
    )
    return data
  },
}

export default paymentsApi
