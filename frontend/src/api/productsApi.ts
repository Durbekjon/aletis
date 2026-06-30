import axiosInstance from "./client"
import type { BackendProduct, BackendProductSchema } from "@/lib/types/product"

export interface PaginationQuery {
  page?: number
  limit?: number
  search?: string
  status?: string
  schemaId?: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface CreateProductRequest {
  name: string
  price: number
  currency: "USD" | "EUR" | "UZS" | "RUB" | "KZT" | "GBP" | "JPY"
  images: number[]
  fields: {
    fieldId: number
    value: string | number | boolean | Date | any
  }[]
}

export interface UpdateProductRequest {
  name?: string
  price?: number
  currency?: "USD" | "EUR" | "UZS" | "RUB" | "KZT" | "GBP" | "JPY"
  images?: number[]
  fields?: {
    fieldId: number
    value: string | number | boolean | Date | any
  }[]
  status?: "ACTIVE" | "DRAFT" | "ARCHIVED"
  quantity?: number
}

export interface ImportProductsResult {
  imported: number;
  skipped: number;
  createdFields: string[];
  errors: { row: number; message: string }[];
}

export const productsApi = {
  async getProducts(params?: PaginationQuery): Promise<PaginatedResponse<BackendProduct>> {
    const response = await axiosInstance.get('/v1/products', { params })
    return response.data
  },

  async getProductById(id: number): Promise<BackendProduct> {
    const response = await axiosInstance.get(`/v1/products/${id}`)
    return response.data
  },

  async createProduct(payload: CreateProductRequest): Promise<BackendProduct> {
    const response = await axiosInstance.post('/v1/products', payload)
    return response.data
  },

  async updateProduct(id: number, payload: UpdateProductRequest): Promise<BackendProduct> {
    const response = await axiosInstance.patch(`/v1/products/${id}`, payload)
    return response.data
  },

  async deleteProduct(id: number): Promise<void> {
    await axiosInstance.delete(`/v1/products/${id}`)
  },

  async bulkDeleteProducts(productIds: number[]): Promise<void> {
    await axiosInstance.delete('/v1/products', {
      data: { ids: productIds }
    })
  },

  async importProducts(file: File): Promise<ImportProductsResult> {
    const form = new FormData();
    form.append('file', file);
    const response = await axiosInstance.post('/v1/products/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
}

export const productSchemasApi = {
  async getProductSchemas(): Promise<BackendProductSchema[]> {
    const response = await axiosInstance.get('/v1/product-schema')
    return response.data
  },

  async getProductSchemaById(id: number): Promise<BackendProductSchema> {
    const response = await axiosInstance.get(`/v1/product-schema/${id}`)
    return response.data
  },

  async createProductSchema(payload: {
    name: string
    fields: {
      name: string
      type: "TEXT" | "NUMBER" | "BOOLEAN" | "DATE" | "JSON"
      required: boolean
      options?: string[]
    }[]
  }): Promise<BackendProductSchema> {
    const response = await axiosInstance.post('/v1/product-schema', payload)
    return response.data
  },

  async updateProductSchema(id: number, payload: {
    name?: string
    fields?: {
      name: string
      type: "TEXT" | "NUMBER" | "BOOLEAN" | "DATE" | "JSON"
      required: boolean
      options?: string[]
    }[]
  }): Promise<BackendProductSchema> {
    const response = await axiosInstance.patch(`/v1/product-schema/${id}`, payload)
    return response.data
  },

  async deleteProductSchema(id: number): Promise<void> {
    await axiosInstance.delete(`/v1/product-schema/${id}`)
  }
}

export default productsApi
