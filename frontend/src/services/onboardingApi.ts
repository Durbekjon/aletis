import axiosInstance from "@/src/api/client"

// DTOs
export type Organization = { id: number; name: string; description?: string; category?: string; createdAt: string }
export type CreateOrganizationDto = { name: string; description?: string }
export type UpdateCategoryDto = { category: string }

export type ProductSchema = { id: number; name: string; organizationId: number }
export type CreateSchemaDto = { name: string }

export type CreateSchemaFieldDto = { name: string; type: "TEXT" | "NUMBER" | "BOOLEAN" | "DATE" | "ENUM"; required: boolean; order: number; options?: string[] }
export type ReorderFieldsDto = { fields: { fieldId: number; order: number }[] }
export type SchemaField = {
  id: number
  name: string
  type: "TEXT" | "NUMBER" | "BOOLEAN" | "DATE" | "ENUM"
  required: boolean
  options?: string[]
}

export type UploadedFile = { id: number; key: string; originalName: string; mimeType: string; size: number }

export type CreateProductDto = { name: string; price: number; currency: "USD" | "EUR" | "UZS" | "RUB" | "KZT" | "GBP" | "JPY"; quantity: number; images: number[] }

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

  // Product Schema
  async createProductSchema(payload: CreateSchemaDto): Promise<ProductSchema> {
    const { data } = await axiosInstance.post<ProductSchema>("/v1/product-schema", payload)
    return data
  },
  async addSchemaFields(schemaId: number, payload: CreateSchemaFieldDto): Promise<unknown> {
    const { data } = await axiosInstance.post<unknown>(`/v1/product-schema/${schemaId}/fields`, payload)
    return data
  },
  async reorderSchemaFields(schemaId: number, payload: ReorderFieldsDto): Promise<unknown> {
    const { data } = await axiosInstance.patch<unknown>(`/v1/product-schema/${schemaId}/fields/reorder`, payload)
    return data
  },
  async getSchemaFields(schemaId: number): Promise<SchemaField[]> {
    const { data } = await axiosInstance.get<SchemaField[]>(`/v1/product-schema/${schemaId}/fields`)
    return data
  },
  async getProductSchema(): Promise<{ id: number; name: string; fields: SchemaField[] }> {
    const { data } = await axiosInstance.get<{ id: number; name: string; fields: SchemaField[] }>(`/v1/product-schema`)
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
  async createProduct(payload: CreateProductDto & { fields?: Array<Record<string, unknown>> }): Promise<unknown> {
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


