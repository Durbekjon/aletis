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
}

export interface UpdateOrganizationDto {
  name?: string
  description?: string
  category?: Organization["category"]
  logoId?: number | null
}

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

export default organizationApi

