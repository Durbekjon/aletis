"use client"

import { useRouter } from "next/navigation"
import { DynamicProductForm } from "@/src/components/DynamicProductForm"

export default function NewProductPage() {
  const router = useRouter()

  const handleSuccess = () => {
    router.push("/products")
  }

  const handleCancel = () => {
    router.push("/products")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add New Product</h1>
        <p className="text-muted-foreground">Create a new product using your organization's schema</p>
      </div>

      <DynamicProductForm onSuccess={handleSuccess} onCancel={handleCancel} />
    </div>
  )
}
