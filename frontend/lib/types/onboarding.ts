export interface OnboardingData {
  organizationName: string
  organizationDescription?: string
  botToken?: string
  category: string
  productSchema: ProductSchemaField[]
  firstProduct: {
    name: string
    price: number
    currency: "USD" | "EUR" | "UZS" | "RUB" | "KZT" | "GBP" | "JPY"
    quantity: number
    description: string
    images: string[]
  }
}

export type FieldType = "TEXT" | "NUMBER" | "BOOLEAN" | "DATE" | "ENUM"
export interface ProductSchemaField {
  id: string
  name: string
  type: FieldType
  required: boolean
  options?: string[]
}

export interface OnboardingStep {
  id: number
  title: string
  description: string
  isComplete: boolean
  isOptional?: boolean
}
