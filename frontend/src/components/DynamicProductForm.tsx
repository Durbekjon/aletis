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
import { X, Upload, Loader2, AlertCircle, ScanBarcode } from "lucide-react"
import { useProductSchema } from "@/src/context/ProductSchemaContext"
import { useDynamicProductForm, type FormData } from "@/src/hooks/useDynamicProductForm"
import { useUploadManyFilesMutation, useDeleteFileByKeyMutation } from "@/src/hooks/useFilesQuery"
import { useCompleteBarcodeMutation } from "@/src/hooks/useBarcodeCatalogQuery"
import { findMatchingField } from "@/src/lib/barcode-field-matching"
import { BarcodeScanDialog, type BarcodeScanResolution } from "@/components/product/barcode-scan-dialog"
import type { ProductSchemaField } from "@/lib/types/product"

interface DynamicProductFormProps {
  initialValues?: Partial<FormData>
  initialSchemaId?: number | null
  onSubmitImpl?: (data: FormData) => Promise<boolean>
  existingImageUrls?: string[]
  onSuccess?: () => void
  onCancel?: () => void
  hideSubmitUntilDirty?: boolean
}

export function DynamicProductForm({ initialValues, initialSchemaId, onSubmitImpl, existingImageUrls, onSuccess, onCancel, hideSubmitUntilDirty }: DynamicProductFormProps) {
  const { schemas, isLoading: schemaLoading, error: schemaError, defaultSchema } = useProductSchema()
  const { form, onSubmit, isLoading: formLoading } = useDynamicProductForm({ initialValues, onSubmitImpl })
  const uploadFilesMutation = useUploadManyFilesMutation()
  const deleteFileByKeyMutation = useDeleteFileByKeyMutation()
  
  // Maintain numeric image IDs in form while previewing keys/URLs
  const [images, setImages] = useState<number[]>(initialValues?.images ?? [])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [uploadedImages, setUploadedImages] = useState<any[]>([])
  const [selectedSchema, setSelectedSchema] = useState<number | null>(initialSchemaId ?? null)
  const [scanDialogOpen, setScanDialogOpen] = useState(false)
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null)
  const completeBarcodeMutation = useCompleteBarcodeMutation()
  const didPrefillRef = useRef(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = form

  const currentSchema = schemas.find(schema => schema.id === selectedSchema)

  // Set default schema when available
  useEffect(() => {
    if (!selectedSchema && (initialSchemaId || defaultSchema)) {
      if (initialSchemaId) {
        setSelectedSchema(initialSchemaId)
      } else if (defaultSchema) {
      setSelectedSchema(defaultSchema.id)
      }
    }
  }, [defaultSchema, selectedSchema, initialSchemaId])

  // Initialize form fields when schema changes
  useEffect(() => {
    if (currentSchema && !didPrefillRef.current) {
      const initialFields: Record<string, any> = {}
      currentSchema.fields.forEach(field => {
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
    
  }, [currentSchema, setValue, initialValues?.fields])
  
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
        currency: initialValues.currency ?? "USD",
        quantity: initialValues.quantity ?? '',
        images: initialValues.images ?? [],
        fields: nextFields,
        status: initialValues.status?.toUpperCase() as "ACTIVE" | "DRAFT" | "ARCHIVED" ?? "DRAFT",
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
      if (currentSchema) {
        const matches: Array<[string | undefined, "description" | "brandName" | "categoryName" | "unitName"]> = [
          [description, "description"],
          [brandName, "brandName"],
          [categoryName, "categoryName"],
          [unitName, "unitName"],
        ]
        matches.forEach(([value, attr]) => {
          if (!value) return
          const field = findMatchingField(currentSchema.fields, attr)
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
    const success = await onSubmit(data)
    if (success) {
      if (pendingBarcode) {
        const findValue = (attr: "description" | "brandName" | "categoryName" | "unitName") => {
          const field = currentSchema && findMatchingField(currentSchema.fields, attr)
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

  const renderField = (field: ProductSchemaField) => {
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
                required: required ? `${field.name} is required` : false
              })}
              defaultValue={initialValues?.fields?.[field.id]}
              onChange={(e) => setValue(`fields.${field.id}`, e.target.value, { shouldDirty: true })}
              placeholder={`Enter ${field.name.toLowerCase()}`}
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
                required: required ? `${field.name} is required` : false,
                min: required ? { value: 0.01, message: `${field.name} must be greater than 0` } : undefined
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
                required: required ? `${field.name} is required` : false 
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
                required: required ? `${field.name} is required` : false
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
                required: required ? `${field.name} is required` : false
              })}
              defaultValue={initialValues?.fields?.[field.id]}
              onValueChange={(value) => setValue(`fields.${field.id}`, value, { shouldDirty: true })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={`Select ${field.name.toLowerCase()}`} />
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
                required: required ? `${field.name} is required` : false
              })}
              defaultValue={initialValues?.fields?.[field.id]}
              onChange={(e) => setValue(`fields.${field.id}`, e.target.value, { shouldDirty: true })}
              placeholder={`Enter ${field.name.toLowerCase()} as JSON`}
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
                required: required ? `${field.name} is required` : false
              })}
              defaultValue={initialValues?.fields?.[field.id]}
              placeholder={`Enter ${field.name.toLowerCase()}`}
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
          Failed to load product schema: {schemaError.message}
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
              <CardTitle>Product Information</CardTitle>
              <CardDescription>Fill in the product details based on your schema</CardDescription>
            </div>
            {!initialValues && (
              <Button type="button" variant="outline" size="sm" onClick={() => setScanDialogOpen(true)}>
                <ScanBarcode className="h-4 w-4 mr-2" />
                Barcode skanerlash
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Schema Selection */}
            {schemas.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="schema">Product Schema</Label>
                <Select value={selectedSchema?.toString()} onValueChange={(value) => setSelectedSchema(parseInt(value))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a schema" />
                  </SelectTrigger>
                  <SelectContent>
                    {schemas.map((schema) => (
                      <SelectItem key={schema.id} value={schema.id.toString()}>
                        {schema.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Basic Fields */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Product Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...register("name", { 
                  required: "Product name is required"
                })}
                defaultValue={initialValues?.name ?? ""}
                onChange={(e) => setValue('name', e.target.value, { shouldDirty: true })}
                placeholder="Enter product name"
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">
                  Price <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="1"
                  {...register("price", { 
                    required: "Price is required", 
                    min: { value: 0.01, message: "Price must be greater than 0" }
                  })}
                  defaultValue={initialValues?.price ?? ''}
                  onChange={(e) => setValue('price', Number(e.target.value), { shouldDirty: true })}
                  placeholder="0.00"
                />
                {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
              </div>

              <div className="space-y-2">
              <Label htmlFor="quantity">
                Quantity <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                step="1"
                {...register("quantity", { 
                  required: "Quantity is required",
                  min: { value: 0, message: "Quantity cannot be negative" }
                })}
                defaultValue={initialValues?.quantity ?? ''}
                onChange={(e) => setValue('quantity', Number(e.target.value), { shouldDirty: true })}
                placeholder="0"
              />
              {errors.quantity && <p className="text-sm text-destructive">{(errors as any).quantity?.message}</p>}
            </div>

            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">
                  Currency <span className="text-destructive">*</span>
                </Label>
                <Select
                  {...register("currency", { 
                    required: "Currency is required"
                  })}
                  defaultValue={initialValues?.currency ?? "USD"}
                  onValueChange={(value) => setValue('currency', value as "USD" | "EUR" | "UZS" | "RUB" | "KZT" | "GBP" | "JPY", { shouldDirty: true })}
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
                {errors.currency && <p className="text-sm text-destructive">{errors.currency.message}</p>}
              </div>

              <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                {...register("status", { 
                  required: "Status is required"
                })}
                defaultValue={initialValues?.status?.toUpperCase() as "ACTIVE" | "DRAFT" | "ARCHIVED" ?? "DRAFT"}
                onValueChange={(value) => setValue('status', value as "ACTIVE" | "DRAFT" | "ARCHIVED", { shouldDirty: true })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
              </div>
            </div>
            {/* Dynamic Schema Fields */}
            {currentSchema && currentSchema.fields.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                 
                  {currentSchema.fields
                    .sort((a, b) => (a.order || 0) - (b.order || 0)) // Sort by order
                    .map(renderField)}
                </div>
              </>
            )}

            {currentSchema && currentSchema.fields.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-sm">No additional fields defined in this schema</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Images */}
        <Card>
          <CardHeader>
            <CardTitle>Product Images</CardTitle>
            <CardDescription>Upload product images</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 ">
              <div className="flex items-center gap-4">
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
                  Upload Images
                </Label>
                <span className="text-sm text-muted-foreground">{images.length} images</span>
                {uploadFilesMutation.isPending && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
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
                                <span className="text-sm text-muted-foreground">Image {images[index] ?? index + 1}</span>
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
          Cancel
        </Button>
        {(!hideSubmitUntilDirty || form.formState.isDirty) && (
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              initialValues ? "Update Product" : "Create Product"
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
    </>
  )
}
