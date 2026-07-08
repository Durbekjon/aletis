"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { OnboardingData } from "@/lib/types/onboarding"
import { ArrowRight, Upload, X, Eye } from "lucide-react"
import { useOnboarding } from "@/src/hooks/useOnboarding"
import { Alert, AlertDescription } from "@/components/ui/alert"
import onboardingApi, { SchemaField } from "@/src/services/onboardingApi"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/src/context/I18nContext"

interface FirstProductStepProps {
  data: OnboardingData
  onUpdate: (data: Partial<OnboardingData>) => void
  onNext: () => void
}

export function FirstProductStep({ data, onUpdate, onNext }: FirstProductStepProps) {
  const { t } = useTranslation()
  const [product, setProduct] = useState(data.firstProduct)
  const [dragOver, setDragOver] = useState(false)
  const { uploadImagesAndCreateProduct, loading, error } = useOnboarding()
  const [schemaFields, setSchemaFields] = useState<SchemaField[]>([])
  const [dynamicValues, setDynamicValues] = useState<Record<number, unknown>>({})
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploadedImageIds, setUploadedImageIds] = useState<number[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        // Fetch current organization schema (includes fields)
        const schema = await onboardingApi.getProductSchema()
        if (mounted && schema?.fields) setSchemaFields(schema.fields)
      } catch {
        // ignore; errors will be shown on submit if needed
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const handleNext = async () => {
    if (!product.name || product.price <= 0) return
    onUpdate({ firstProduct: product })
    try {
      const dynamicArray = schemaFields.map((f) => {
        const value = dynamicValues[f.id]
        return { fieldId: f.id, type: f.type, value }
      })
      await uploadImagesAndCreateProduct(
        product.name,
        product.price,
        product.currency || "USD",
        product.quantity || 0,
        [],
        dynamicArray,
        uploadedImageIds
      )
      toast({
        title: "Success!",
        description: "Product created successfully!",
      })
      onNext()
    } catch {
      // error via context
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setProduct((prev) => ({ ...prev, [field]: value }))
  }

  const handleImageUpload = async (files: FileList | null) => {
    if (files && product.images.length < 3) {
      const newFiles = Array.from(files).slice(0, 3 - product.images.length)
      // immediate upload-many
      try {
        setIsUploading(true)
        const uploaded = await onboardingApi.uploadManyFiles(newFiles)
        const ids = uploaded.map((u) => u.id)
        setUploadedFiles((prev) => [...prev, ...newFiles])
        // store preview and also keep ids in a shadow state by reusing images as previews
        const previews = newFiles.map((f) => URL.createObjectURL(f))
        setProduct((prev) => ({ ...prev, images: [...prev.images, ...previews] }))
        // we won't set ids into product.images to keep UI model unchanged; ids will be passed at submit via context API argument
        // However, we need to persist these ids for submit; reuse dynamicValues with special key -1 array? Better: local state
        // We'll store them alongside uploadedFiles via a ref array of ids
        setUploadedImageIds((prev) => [...prev, ...ids])
      } catch {
        // handled via context on submit
      } finally {
        setIsUploading(false)
      }
    }
  }

  const removeImage = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
    setProduct((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }))
  }

  const setDynamicFieldValue = (fieldId: number, type: SchemaField["type"], raw: any) => {
    let value: unknown = raw
    if (type === "NUMBER") value = Number(raw)
    if (type === "BOOLEAN") value = Boolean(raw)
    setDynamicValues((prev) => ({ ...prev, [fieldId]: value }))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    void handleImageUpload(e.dataTransfer.files)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="productName">{t("onboarding.product.nameLabel")} *</Label>
            <Input
              id="productName"
              value={product.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder={t("onboarding.product.namePlaceholder")}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">{t("onboarding.product.priceLabel")} *</Label>
              <Input
                id="price"
                type="number"
                value={product.price || ""}
                onChange={(e) => handleInputChange("price", Number(e.target.value))}
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">{t("onboarding.product.currencyLabel")} *</Label>
              <Select
                value={product.currency || "USD"}
                onValueChange={(value) => handleInputChange("currency", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="UZS">UZS - Uzbek Som</SelectItem>
                  <SelectItem value="RUB">RUB - Russian Ruble</SelectItem>
                  <SelectItem value="KZT">KZT - Kazakhstani Tenge</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">{t("onboarding.product.quantityLabel")}</Label>
              <Input
                id="quantity"
                type="number"
                value={product.quantity || ""}
                onChange={(e) => handleInputChange("quantity", Number(e.target.value))}
                placeholder="0"
                min="0"
              />
            </div>
          </div>

      {/* Dynamic Fields based on schema */}
      {schemaFields.length > 0 && (
        <div className="space-y-4">
          <Label>{t("onboarding.product.additionalFields")}</Label>
          {schemaFields.map((f) => (
            <div key={f.id} className="space-y-2">
              <Label>{f.name}{f.required ? " *" : ""}</Label>
              {f.type === "TEXT" && (
                <Input onChange={(e) => setDynamicFieldValue(f.id, f.type, e.target.value)} />
              )}
              {f.type === "NUMBER" && (
                <Input type="number" onChange={(e) => setDynamicFieldValue(f.id, f.type, e.target.value)} />
              )}
              {f.type === "BOOLEAN" && (
                <Input type="checkbox" onChange={(e) => setDynamicFieldValue(f.id, f.type, e.target.checked)} />
              )}
              {f.type === "DATE" && (
                <Input type="date" onChange={(e) => setDynamicFieldValue(f.id, f.type, e.target.value)} />
              )}
              {f.type === "ENUM" && (
                <select className="border rounded px-3 py-2" onChange={(e) => setDynamicFieldValue(f.id, f.type, e.target.value)}>
                  <option value="">Select...</option>
                  {(f.options || []).map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}
              {(f.type === "FILE" || f.type === "IMAGE") && (
                <input
                  type="file"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    try {
                      setIsUploading(true)
                      const uploaded = await onboardingApi.uploadManyFiles([file])
                      const fileId = uploaded?.[0]?.id
                      setDynamicFieldValue(f.id, f.type, fileId)
                    } finally {
                      setIsUploading(false)
                    }
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>{t("onboarding.product.images")}</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">{t("onboarding.product.dragDrop")}</p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files)}
                className="hidden"
                id="image-upload"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("image-upload")?.click()}
                disabled={product.images.length >= 3}
              >
                {t("onboarding.product.selectImages")}
              </Button>
            </div>

            {/* Image Preview */}
            {product.images.length > 0 && (
              <div className="flex gap-2 mt-2">
                {product.images.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={image || "/placeholder.svg"}
                      alt={`Product ${index + 1}`}
                      className="w-16 h-16 object-cover rounded border"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Product Preview */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <Label>{t("onboarding.product.preview")}</Label>
          </div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{product.name || "Product Name"}</CardTitle>
            </CardHeader>
            <CardContent>
              {product.images.length > 0 ? (
                <img
                  src={product.images[0] || "/placeholder.svg"}
                  alt="Product preview"
                  className="w-full h-48 object-cover rounded mb-3"
                />
              ) : (
                <div className="w-full h-48 bg-muted rounded mb-3 flex items-center justify-center">
                  <span className="text-muted-foreground">No image</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button
        onClick={handleNext}
        disabled={!product.name || product.price <= 0 || uploadedImageIds.length === 0 || loading || isUploading}
        className="w-full flex items-center gap-2"
      >
        {t("onboarding.continue")}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
