"use client"

import React, { createContext, useCallback, useContext, useMemo, useState } from "react"
import onboardingApi, {
  CreateBotDto,
  CreateOrganizationDto,
  CreateProductDto,
} from "@/src/services/onboardingApi"
import { getErrorMessage } from "@/src/api/client"
import authApi from "@/src/api/authApi"
import { organizationApi } from "@/src/api/organizationApi"

type OnboardingState = {
  organizationId?: number
  schemaId?: number
  botId?: number
}

type OnboardingContextValue = OnboardingState & {
  loading: boolean
  error: string | null
  setOrganizationId: (id: number) => void
  createOrganization: (name: string, description?: string) => Promise<void>
  updateCategory: (categoryIds: number[]) => Promise<void>
  uploadImagesAndCreateProduct: (
    name: string,
    price: number,
    currency: "USD" | "EUR" | "UZS" | "RUB" | "KZT" | "GBP" | "JPY",
    quantity: number,
    images: File[],
    dynamic?: Array<{ itemSpecId: number; type: string; value: unknown }>,
    preUploadedImageIds?: number[]
  ) => Promise<void>
  connectAndStartBot: (token: string) => Promise<void>
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OnboardingState>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setOrganizationId = useCallback((id: number) => {
    setState((s) => ({ ...s, organizationId: id }))
  }, [])

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

  const ensureOrganizationId = async () => {
    if (state.organizationId) return state.organizationId
    try {
      const org = await organizationApi.getOrganization()
      if (org && org.id) {
        setState((s) => ({ ...s, organizationId: org.id }))
        return org.id
      }
    } catch (e) {
      // ignore
    }
    throw new Error("Organization not created")
  }

  const updateCategory = useCallback(async (categoryIds: number[]) => {
    setLoading(true)
    setError(null)
    try {
      const orgId = await ensureOrganizationId()
      await onboardingApi.updateOrganizationCategory(orgId, { categoryIds })
    } catch (e) {
      setError(getErrorMessage(e, "Category update"))
      throw e
    } finally {
      setLoading(false)
    }
  }, [state.organizationId])

  const uploadImagesAndCreateProduct = useCallback(async (
    name: string,
    price: number,
    currency: "USD" | "EUR" | "UZS" | "RUB" | "KZT" | "GBP" | "JPY",
    quantity: number,
    images: File[],
    dynamic?: Array<{ itemSpecId: number; type: string; value: unknown }>,
    preUploadedImageIds?: number[]
  ) => {
    setLoading(true)
    setError(null)
    try {
      const orgId = await ensureOrganizationId()
      let uploadedIds: number[] = preUploadedImageIds ? [...preUploadedImageIds] : []
      for (const file of images) {
        const uploaded = await onboardingApi.uploadFile(file)
        uploadedIds.push(uploaded.id)
      }
      const itemSpecValuesPayload = (dynamic || []).map((d) => {
        const base: Record<string, unknown> = { itemSpecId: d.itemSpecId }
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
          default:
            base.value = d.value
        }
        return base
      })

      const productPayload: CreateProductDto = {
        name,
        price,
        currency,
        quantity,
        images: uploadedIds,
        itemSpecValues: itemSpecValuesPayload as any,
      }
      await onboardingApi.createProduct(productPayload)
    } catch (e) {
      setError(getErrorMessage(e, "Product creation"))
      throw e
    } finally {
      setLoading(false)
    }
  }, [state.organizationId])

  const connectAndStartBot = useCallback(async (token: string) => {
    setLoading(true)
    setError(null)
    try {
      const orgId = await ensureOrganizationId()
      const bot = await onboardingApi.createBot({ token } as CreateBotDto)
      setState((s) => ({ ...s, botId: bot.id }))
      await onboardingApi.startBot(bot.id)
    } catch (e) {
      setError(getErrorMessage(e, "Bot connection"))
      throw e
    } finally {
      setLoading(false)
    }
  }, [state.organizationId])

  const value = useMemo<OnboardingContextValue>(() => ({
    organizationId: state.organizationId,
    schemaId: state.schemaId,
    botId: state.botId,
    loading,
    error,
    setOrganizationId,
    createOrganization,
    updateCategory,
    uploadImagesAndCreateProduct,
    connectAndStartBot,
  }), [state.organizationId, state.schemaId, state.botId, loading, error, setOrganizationId, createOrganization, updateCategory, uploadImagesAndCreateProduct, connectAndStartBot])

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
}

export function useOnboardingContext() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error("useOnboardingContext must be used within OnboardingProvider")
  return ctx
}


