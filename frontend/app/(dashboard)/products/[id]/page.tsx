"use client"

import { useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { DynamicProductForm } from "@/src/components/DynamicProductForm"
import { useProductQuery, useUpdateProductMutation } from "@/src/hooks/useProductsQuery"
import type { FormData } from "@/src/hooks/useDynamicProductForm"
import { useTranslation } from "@/src/context/I18nContext"

export default function ProductDetailPage() {
  const { t } = useTranslation()
  const params = useParams()
  const router = useRouter()
  const idParam = Array.isArray(params?.id) ? params.id[0] : (params?.id as string)
  const productId = Number(idParam)

  const productQuery = useProductQuery(productId)
  const updateMutation = useUpdateProductMutation()

  const initialValues = useMemo<Partial<FormData> | undefined>(() => {
    if (!productQuery.data) return undefined
    const p = productQuery.data
    const fieldsRecord: Record<string, any> = {}
    ;(p.fields || []).forEach(f => {
      fieldsRecord[f.fieldId.toString()] = f.value
    })
    return {
      name: p.name,
      price: p.price,
      currency: p.currency,
      quantity: p.quantity,
      images: p.imageIds,
      status: p.status.toUpperCase() as "ACTIVE" | "DRAFT" | "ARCHIVED",
      fields: fieldsRecord,
    }
  }, [productQuery.data])

  const existingImageUrls = useMemo<string[]>(() => {
    if (!productQuery.data) return []
    return productQuery.data.images
  }, [productQuery.data])

  const handleUpdate = async (data: FormData): Promise<boolean> => {
    if (!productQuery.data) return false
    const original = productQuery.data
    const changedPayload: Record<string, unknown> = {}

    if (data.name !== original.name) changedPayload.name = data.name
    if (data.price !== original.price) changedPayload.price = data.price
    if (data.currency !== original.currency) changedPayload.currency = data.currency
    if (data.quantity !== original.quantity) changedPayload.quantity = data.quantity
    if (data.status && data.status.toUpperCase() !== original.status.toUpperCase()) changedPayload.status = data.status.toUpperCase()
    if (Array.isArray(data.images) && data.images.length > 0) changedPayload.images = data.images

    const originalFieldById = new Map((original.fields || []).map(f => [f.fieldId, f]))
    const changedFields: { fieldId: number; value: any }[] = []
    Object.entries(data.fields || {}).forEach(([fieldIdStr, newValue]) => {
      const fieldId = Number(fieldIdStr)
      const existing = originalFieldById.get(fieldId)
      const prevValue = existing?.value
      if (newValue !== prevValue) {
        changedFields.push({ fieldId, value: newValue })
      }
    })
    if (changedFields.length > 0) changedPayload.fields = changedFields

    if (Object.keys(changedPayload).length === 0) return true

    await updateMutation.mutateAsync({ id: productId, payload: changedPayload as any })
    return true
  }

  if (productQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
    )
  }

  if (productQuery.error || !productQuery.data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{t('products.failedToLoadProduct')}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link href="/products">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('products.backToProducts')}
          </Link>
        </Button>
      </div>

      <DynamicProductForm
        initialValues={initialValues}
        initialSchemaId={productQuery.data?.schemaId ?? null}
        existingImageUrls={existingImageUrls}
        onSubmitImpl={handleUpdate}
        onSuccess={() => router.push("/products")}
        hideSubmitUntilDirty
      />
    </div>
  )
}
