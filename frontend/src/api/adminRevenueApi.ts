import axiosInstance from "./client"

export interface RevenueSummary {
  mrrUsd: number
  arrUsd: number
  activeSubscriptions: number
  byTier: { tier: string; count: number; mrrUsd: number }[]
  byStatus: { status: string; count: number }[]
}

export interface PaymentTrendPoint {
  month: string
  currency: string
  amount: number
}

export interface InvoiceStatusBreakdown {
  status: string
  count: number
  totalUsd: number
}

export const adminRevenueApi = {
  async getSummary(): Promise<RevenueSummary> {
    const { data } = await axiosInstance.get<RevenueSummary>("/v1/admin/revenue/summary")
    return data
  },

  async getPaymentTrend(months = 6): Promise<PaymentTrendPoint[]> {
    const { data } = await axiosInstance.get<PaymentTrendPoint[]>("/v1/admin/revenue/payment-trend", {
      params: { months },
    })
    return data
  },

  async getInvoices(): Promise<InvoiceStatusBreakdown[]> {
    const { data } = await axiosInstance.get<InvoiceStatusBreakdown[]>("/v1/admin/revenue/invoices")
    return data
  },
}

export default adminRevenueApi
