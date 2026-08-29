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

export interface BackendCategory {
  id: number
  name_uz: string
  name_ru: string
  name_en: string
  isLeaf?: boolean
  parentId?: number | null
  itemSpecs?: BackendItemSpec[]
}

export interface BackendItemSpec {
  id: number
  name: string
  type: "TEXT" | "NUMBER" | "BOOLEAN" | "DATE" | "ENUM" | "JSON"
  required: boolean
  options?: string[]
}

export interface BackendProduct {
  id: number
  name: string
  barcode?: string
  price: number
  currency: "USD" | "EUR" | "UZS" | "RUB" | "KZT" | "GBP" | "JPY"
  categoryId: number | null
  category: BackendCategory | null
  organizationId: number
  images: BackendProductImage[]
  itemSpecValues: BackendProductField[]
  createdAt: string
  updatedAt: string
  quantity: number
  status?: "ACTIVE" | "DRAFT" | "ARCHIVED"
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
  
  categoryId?: number | null
  category?: BackendCategory | null
  organizationId?: number
  itemSpecValues?: ProductField[]
}

export interface ProductField {
  id: number
  fieldId: number
  fieldName: string
  fieldType: "TEXT" | "NUMBER" | "BOOLEAN" | "DATE" | "ENUM" | "JSON"
  value: string | number | boolean | Date | any
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
  categoryId?: number | null
  itemSpecValues?: ProductField[]
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
    categoryId: backendProduct.categoryId,
    category: backendProduct.category,
    organizationId: backendProduct.organizationId,
    itemSpecValues: backendProduct.itemSpecValues ? backendProduct.itemSpecValues.map(field => ({
      id: field.id,
      fieldId: field.fieldId,
      fieldName: field.fieldName,
      fieldType: field.fieldType,
      value: field.valueText || field.valueNumber || field.valueBool || field.valueDate || field.valueJson
    })) : []
  }
}
