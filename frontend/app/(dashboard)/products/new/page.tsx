"use client"

import { Suspense, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslation } from "@/src/context/I18nContext"
import { DynamicProductForm } from "@/src/components/DynamicProductForm"
import { useProductQuery } from "@/src/hooks/useProductsQuery"
import type { FormData } from "@/src/hooks/useDynamicProductForm"
import { Skeleton } from "@/components/ui/skeleton"

function Duplicator({ id, onSuccess, onCancel }: { id: number, onSuccess: () => void, onCancel: () => void }) {
  const productQuery = useProductQuery(id)

  const initialValues = useMemo<Partial<FormData> | undefined>(() => {
    if (!productQuery.data) return undefined
    const p = productQuery.data
    const fieldsRecord: Record<string, any> = {}
    ;(p.itemSpecValues || []).forEach(f => {
      fieldsRecord[f.fieldId?.toString() || f.id?.toString()] = f.value
    })
    return {
      name: `${p.name} (Copy)`,
      barcode: p.barcode,
      price: p.price,
      currency: p.currency,
      quantity: p.quantity,
      images: [], // Exclude images
      status: "DRAFT",
      fields: fieldsRecord,
    }
  }, [productQuery.data])

  if (productQuery.isLoading) {
    return <Skeleton className="h-[600px] w-full" />
  }

  return (
    <DynamicProductForm 
      initialValues={initialValues}
      initialCategoryId={productQuery.data?.categoryId ?? undefined}
      onSuccess={onSuccess} 
      onCancel={onCancel} 
    />
  )
}

function DuplicateProductWrapper({ onSuccess, onCancel }: { onSuccess: () => void, onCancel: () => void }) {
  const searchParams = useSearchParams()
  const duplicateFrom = searchParams.get("duplicateFrom")
  
  if (duplicateFrom) {
    return <Duplicator id={Number(duplicateFrom)} onSuccess={onSuccess} onCancel={onCancel} />
  }

  return <DynamicProductForm onSuccess={onSuccess} onCancel={onCancel} />
}

export default function NewProductPage() {
  const router = useRouter()
  const { t } = useTranslation()

  const handleSuccess = () => {
    router.push("/products")
  }

  const handleCancel = () => {
    router.push("/products")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('products.newTitle')}</h1>
        <p className="text-muted-foreground">{t('products.newDesc')}</p>
      </div>

      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <DuplicateProductWrapper onSuccess={handleSuccess} onCancel={handleCancel} />
      </Suspense>
    </div>
  )
}
