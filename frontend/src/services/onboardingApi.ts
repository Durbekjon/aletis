import axiosInstance from "@/src/api/client"
import { BackendCategory } from "@/lib/types/product"

// DTOs
export type Organization = { id: number; name: string; description?: string; categoryId?: number; createdAt: string }
export type CreateOrganizationDto = { name: string; description?: string }
export interface UpdateCategoryDto {
  categoryIds?: number[]
}

export type UploadedFile = { id: number; key: string; url: string; originalName: string; mimeType: string; size: number }

export type CreateProductDto = { name: string; price: number; currency: "USD" | "EUR" | "UZS" | "RUB" | "KZT" | "GBP" | "JPY"; quantity: number; images: number[]; categoryId?: number; itemSpecValues?: Array<{ itemSpecId: number, value?: any }> }

export type Bot = { id: number; token: string }
export type CreateBotDto = { token: string }
export type StartBotResponse = { isOK: boolean; message: string }

const onboardingApi = {
  // Organization
  async createOrganization(payload: CreateOrganizationDto): Promise<Organization> {
    const { data } = await axiosInstance.post<Organization>("/v1/organizations", payload)
    return data
  },
  async updateOrganizationCategory(organizationId: number, payload: UpdateCategoryDto): Promise<Organization> {
    const { data } = await axiosInstance.patch<Organization>(`/v1/organizations/${organizationId}`, payload)
    return data
  },

  // Categories
  async getCategories(isRoot?: boolean): Promise<BackendCategory[]> {
    const params = isRoot !== undefined ? { isRoot } : {}
    const { data } = await axiosInstance.get<BackendCategory[]>("/v1/categories", { params })
    return data
  },

  // Files
  async uploadFile(file: File): Promise<UploadedFile> {
    const form = new FormData()
    form.append("file", file)
    const { data } = await axiosInstance.post<UploadedFile>("/v1/files", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return data
  },
  async uploadManyFiles(files: File[]): Promise<UploadedFile[]> {
    const form = new FormData()
    for (const f of files) form.append("files", f)
    const { data } = await axiosInstance.post<UploadedFile[]>("/v1/files/upload-many", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return data
  },

  // Products
  async createProduct(payload: CreateProductDto): Promise<unknown> {
    const { data } = await axiosInstance.post<unknown>("/v1/products", payload)
    return data
  },

  // Bot
  async createBot(payload: CreateBotDto): Promise<Bot> {
    const { data } = await axiosInstance.post<Bot>("/v1/bots", payload)
    return data
  },
  async startBot(botId: number): Promise<StartBotResponse> {
    const { data } = await axiosInstance.post<StartBotResponse>(`/v1/bots/${botId}/start`)
    return data
  },
}

export default onboardingApi
