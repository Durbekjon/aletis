"use client"

import type React from "react"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { X, Plus, Upload, Loader2 } from "lucide-react"
import { BUSINESS_CATEGORIES } from "@/lib/constants"
import type { ProductFormData, ProductVariant } from "@/lib/types/product"

interface ProductFormProps {
  initialData?: Partial<ProductFormData>
  onSubmit: (data: ProductFormData) => Promise<void>
  isLoading?: boolean
}

export function ProductForm({ initialData, onSubmit, isLoading = false }: ProductFormProps) {
  const [tags, setTags] = useState<string[]>(initialData?.tags || [])
  const [tagInput, setTagInput] = useState("")
  const [variants, setVariants] = useState<ProductVariant[]>(initialData?.variants || [])
  const [images, setImages] = useState<string[]>(initialData?.images || [])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      stock: 0,
      lowStockThreshold: 5,
      trackQuantity: true,
      category: "",
      status: "draft",
      ...initialData,
    },
  })

  const trackQuantity = watch("trackQuantity")

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      const newTags = [...tags, tagInput.trim()]
      setTags(newTags)
      setValue("tags", newTags)
      setTagInput("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter((tag) => tag !== tagToRemove)
    setTags(newTags)
    setValue("tags", newTags)
  }

  const addVariant = () => {
    const newVariant: ProductVariant = {
      id: Date.now().toString(),
      name: "",
      value: "",
    }
    const newVariants = [...variants, newVariant]
    setVariants(newVariants)
    setValue("variants", newVariants)
  }

  const updateVariant = (id: string, field: keyof ProductVariant, value: string | number) => {
    const newVariants = variants.map((variant) => (variant.id === id ? { ...variant, [field]: value } : variant))
    setVariants(newVariants)
    setValue("variants", newVariants)
  }

  const removeVariant = (id: string) => {
    const newVariants = variants.filter((variant) => variant.id !== id)
    setVariants(newVariants)
    setValue("variants", newVariants)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    // TODO: Implement actual image upload
    const newImages = files.map((file) => URL.createObjectURL(file))
    const updatedImages = [...images, ...newImages].slice(0, 9) // Max 9 images
    setImages(updatedImages)
    setValue("images", updatedImages)
  }

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    setImages(newImages)
    setValue("images", newImages)
  }

  const onFormSubmit = async (data: ProductFormData) => {
    await onSubmit({
      ...data,
      tags,
      variants,
      images,
    })
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Basic Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Essential product details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                {...register("name", { required: "Product name is required" })}
                placeholder="Enter product name"
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register("description")} placeholder="Describe your product" rows={4} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select onValueChange={(value) => setValue("category", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select onValueChange={(value) => setValue("status", value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add a tag"
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                />
                <Button type="button" onClick={addTag} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Inventory */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing & Inventory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                {...register("price", { required: "Price is required", min: 0 })}
                placeholder="0.00"
              />
              {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="compareAtPrice">Compare at Price</Label>
              <Input
                id="compareAtPrice"
                type="number"
                step="0.01"
                {...register("compareAtPrice", { min: 0 })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Cost per Item</Label>
              <Input id="cost" type="number" step="0.01" {...register("cost", { min: 0 })} placeholder="0.00" />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Label htmlFor="trackQuantity">Track Quantity</Label>
              <Switch
                id="trackQuantity"
                checked={trackQuantity}
                onCheckedChange={(checked) => setValue("trackQuantity", checked)}
              />
            </div>

            {trackQuantity && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Quantity</Label>
                  <Input id="stock" type="number" {...register("stock", { min: 0 })} placeholder="0" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
                  <Input
                    id="lowStockThreshold"
                    type="number"
                    {...register("lowStockThreshold", { min: 0 })}
                    placeholder="5"
                  />
                </div>
              </>
            )}

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...register("sku")} placeholder="Product SKU" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode</Label>
              <Input id="barcode" {...register("barcode")} placeholder="Product barcode" />
            </div>
          </CardContent>
        </Card>

        {/* Product Images */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Product Images</CardTitle>
            <CardDescription>Upload up to 9 images for your product</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
                <span className="text-sm text-muted-foreground">{images.length}/9 images uploaded</span>
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image || "/placeholder.svg"}
                        alt={`Product ${index + 1}`}
                        className="aspect-square rounded-lg object-cover w-full"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Product Variants */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Product Variants</CardTitle>
            <CardDescription>Add variants like size, color, or storage options</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {variants.map((variant, index) => (
                <div key={variant.id} className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label>Variant Name</Label>
                    <Input
                      value={variant.name}
                      onChange={(e) => updateVariant(variant.id, "name", e.target.value)}
                      placeholder="e.g., Size, Color"
                    />
                  </div>
                  <div className="flex-1">
                    <Label>Value</Label>
                    <Input
                      value={variant.value}
                      onChange={(e) => updateVariant(variant.id, "value", e.target.value)}
                      placeholder="e.g., Large, Red"
                    />
                  </div>
                  <div className="flex-1">
                    <Label>Price (optional)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={variant.price || ""}
                      onChange={(e) => updateVariant(variant.id, "price", Number.parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => removeVariant(variant.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button type="button" variant="outline" onClick={addVariant}>
                <Plus className="h-4 w-4 mr-2" />
                Add Variant
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Product"
          )}
        </Button>
      </div>
    </form>
  )
}
