"use client"

import { useRouter } from "next/navigation"
import { useTranslation } from "@/src/context/I18nContext"
import { DynamicProductForm } from "@/src/components/DynamicProductForm"

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

      <DynamicProductForm onSuccess={handleSuccess} onCancel={handleCancel} />
    </div>
  )
}
