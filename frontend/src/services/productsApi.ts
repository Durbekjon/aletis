import axiosInstance from "@/src/api/client"

// Types
export type ProductField = {
  fieldId: number
  fieldName: string
  value?: string | number | boolean | Date | object
}

export type Product = {
  id: number
  name: string
  price: number
  quantity: number
  organizationId: number
  images: Array<{ id: number; key: string }>
  fields: ProductField[]
  createdAt: string
  updatedAt: string
}

export type ProductSchema = {
  id: number
  name: string
  fields: Array<{
    id: number
    name: string
    type: "TEXT" | "NUMBER" | "BOOLEAN" | "DATE" | "ENUM" | "SELECT" | "FILE" | "IMAGE"
    required: boolean
    options?: string[]
  }>
}

export type ProductsResponse = {
  items: Product[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export type ProductsQuery = {
  page?: number
  limit?: number
  search?: string
  order?: string
}

const productsApi = {
  async getProducts(query: ProductsQuery = {}): Promise<ProductsResponse> {
    const params = new URLSearchParams()
    if (query.page) params.append("page", query.page.toString())
    if (query.limit) params.append("limit", query.limit.toString())
    if (query.search) params.append("search", query.search)
    if (query.order) params.append("order", query.order)

    const { data } = await axiosInstance.get<ProductsResponse>(`/v1/products?${params.toString()}`)
    return data
  },

  async getProductSchema(): Promise<ProductSchema> {
    const { data } = await axiosInstance.get<ProductSchema>("/v1/product-schema")
    return data
  },

  async getProduct(id: number): Promise<Product> {
    const { data } = await axiosInstance.get<Product>(`/v1/products/${id}`)
    return data
  },

  async createProduct(payload: {
    name: string
    price: number
    quantity: number
    images: number[]
    fields?: Array<Record<string, unknown>>
  }): Promise<Product> {
    const { data } = await axiosInstance.post<Product>("/v1/products", payload)
    return data
  },

  async updateProduct(id: number, payload: Partial<Product>): Promise<Product> {
    const { data } = await axiosInstance.patch<Product>(`/v1/products/${id}`, payload)
    return data
  },

  async deleteProduct(id: number): Promise<void> {
    await axiosInstance.delete(`/v1/products/${id}`)
  },
}

export default productsApi
