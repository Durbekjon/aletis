import { BackendCategory } from "./product"

export interface OnboardingData {
  organizationName: string
  organizationDescription?: string
  botToken?: string
  categoryIds?: number[]
  categories?: BackendCategory[]
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

export interface OnboardingStep {
  id: number
  title: string
  description: string
  isComplete: boolean
  isOptional?: boolean
}
