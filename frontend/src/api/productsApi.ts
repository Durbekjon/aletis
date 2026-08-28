import axiosInstance from "./client"
import type { BackendProduct, BackendCategory } from "@/lib/types/product"

export interface PaginationQuery {
  page?: number
  limit?: number
  search?: string
  status?: string
  categoryId?: number
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
  categoryId?: number
  itemSpecValues?: {
    itemSpecId: number
    value?: any
  }[]
  status?: string
  autoPublish?: boolean
}

export interface UpdateProductRequest {
  name?: string
  price?: number
  currency?: "USD" | "EUR" | "UZS" | "RUB" | "KZT" | "GBP" | "JPY"
  images?: number[]
  categoryId?: number
  itemSpecValues?: {
    itemSpecId: number
    value?: any
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

export const categoriesApi = {
  async getCategories(params?: { isRoot?: boolean; parentId?: number }): Promise<BackendCategory[]> {
    const response = await axiosInstance.get('/v1/categories', { params })
    return response.data
  },

  async getCategoryById(id: number): Promise<BackendCategory> {
    const response = await axiosInstance.get(`/v1/categories/${id}`)
    return response.data
  },
}

export default productsApi
