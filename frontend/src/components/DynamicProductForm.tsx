"use client"

/**
 * DynamicProductForm - A form component that dynamically generates fields based on product schema
 * 
 * Features:
 * - Fetches product schema from backend on component mount
 * - Renders form fields dynamically based on schema field types:
 *   - TEXT → Text input
 *   - NUMBER → Number input  
 *   - BOOLEAN → Switch/checkbox
 *   - DATE → Date input
 *   - JSON → Textarea for JSON data
 * - Validates required fields automatically
 * - Handles form submission with proper API integration
 * - Shows loading states and error handling
 * - Supports multiple schemas with schema selection
 */

import { useState, useEffect, useRef } from "react"
import { useTranslation } from "@/src/context/I18nContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { X, Upload, Loader2, AlertCircle, ScanBarcode, Camera } from "lucide-react"
import { useCategoriesQuery, useCategoryQuery } from "@/src/hooks/useCategoriesQuery"
import { useDynamicProductForm, type FormData } from "@/src/hooks/useDynamicProductForm"
import { useUploadManyFilesMutation, useDeleteFileByKeyMutation } from "@/src/hooks/useFilesQuery"
import { useCompleteBarcodeMutation } from "@/src/hooks/useBarcodeCatalogQuery"
import { useChannelsQuery } from "@/src/hooks/useChannelsQuery"
import { useOrganizationQuery } from "@/src/hooks/useOrganization"
import { CategoryTreeSelect } from "@/components/ui/category-tree-select"
import { findMatchingField } from "@/src/lib/barcode-field-matching"
import { BarcodeScanDialog, type BarcodeScanResolution } from "@/components/product/barcode-scan-dialog"
import { CameraCaptureDialog } from "@/components/product/camera-capture-dialog"
import type { BackendItemSpec, BackendCategory } from "@/lib/types/product"

interface DynamicProductFormProps {
  initialValues?: Partial<FormData>
  initialCategoryId?: number | null
  onSubmitImpl?: (data: FormData) => Promise<boolean>
  existingImageUrls?: string[]
  onSuccess?: () => void
  onCancel?: () => void
  hideSubmitUntilDirty?: boolean
  isEditMode?: boolean
}

export function DynamicProductForm({ initialValues, initialCategoryId, onSubmitImpl, existingImageUrls, onSuccess, onCancel, hideSubmitUntilDirty, isEditMode }: DynamicProductFormProps) {
  const { t, language } = useTranslation()
  const { form, onSubmit, isLoading: formLoading } = useDynamicProductForm({ initialValues, onSubmitImpl })
  const uploadFilesMutation = useUploadManyFilesMutation()
  const deleteFileByKeyMutation = useDeleteFileByKeyMutation()
  const { data: channelsData } = useChannelsQuery()
  const hasConnectedChannel = channelsData?.items.some((c) => c.isConnected) ?? false
  const { data: organization } = useOrganizationQuery()
  
  // Maintain numeric image IDs in form while previewing keys/URLs
  const [images, setImages] = useState<number[]>(initialValues?.images ?? [])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [uploadedImages, setUploadedImages] = useState<any[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(initialCategoryId ?? initialValues?.categoryId ?? null)
  const [scanDialogOpen, setScanDialogOpen] = useState(false)
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null)
  const completeBarcodeMutation = useCompleteBarcodeMutation()
  const didPrefillRef = useRef(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form

  const watchedStatus = watch("status")
  const watchedAutoPublish = watch("autoPublish")

  // We only fetch the specific category to populate fields
  const { data: categoryData, isLoading: schemaLoading, error: schemaError } = useCategoryQuery(selectedCategoryId)

  const currentCategory = categoryData;

  // Set default category when available
  useEffect(() => {
    if (!selectedCategoryId && initialCategoryId) {
      setSelectedCategoryId(initialCategoryId)
    }
  }, [selectedCategoryId, initialCategoryId])

  useEffect(() => {
    if (currentCategory && currentCategory.itemSpecs && !didPrefillRef.current) {
      const initialFields: Record<string, any> = {}
      currentCategory.itemSpecs.forEach(field => {
        // Set appropriate default values based on field type
        switch (field.type) {
          case "NUMBER":
            initialFields[field.id.toString()] = 0
            break
          case "BOOLEAN":
            initialFields[field.id.toString()] = false
            break
          default:
            initialFields[field.id.toString()] = ''
        }
        
      })
      // Overlay with provided initial values for edit mode
      const provided = initialValues?.fields ?? {}
      Object.entries(provided).forEach(([fid, val]) => {
        initialFields[fid] = val
      })
      setValue('fields', initialFields)
    }
    
  }, [currentCategory, setValue, initialValues?.fields])
  
  // Initialize provided initial base fields
  useEffect(() => {
    if (initialValues && !didPrefillRef.current) {
      const nextFields = ((): Record<string, any> => {
        const record: Record<string, any> = {}
        const provided = initialValues.fields ?? {}
        Object.entries(provided).forEach(([fid, val]) => {
          record[fid] = val
        })
        return record
      })()
      // Reset entire form state to ensure inputs get populated
      form.reset({
        name: initialValues.name ?? "",
        price: initialValues.price ?? '',
        currency: initialValues.currency ?? "UZS",
        quantity: initialValues.quantity ?? '',
        images: initialValues.images ?? [],
        fields: nextFields,
        status: initialValues.status?.toUpperCase() as "ACTIVE" | "DRAFT" | "ARCHIVED" ?? "ACTIVE",
      } as any)
      didPrefillRef.current = true
    }
  }, [initialValues, form])
  
  // Initialize provided initial images
  useEffect(() => {
    if (initialValues?.images) {
      setImages(initialValues.images)
      setValue('images', initialValues.images)
    }
  }, [initialValues?.images, setValue])
  const isLoading = schemaLoading || formLoading


  // Cleanup image URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      imageFiles.forEach(file => {
        URL.revokeObjectURL(URL.createObjectURL(file))
      })
    }
  }, [imageFiles])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    try {
      // Upload files to API
      const uploadResult = await uploadFilesMutation.mutateAsync(files)
      
      // Get the uploaded file IDs
      const newImageIds = uploadResult.map(file => file.id)
      const updatedImages = [...images, ...newImageIds]
      setImages(updatedImages)
      setValue("images", updatedImages, { shouldDirty: true })
      
      // Store file objects for preview
      setImageFiles(prev => [...prev, ...files])
      
      // Store uploaded image data for display
      setUploadedImages(prev => [...prev, ...uploadResult])
      
    } catch (error) {
      console.error('Failed to upload files:', error)
      // Still store files for preview even if upload fails
      setImageFiles(prev => [...prev, ...files])
    }
  }

  const handleCameraCapture = async (file: File) => {
    try {
      const uploadResult = await uploadFilesMutation.mutateAsync([file])
      const newImageIds = uploadResult.map((f) => f.id)
      const updatedImages = [...images, ...newImageIds]
      setImages(updatedImages)
      setValue("images", updatedImages, { shouldDirty: true })
      setImageFiles((prev) => [...prev, file])
      setUploadedImages((prev) => [...prev, ...uploadResult])
    } catch (error) {
      console.error("Failed to upload camera photo:", error)
      setImageFiles((prev) => [...prev, file])
    }
  }

  const removeImage = async (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    const newImageFiles = imageFiles.filter((_, i) => i !== index)
    const newUploadedImages = uploadedImages.filter((_, i) => i !== index)
    // If removing existing server image, call delete by key
    const existingKey = existingImageUrls && existingImageUrls[index]
    if (existingKey) {
      try {
        await deleteFileByKeyMutation.mutateAsync(existingKey)
      } catch (e) {
        // swallow - UI state will still update; backend error is toasted by hook
      }
    }
    setImages(newImages)
    setImageFiles(newImageFiles)
    setUploadedImages(newUploadedImages)
    setValue("images", newImages, { shouldDirty: true })
  }

  const handleBarcodeResolved = (resolution: BarcodeScanResolution) => {
    if (resolution.status === "COMPLETED" && resolution.data) {
      const { productName, description, brandName, categoryName, unitName } = resolution.data
      if (productName) {
        setValue("name", productName, { shouldDirty: true })
      }
      if (currentCategory && currentCategory.itemSpecs) {
        const matches: Array<[string | undefined, "description" | "brandName" | "categoryName" | "unitName"]> = [
          [description, "description"],
          [brandName, "brandName"],
          [categoryName, "categoryName"],
          [unitName, "unitName"],
        ]
        matches.forEach(([value, attr]) => {
          if (!value) return
          const field = findMatchingField(currentCategory.itemSpecs as any, attr)
          if (field) {
            setValue(`fields.${field.id}`, value, { shouldDirty: true })
          }
        })
      }
    } else {
      setPendingBarcode(resolution.barcode)
    }
  }

  const handleFormSubmit = async (data: any) => {
    // Inject barcode into payload
    if (pendingBarcode) {
      data.barcode = pendingBarcode
    } else if (initialValues?.barcode) {
      data.barcode = initialValues.barcode
    }

    const success = await onSubmit(data)
    if (success) {
      if (pendingBarcode) {
        const findValue = (attr: "description" | "brandName" | "categoryName" | "unitName") => {
          const field = currentCategory && currentCategory.itemSpecs && findMatchingField(currentCategory.itemSpecs as any, attr)
          return field ? data.fields?.[field.id] : undefined
        }
        completeBarcodeMutation
          .mutateAsync({
            barcode: pendingBarcode,
            payload: {
              productName: data.name,
              description: findValue("description"),
              brandName: findValue("brandName"),
              categoryName: findValue("categoryName"),
              unitName: findValue("unitName"),
            },
          })
          .catch((error) => {
            console.error("Failed to save barcode catalog entry:", error)
          })
      }
      onSuccess?.()
    }
  }

  const renderField = (field: BackendItemSpec) => {
    const fieldName = `fields.${field.id}` as any
    const required = field.required
    const hasError = errors.fields?.[field.id] as any

    switch (field.type) {
      case "TEXT":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={fieldName}>
              {field.name} {required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={fieldName}
              {...register(fieldName, { 
                required: required ? t("productForm.fieldRequired", { field: field.name }) : false
              })}
              defaultValue={initialValues?.fields?.[field.id]}
              onChange={(e) => setValue(`fields.${field.id}`, e.target.value, { shouldDirty: true })}
              placeholder={t("productForm.enterField", { field: field.name })}
            />
            {hasError && (
              <p className="text-sm text-destructive">{hasError.message}</p>
            )}
          </div>
        )

      case "NUMBER":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={fieldName}>
              {field.name} {required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={fieldName}
              type="number"
              step="0.01"
              {...register(fieldName, { 
                required: required ? t("productForm.fieldRequired", { field: field.name }) : false,
                min: required ? { value: 0.01, message: t("productForm.fieldMin", { field: field.name }) } : undefined
              })}
              defaultValue={Number(initialValues?.fields?.[field.id])}
              onChange={(e) => setValue(`fields.${field.id}`, Number(e.target.value), { shouldDirty: true })}
            />
            {hasError && (
              <p className="text-sm text-destructive">{hasError.message}</p>
            )}
          </div>
        )

      case "BOOLEAN":
        return (
          <div key={field.id} className="flex items-center justify-between">
            <Label htmlFor={fieldName}>
              {field.name} {required && <span className="text-destructive">*</span>}
            </Label>
            <Switch
              id={fieldName}
              {...register(fieldName, { 
                required: required ? t("productForm.fieldRequired", { field: field.name }) : false 
              })}
            />
            {hasError && (
              <p className="text-sm text-destructive">{hasError.message}</p>
            )}
          </div>
        )

      case "DATE":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={fieldName}>
              {field.name} {required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={fieldName}
              type="date"
              {...register(fieldName, { 
                required: required ? t("productForm.fieldRequired", { field: field.name }) : false
              })}
            />
            {hasError && (
              <p className="text-sm text-destructive">{hasError.message}</p>
            )}
          </div>
        )

      case "ENUM":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={fieldName}>
              {field.name} {required && <span className="text-destructive">*</span>}
            </Label>
            <Select
              {...register(fieldName, { 
                required: required ? t("productForm.fieldRequired", { field: field.name }) : false
              })}
              defaultValue={initialValues?.fields?.[field.id]}
              onValueChange={(value) => setValue(`fields.${field.id}`, value, { shouldDirty: true })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("productForm.selectField", { field: field.name })} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasError && (
              <p className="text-sm text-destructive">{hasError.message}</p>
            )}
          </div>
        )

      case "JSON":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={fieldName}>
              {field.name} {required && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id={fieldName}
              {...register(fieldName, { 
                required: required ? t("productForm.fieldRequired", { field: field.name }) : false
              })}
              defaultValue={initialValues?.fields?.[field.id]}
              onChange={(e) => setValue(`fields.${field.id}`, e.target.value, { shouldDirty: true })}
              placeholder={t("productForm.enterFieldJson", { field: field.name })}
              rows={3}
            />
            {hasError && (
              <p className="text-sm text-destructive">{hasError.message}</p>
            )}
          </div>
        )

      default:
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={fieldName}>
              {field.name} {required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={fieldName}
              {...register(fieldName, { 
                required: required ? t("productForm.fieldRequired", { field: field.name }) : false
              })}
              defaultValue={initialValues?.fields?.[field.id]}
              placeholder={t("productForm.enterField", { field: field.name })}
            />
            {hasError && (
              <p className="text-sm text-destructive">{hasError.message}</p>
            )}
          </div>
        )
    }
  }

  if (schemaError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {t('productForm.schemaLoadFailed', { msg: schemaError.message })}
        </AlertDescription>
      </Alert>
    )
  }

  if (schemaLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
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
  // Images are served from ImageKit (absolute URLs). Fall back to prefixing the
  // backend origin for any legacy relative path.
  const getImageUrl = (image: string) =>
    /^https?:\/\//i.test(image) ? image : `${process.env.NEXT_PUBLIC_BACKEND_URL}/${image}`
  return (
    <>
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Basic Information */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>{t('productForm.info')}</CardTitle>
              <CardDescription>{t('productForm.infoDesc')}</CardDescription>
            </div>
            {!isEditMode && (
              <Button type="button" variant="outline" size="sm" onClick={() => setScanDialogOpen(true)}>
                <ScanBarcode className="h-4 w-4 mr-2" />
                {t('productForm.scanBarcode')}
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Category Selection */}
            <div className="space-y-2">
              <Label htmlFor="category">{t('productForm.category')}</Label>
              <CategoryTreeSelect
                value={selectedCategoryId}
                preferredCategories={organization?.categories as unknown as BackendCategory[]}
                onChange={(value) => {
                  setSelectedCategoryId(value)
                  setValue('categoryId', value, { shouldDirty: true })
                }}
                placeholder={t('productForm.selectCategory')}
              />
            </div>

            {/* Basic Fields */}
            <div className="space-y-2">
              <Label htmlFor="name">
                {t('productForm.name')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...register("name", { 
                  required: t("productForm.nameRequired")
                })}
                defaultValue={initialValues?.name ?? ""}
                onChange={(e) => setValue('name', e.target.value, { shouldDirty: true })}
                placeholder={t('productForm.namePlaceholder')}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">
                  {t('productForm.price')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="1"
                  {...register("price", { 
                    required: t("productForm.priceRequired"), 
                    min: { value: 0.01, message: t("productForm.priceMin") }
                  })}
                  defaultValue={initialValues?.price ?? ''}
                  onChange={(e) => setValue('price', Number(e.target.value), { shouldDirty: true })}
                  placeholder={t('productForm.pricePlaceholder')}
                />
                {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
              </div>

              <div className="space-y-2">
              <Label htmlFor="quantity">
                {t('productForm.quantity')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                step="1"
                {...register("quantity", { 
                  required: t("productForm.quantityRequired"),
                  min: { value: 0, message: t("productForm.quantityNegative") }
                })}
                defaultValue={initialValues?.quantity ?? ''}
                onChange={(e) => setValue('quantity', Number(e.target.value), { shouldDirty: true })}
                placeholder={t('productForm.quantityPlaceholder')}
              />
              {errors.quantity && <p className="text-sm text-destructive">{(errors as any).quantity?.message}</p>}
            </div>

            </div>
            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="w-full text-muted-foreground border-dashed"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? t('productForm.hideAdvancedSettings') : t('productForm.showAdvancedSettings')}
              </Button>
            </div>

            {showAdvanced && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency">
                      {t('productForm.currency')} <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      {...register("currency", { 
                        required: t("productForm.currencyRequired")
                      })}
                      defaultValue={initialValues?.currency ?? "UZS"}
                      onValueChange={(value) => setValue('currency', value as "USD" | "EUR" | "UZS" | "RUB" | "KZT" | "GBP" | "JPY", { shouldDirty: true })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('productForm.selectCurrency')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">{t('productForm.currencies.USD')}</SelectItem>
                        <SelectItem value="EUR">{t('productForm.currencies.EUR')}</SelectItem>
                        <SelectItem value="UZS">{t('productForm.currencies.UZS')}</SelectItem>
                        <SelectItem value="RUB">{t('productForm.currencies.RUB')}</SelectItem>
                        <SelectItem value="KZT">{t('productForm.currencies.KZT')}</SelectItem>
                        <SelectItem value="GBP">{t('productForm.currencies.GBP')}</SelectItem>
                        <SelectItem value="JPY">{t('productForm.currencies.JPY')}</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.currency && <p className="text-sm text-destructive">{errors.currency.message}</p>}
                  </div>

                  <div className="space-y-2">
                  <Label htmlFor="status">{t('productForm.status')}</Label>
                  <Select
                    {...register("status", { 
                      required: t("productForm.statusRequired")
                    })}
                    defaultValue={initialValues?.status?.toUpperCase() as "ACTIVE" | "DRAFT" | "ARCHIVED" ?? "ACTIVE"}
                    onValueChange={(value) => setValue('status', value as "ACTIVE" | "DRAFT" | "ARCHIVED", { shouldDirty: true })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('productForm.selectStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">{t('productForm.statusActive')}</SelectItem>
                      <SelectItem value="DRAFT">{t('productForm.statusDraft')}</SelectItem>
                      <SelectItem value="ARCHIVED">{t('productForm.statusArchived')}</SelectItem>
                    </SelectContent>
                  </Select>
                  </div>
                </div>

                {!initialValues && hasConnectedChannel && (
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5 pr-4">
                      <Label htmlFor="autoPublish">{t('productForm.autoPublish')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {watchedStatus === 'ACTIVE'
                          ? t('productForm.autoPublishDesc')
                          : t('productForm.autoPublishRequiresActive')}
                      </p>
                    </div>
                    <Switch
                      id="autoPublish"
                      checked={watchedAutoPublish}
                      onCheckedChange={(checked) => setValue('autoPublish', checked, { shouldDirty: true })}
                    />
                  </div>
                )}

                {currentCategory && currentCategory.itemSpecs && currentCategory.itemSpecs.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      {currentCategory.itemSpecs
                        .map(renderField)}
                    </div>
                  </>
                )}

                {currentCategory && currentCategory.itemSpecs && currentCategory.itemSpecs.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">{t('productForm.noFields')}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Images */}
        <Card>
          <CardHeader>
            <CardTitle>{t('productForm.images')}</CardTitle>
            <CardDescription>{t('productForm.imagesDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 ">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <Label
                  htmlFor="image-upload"
                  className="flex items-center gap-2 px-4 py-2 border border-dashed border-muted-foreground rounded-lg cursor-pointer hover:bg-muted"
                >
                  <Upload className="h-4 w-4" />
                  {t('productForm.uploadImages')}
                </Label>
                <button
                  type="button"
                  onClick={() => setCameraDialogOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-dashed border-muted-foreground rounded-lg cursor-pointer hover:bg-muted text-sm"
                >
                  <Camera className="h-4 w-4" />
                  {t('productForm.takePhoto')}
                </button>
                <span className="text-sm text-muted-foreground">{t('productForm.imagesCount', { count: images.length })}</span>
                {uploadFilesMutation.isPending && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('productForm.uploading')}
                  </div>
                )}
              </div>

              {(() => {
                const previewCount = Math.max(
                  images.length,
                  imageFiles.length,
                  uploadedImages.length,
                  existingImageUrls ? existingImageUrls.length : 0
                )
                if (previewCount === 0) return null
                return (
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: previewCount }).map((_, index) => {
                      const hasUploaded = Boolean(uploadedImages[index])
                      const hasFile = Boolean(imageFiles[index])
                      const hasExisting = Boolean(existingImageUrls && existingImageUrls[index])
                      return (
                        <div key={index} className="relative group">
                          <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                            {hasUploaded ? (
                              <img
                                src={uploadedImages[index].url}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : hasFile ? (
                              <img
                                src={URL.createObjectURL(imageFiles[index])}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : hasExisting ? (
                              <img
                                src={getImageUrl((existingImageUrls as string[])[index])}
                                alt={`Image ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-sm text-muted-foreground">{t('productForm.imageN', { n: images[index] ?? index + 1 })}</span>
                              </div>
                            )}
                          </div>
                          {(hasUploaded || hasFile || images[index] !== undefined) && (
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Form Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('productForm.cancel')}
        </Button>
        {(!hideSubmitUntilDirty || form.formState.isDirty) && (
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('productForm.saving')}
              </>
            ) : (
              initialValues ? t('productForm.updateProduct') : t('productForm.createProduct')
            )}
          </Button>
        )}
      </div>
    </form>
    {!initialValues && (
      <BarcodeScanDialog
        open={scanDialogOpen}
        onOpenChange={setScanDialogOpen}
        onResolved={handleBarcodeResolved}
      />
    )}
    <CameraCaptureDialog
      open={cameraDialogOpen}
      onOpenChange={setCameraDialogOpen}
      onCapture={handleCameraCapture}
    />
    </>
  )
}
