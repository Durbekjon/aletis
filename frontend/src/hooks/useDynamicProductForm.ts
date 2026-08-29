import { useForm } from "react-hook-form"
import { useCreateProductMutation } from "./useProductsQuery"
import { toast } from "sonner"

export interface FormData {
  name: string
  barcode?: string
  price: number
  currency: "USD" | "EUR" | "UZS" | "RUB" | "KZT" | "GBP" | "JPY"
  quantity: number
  images: number[]
  categoryId?: number | null
  status: "ACTIVE" | "DRAFT" | "ARCHIVED"
  fields: Record<string, any>
  autoPublish: boolean
}

export function useDynamicProductForm(options?: {
  initialValues?: Partial<FormData>
  onSubmitImpl?: (data: FormData) => Promise<boolean>
}) {
  const createProductMutation = useCreateProductMutation()

  const form = useForm<FormData>({
    defaultValues: {
      name: options?.initialValues?.name ?? "",
      price: options?.initialValues?.price ?? 0,
      currency: options?.initialValues?.currency ?? "UZS",
      quantity: options?.initialValues?.quantity ?? 0,
      images: options?.initialValues?.images ?? [],
      categoryId: options?.initialValues?.categoryId ?? null,
      status: options?.initialValues?.status ?? "ACTIVE",
      fields: options?.initialValues?.fields ?? {},
      autoPublish: options?.initialValues?.autoPublish ?? true,
    },
    mode: "onChange",
  })

  const onSubmit = async (data: FormData) => {
    if (options?.onSubmitImpl) {
      return options.onSubmitImpl(data)
    }
    try {
      // Remove empty/undefined/null/"" fields for correct backend payload
      const itemSpecValues = Object.entries(data.fields ?? {})
        .filter(([_, value]) => value !== undefined && value !== null && value !== "")
        .map(([fieldId, value]) => {
          const base: Record<string, unknown> = { itemSpecId: Number(fieldId), value }
          return base as any;
        })

      const payload = {
        name: data.name,
        price: data.price,
        currency: data.currency,
        quantity: data.quantity,
        images: data.images,
        categoryId: data.categoryId ?? undefined,
        itemSpecValues,
        status: data.status.toUpperCase(),
        autoPublish: data.autoPublish,
      }

      await createProductMutation.mutateAsync(payload)
      toast.success("Product created successfully!")
      form.reset()
      return true
    } catch (error) {
      console.error('Form submission error:', error)
      toast.error("Failed to create product")
      return false
    }
  }

  return {
    form,
    onSubmit,
    isLoading: createProductMutation.isPending,
    error: createProductMutation.error,
  }
}