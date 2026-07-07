import axiosInstance from "./client"

export interface BarcodeCatalogData {
  productName?: string
  description?: string
  brandName?: string
  categoryName?: string
  unitName?: string
  mxikCode?: string
  imageUrl?: string
}

export interface BarcodeLookupResponse {
  found: boolean
  status: "PENDING" | "COMPLETED"
  source?: "SOLIQ" | "MANUAL"
  data?: BarcodeCatalogData
}

export interface CompleteBarcodeRequest {
  productName: string
  description?: string
  brandName?: string
  categoryName?: string
  unitName?: string
}

export const barcodeCatalogApi = {
  async getByBarcode(barcode: string): Promise<BarcodeLookupResponse> {
    const response = await axiosInstance.get(`/v1/barcode-catalog/${barcode}`)
    return response.data
  },

  async completeBarcode(barcode: string, payload: CompleteBarcodeRequest): Promise<BarcodeLookupResponse> {
    const response = await axiosInstance.patch(`/v1/barcode-catalog/${barcode}/complete`, payload)
    return response.data
  },
}

export default barcodeCatalogApi
