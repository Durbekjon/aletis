import { useForm } from "react-hook-form"
import { useCreateProductMutation } from "./useProductsQuery"
import { toast } from "sonner"

export interface FormData {
  name: string
  price: number
  currency: "USD" | "EUR" | "UZS" | "RUB" | "KZT" | "GBP" | "JPY"
  quantity: number
  images: number[]
  status: "ACTIVE" | "DRAFT" | "ARCHIVED"
  fields: Record<string, any>
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
      status: options?.initialValues?.status ?? "DRAFT",
      fields: options?.initialValues?.fields ?? {},
    },
    mode: "onChange",
  })

  const onSubmit = async (data: FormData) => {
    if (options?.onSubmitImpl) {
      return options.onSubmitImpl(data)
    }
    try {
      // Remove empty/undefined/null/"" fields for correct backend payload
      const fields = Object.entries(data.fields ?? {})
        .filter(([_, value]) => value !== undefined && value !== null && value !== "")
        .map(([fieldId, value]) => ({
          fieldId: Number(fieldId),
          value,
        }))

      const payload = {
        name: data.name,
        price: data.price,
        currency: data.currency,
        quantity: data.quantity,
        images: data.images,
        fields,
        status: data.status.toUpperCase(),
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