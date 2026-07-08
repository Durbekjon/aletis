"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { DynamicProductForm } from "@/src/components/DynamicProductForm"
import { useProductQuery, useUpdateProductMutation } from "@/src/hooks/useProductsQuery"
import type { FormData } from "@/src/hooks/useDynamicProductForm"
import { useTranslation } from "@/src/context/I18nContext"

export default function EditProductPage() {
  const { t } = useTranslation()
  const params = useParams()
  const router = useRouter()
  const idParam = params.id
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
      quantity: p.quantity,
      images: [], // we store IDs here; for previews we will pass URLs separately
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

    // Build changed fields only
    const changedPayload: Record<string, unknown> = {}

    if (data.name !== original.name) changedPayload.name = data.name
    if (data.price !== original.price) changedPayload.price = data.price
    if (data.quantity !== original.quantity) changedPayload.quantity = data.quantity
    if (data.status && data.status.toLowerCase() !== original.status.toUpperCase()) changedPayload.status = data.status.toUpperCase()
    // images are numeric IDs in payload; when editing we may not change images
    if (Array.isArray(data.images) && data.images.length > 0) {
      changedPayload.images = data.images
    }

    // Compute changed dynamic fields
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

    // If nothing changed, succeed silently
    if (Object.keys(changedPayload).length === 0) return true

    await updateMutation.mutateAsync({ id: productId, payload: changedPayload as any })
    return true
  }

  if (productQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-64" />
        <Separator />
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (productQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {t('products.failedToLoadProduct')}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('products.editProductTitle')}</h1>
        <p className="text-muted-foreground">{t('products.editProductSubtitle')}</p>
      </div>
      <Separator />
      <DynamicProductForm
        initialValues={initialValues}
        initialSchemaId={productQuery.data?.schemaId ?? null}
        existingImageUrls={existingImageUrls}
        onSubmitImpl={handleUpdate}
        onSuccess={() => router.push("/products")}
      />
    </div>
  )
}


