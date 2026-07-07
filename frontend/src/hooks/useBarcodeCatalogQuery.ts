import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import barcodeCatalogApi, { type BarcodeLookupResponse, type CompleteBarcodeRequest } from "@/src/api/barcodeCatalogApi"

export function useBarcodeLookupMutation() {
  return useMutation<BarcodeLookupResponse, any, string>({
    mutationFn: (barcode: string) => barcodeCatalogApi.getByBarcode(barcode),
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Barcode qidirishda xatolik yuz berdi")
    },
  })
}

export function useCompleteBarcodeMutation() {
  return useMutation<BarcodeLookupResponse, any, { barcode: string; payload: CompleteBarcodeRequest }>({
    mutationFn: ({ barcode, payload }) => barcodeCatalogApi.completeBarcode(barcode, payload),
  })
}
