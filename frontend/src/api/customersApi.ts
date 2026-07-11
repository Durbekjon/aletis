import axiosInstance from "./client"
import type { BackendCustomer, BackendCustomerDetail, CustomerAiNote } from "@/lib/types/customer"

export interface CustomersQueryParams {
  page?: number
  limit?: number
  search?: string
  order?: "asc" | "desc"
}

export interface CustomersResponse {
  items: BackendCustomer[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export const customersApi = {
  async getCustomers(params: CustomersQueryParams = {}): Promise<CustomersResponse> {
    const { data } = await axiosInstance.get<CustomersResponse>("/v1/customers", { params })
    return data
  },

  async getCustomerById(id: number): Promise<BackendCustomerDetail> {
    const { data } = await axiosInstance.get<BackendCustomerDetail>(`/v1/customers/${id}`)
    return data
  },

  async analyzeCustomer(id: number): Promise<CustomerAiNote> {
    const { data } = await axiosInstance.post<CustomerAiNote>(`/v1/customers/${id}/analyze`)
    return data
  },

  async sendMessage(id: number, content: string) {
    const { data } = await axiosInstance.post(`/v1/customers/${id}/messages`, { content })
    return data
  },
}

export default customersApi
