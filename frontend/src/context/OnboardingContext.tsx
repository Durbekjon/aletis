"use client"

import React, { createContext, useCallback, useContext, useMemo, useState } from "react"
import onboardingApi, {
  CreateBotDto,
  CreateOrganizationDto,
  CreateProductDto,
  CreateSchemaDto,
  CreateSchemaFieldDto,
  ReorderFieldsDto,
} from "@/src/services/onboardingApi"
import { getErrorMessage } from "@/src/api/client"

type OnboardingState = {
  organizationId?: number
  schemaId?: number
  botId?: number
}

type OnboardingContextValue = OnboardingState & {
  loading: boolean
  error: string | null
  createOrganization: (name: string, description?: string) => Promise<void>
  updateCategory: (category: string) => Promise<void>
  createSchema: (name: string) => Promise<void>
  createSchemaWithFields: (name: string, fields: CreateSchemaFieldDto[]) => Promise<void>
  addSchemaField: (field: CreateSchemaFieldDto) => Promise<void>
  reorderSchemaFields: (payload: ReorderFieldsDto) => Promise<void>
  uploadImagesAndCreateProduct: (
    name: string,
    price: number,
    currency: "USD" | "EUR" | "UZS" | "RUB" | "KZT" | "GBP" | "JPY",
    quantity: number,
    images: File[],
    dynamic?: Array<{ fieldId: number; type: string; value: unknown }>,
    preUploadedImageIds?: number[]
  ) => Promise<void>
  connectAndStartBot: (token: string) => Promise<void>
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OnboardingState>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createOrganization = useCallback(async (name: string, description?: string) => {
    setLoading(true)
    setError(null)
    try {
      const payload: CreateOrganizationDto = description?.trim() ? { name, description: description.trim() } : { name }
      const org = await onboardingApi.createOrganization(payload)
      setState((s) => ({ ...s, organizationId: org.id }))
    } catch (e) {
      setError(getErrorMessage(e, "Organization creation"))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const updateCategory = useCallback(async (category: string) => {
    if (!state.organizationId) throw new Error("Organization not created")
    setLoading(true)
    setError(null)
    try {
      await onboardingApi.updateOrganizationCategory(state.organizationId, { category })
    } catch (e) {
      setError(getErrorMessage(e, "Category update"))
      throw e
    } finally {
      setLoading(false)
    }
  }, [state.organizationId])

  const createSchema = useCallback(async (name: string) => {
    setLoading(true)
    setError(null)
    try {
      const schema = await onboardingApi.createProductSchema({ name } as CreateSchemaDto)
      setState((s) => ({ ...s, schemaId: schema.id }))
    } catch (e) {
      setError(getErrorMessage(e, "Schema creation"))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const createSchemaWithFields = useCallback(async (name: string, fields: CreateSchemaFieldDto[]) => {
    setLoading(true)
    setError(null)
    try {
      const schema = await onboardingApi.createProductSchema({ name } as CreateSchemaDto)
      setState((s) => ({ ...s, schemaId: schema.id }))
      for (const field of fields) {
        await onboardingApi.addSchemaFields(schema.id, field)
      }
    } catch (e) {
      setError(getErrorMessage(e, "Schema creation"))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const addSchemaField = useCallback(async (field: CreateSchemaFieldDto) => {
    if (!state.schemaId) throw new Error("Schema not created")
    setLoading(true)
    setError(null)
    try {
      await onboardingApi.addSchemaFields(state.schemaId, field)
    } catch (e) {
      setError(getErrorMessage(e, "Field creation"))
      throw e
    } finally {
      setLoading(false)
    }
  }, [state.schemaId])

  const reorderSchemaFields = useCallback(async (payload: ReorderFieldsDto) => {
    if (!state.schemaId) throw new Error("Schema not created")
    setLoading(true)
    setError(null)
    try {
      await onboardingApi.reorderSchemaFields(state.schemaId, payload)
    } catch (e) {
      setError(getErrorMessage(e, "Field reordering"))
      throw e
    } finally {
      setLoading(false)
    }
  }, [state.schemaId])

  const uploadImagesAndCreateProduct = useCallback(async (
    name: string,
    price: number,
    currency: "USD" | "EUR" | "UZS" | "RUB" | "KZT" | "GBP" | "JPY",
    quantity: number,
    images: File[],
    dynamic?: Array<{ fieldId: number; type: string; value: unknown }>,
    preUploadedImageIds?: number[]
  ) => {
    setLoading(true)
    setError(null)
    try {
      let uploadedIds: number[] = preUploadedImageIds ? [...preUploadedImageIds] : []
      for (const file of images) {
        const uploaded = await onboardingApi.uploadFile(file)
        uploadedIds.push(uploaded.id)
      }
      const fieldsPayload = (dynamic || []).map((d) => {
        const base: Record<string, unknown> = { fieldId: d.fieldId }
        switch (d.type) {
          case "TEXT":
            base.value = String(d.value ?? "")
            break
          case "NUMBER":
            base.value = Number(d.value ?? 0)
            break
          case "BOOLEAN":
            base.value = Boolean(d.value)
            break
          case "DATE":
            base.value = d.value as string
            break
          case "ENUM":
          case "SELECT":
            base.value = String(d.value ?? "")
            break
          case "FILE":
          case "IMAGE":
            base.value = d.value
            break
        }
        return base
      })
      await onboardingApi.createProduct({ name, price, currency, quantity, images: uploadedIds, fields: fieldsPayload } as CreateProductDto & { fields?: Array<Record<string, unknown>> })
    } catch (e) {
      setError(getErrorMessage(e, "Product creation"))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const connectAndStartBot = useCallback(async (token: string) => {
    setLoading(true)
    setError(null)
    try {
      const bot = await onboardingApi.createBot({ token } as CreateBotDto)
      setState((s) => ({ ...s, botId: bot.id }))
      await onboardingApi.startBot(bot.id)
    } catch (e) {
      setError(getErrorMessage(e, "Bot connection"))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const value = useMemo<OnboardingContextValue>(() => ({
    organizationId: state.organizationId,
    schemaId: state.schemaId,
    botId: state.botId,
    loading,
    error,
    createOrganization,
    updateCategory,
    createSchema,
    createSchemaWithFields,
    addSchemaField,
    reorderSchemaFields,
    uploadImagesAndCreateProduct,
    connectAndStartBot,
  }), [state.organizationId, state.schemaId, state.botId, loading, error, createOrganization, updateCategory, createSchema, createSchemaWithFields, addSchemaField, reorderSchemaFields, uploadImagesAndCreateProduct, connectAndStartBot])

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
}

export function useOnboardingContext() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error("useOnboardingContext must be used within OnboardingProvider")
  return ctx
}


