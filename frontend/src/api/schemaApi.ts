import axiosInstance from "./client"

export interface SchemaField {
  id: number
  name: string
  type: "TEXT" | "NUMBER" | "BOOLEAN" | "DATE" | "JSON" | "ENUM"
  required: boolean
  order: number
  options?: string[]
}

export interface ProductSchema {
  id: number
  name: string
  description?: string
  organizationId: number
  fields: SchemaField[]
  createdAt: string
  updatedAt: string
}

export interface CreateFieldDto {
  name: string
  type: "TEXT" | "NUMBER" | "BOOLEAN" | "DATE" | "JSON" | "ENUM"
  required: boolean
  order: number
  options?: string[]
}

export interface UpdateFieldDto {
  name?: string
  type?: "TEXT" | "NUMBER" | "BOOLEAN" | "DATE" | "JSON" | "ENUM"
  required?: boolean
  order?: number
  options?: string[]
}

export interface ReorderFieldsDto {
  fieldOrders: Array<{
    fieldId: number
    order: number
  }>
}

export const schemaApi = {
  async getSchema(): Promise<ProductSchema> {
    const { data } = await axiosInstance.get<ProductSchema>("/v1/product-schema")
    return data
  },

  async updateSchema(id: number, payload: { name?: string; description?: string }): Promise<ProductSchema> {
    const { data } = await axiosInstance.patch<ProductSchema>(`/v1/product-schema/${id}`, payload)
    return data
  },

  async addField(schemaId: number, payload: CreateFieldDto): Promise<SchemaField> {
    const { data } = await axiosInstance.post<SchemaField>(`/v1/product-schema/${schemaId}/fields`, payload)
    return data
  },

  async updateField(schemaId: number, fieldId: number, payload: UpdateFieldDto): Promise<SchemaField> {
    const { data } = await axiosInstance.patch<SchemaField>(`/v1/product-schema/${schemaId}/fields/${fieldId}`, payload)
    return data
  },

  async deleteField(schemaId: number, fieldId: number): Promise<void> {
    await axiosInstance.delete(`/v1/product-schema/${schemaId}/fields/${fieldId}`)
  },

  async reorderFields(schemaId: number, payload: ReorderFieldsDto): Promise<void> {
    await axiosInstance.patch(`/v1/product-schema/${schemaId}/fields/reorder`, payload)
  },
}

export default schemaApi

