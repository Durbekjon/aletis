// Backend Types
export interface BackendProductImage {
  id: number
  key: string
  url: string
}

export interface BackendProductField {
  id: number
  fieldId: number
  fieldName: string
  fieldType: "TEXT" | "NUMBER" | "BOOLEAN" | "DATE" | "ENUM" | "JSON"
  valueText: string | null
  valueNumber: number | null
  valueBool: boolean | null
  valueDate: string | null
  valueJson: any | null
}

export interface BackendProduct {
  id: number
  name: string
  price: number
  currency: "USD" | "EUR" | "UZS" | "RUB" | "KZT" | "GBP" | "JPY"
  schemaId: number
  schemaName: string
  organizationId: number
  images: BackendProductImage[]
  fields: BackendProductField[]
  createdAt: string
  updatedAt: string
  quantity: number
  status?: "ACTIVE" | "DRAFT" | "ARCHIVED"
}

export interface BackendProductSchema {
  id: number
  name: string
  organizationId: number
  fields: BackendProductSchemaField[]
  createdAt?: string
  updatedAt?: string
}

export interface BackendProductSchemaField {
  id: number
  schemaId: number
  name: string
  type: "TEXT" | "NUMBER" | "BOOLEAN" | "DATE" | "ENUM" | "JSON"
  required: boolean
  order: number
  options: string[]
}

// Frontend Types
export interface ProductVariant {
  id: string
  name: string
  value: string
  price?: number
  quantity?: number
}

export interface Product {
  quantity: number
  id: string
  name: string
  description: string
  price: number
  currency: "USD" | "EUR" | "UZS" | "RUB" | "KZT" | "GBP" | "JPY"
  compareAtPrice?: number
  cost?: number
  sku?: string
  barcode?: string
  lowStockThreshold: number
  trackQuantity: boolean
  tags: string[]
  images: string[]
  imageIds?: number[]
  variants: ProductVariant[]
  status: "ACTIVE" | "DRAFT" | "ARCHIVED"
  createdAt: Date
  updatedAt: Date
  // Additional fields from backend
  schemaId?: number
  schemaName?: string
  organizationId?: number
  fields?: ProductField[]
}

export interface ProductField {
  id: number
  fieldId: number
  fieldName: string
  fieldType: "TEXT" | "NUMBER" | "BOOLEAN" | "DATE" | "ENUM" | "JSON"
  value: string | number | boolean | Date | any
}

export interface ProductSchema {
  id: number
  name: string
  organizationId: number
  fields: ProductSchemaField[]
  createdAt: Date
  updatedAt: Date
}

export interface ProductSchemaField {
  id: number
  name: string
  type: "TEXT" | "NUMBER" | "BOOLEAN" | "DATE" | "ENUM" | "JSON"
  required: boolean
  options?: string[]
  order?: number
}

export interface ProductFormData {
  name: string
  description: string
  price: number
  currency: "USD" | "EUR" | "UZS" | "RUB" | "KZT" | "GBP" | "JPY"
  compareAtPrice?: number
  cost?: number
  sku?: string
  barcode?: string
  stock: number
  lowStockThreshold: number
  trackQuantity: boolean
  tags: string[]
  images: string[]
  variants: ProductVariant[]
  status: "active" | "draft" | "archived"
  schemaId?: number
  fields?: ProductField[]
}

// Mapping functions
export function mapBackendProductToFrontend(backendProduct: BackendProduct): Product {
  return {
    id: backendProduct.id.toString(),
    name: backendProduct.name,
    description: "", // Not provided in backend response
    price: backendProduct.price,
    currency: backendProduct.currency,
    quantity: backendProduct.quantity, // Not provided in backend response
    lowStockThreshold: 5, // Default value
    trackQuantity: false, // Default value
    tags: [], // Not provided in backend response
    images: backendProduct.images.map(img => img.url),
    imageIds: backendProduct.images.map(img => img.id),
    variants: [], // Not provided in backend response
    status: backendProduct.status || "DRAFT",
    createdAt: new Date(backendProduct.createdAt),
    updatedAt: new Date(backendProduct.updatedAt),
    schemaId: backendProduct.schemaId,
    schemaName: backendProduct.schemaName,
    organizationId: backendProduct.organizationId,
    fields: backendProduct.fields.map(field => ({
      id: field.id,
      fieldId: field.fieldId,
      fieldName: field.fieldName,
      fieldType: field.fieldType,
      value: field.valueText || field.valueNumber || field.valueBool || field.valueDate || field.valueJson
    }))
  }
}

export function mapBackendProductSchemaToFrontend(backendSchema: BackendProductSchema): ProductSchema {
  return {
    id: backendSchema.id,
    name: backendSchema.name,
    organizationId: backendSchema.organizationId,
    fields: backendSchema.fields
      .sort((a, b) => a.order - b.order) // Sort by order
      .map(field => ({
        id: field.id,
        name: field.name,
        type: field.type,
        required: field.required,
        options: field.options,
        order: field.order
      })),
    createdAt: backendSchema.createdAt ? new Date(backendSchema.createdAt) : new Date(),
    updatedAt: backendSchema.updatedAt ? new Date(backendSchema.updatedAt) : new Date()
  }
}
