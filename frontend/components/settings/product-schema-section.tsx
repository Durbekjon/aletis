"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Trash2, Plus, X, RefreshCw } from "lucide-react"
import { useAddFieldMutation, useUpdateFieldMutation, useDeleteFieldMutation, useSchemaQuery } from "@/src/hooks/useSchema"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useTranslation } from "@/src/context/I18nContext"

interface ProductSchemaSectionProps {
  schemaId: number
}

export function ProductSchemaSection({ schemaId }: ProductSchemaSectionProps) {
  const { t } = useTranslation()
  const { data: schema, isLoading, error } = useSchemaQuery()
  const addFieldMutation = useAddFieldMutation()
  const updateFieldMutation = useUpdateFieldMutation()
  const deleteFieldMutation = useDeleteFieldMutation()
  const typeOptions = [
    { value: "TEXT", label: t("settings.productSchema.types.text") },
    { value: "NUMBER", label: t("settings.productSchema.types.number") },
    { value: "BOOLEAN", label: t("settings.productSchema.types.boolean") },
    { value: "DATE", label: t("settings.productSchema.types.date") },
    { value: "ENUM", label: t("settings.productSchema.types.enum") },
  ]
  
  const [editingField, setEditingField] = useState<number | null>(null)
  const [newField, setNewField] = useState({
    name: "",
    type: "TEXT" as const,
    required: false,
    options: [""],
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (error || !schema) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t("settings.productSchema.error")}</AlertDescription>
      </Alert>
    )
  }

  const handleAddField = async () => {
    if (!newField.name.trim()) return

    const fieldData = {
      name: newField.name.trim(),
      type: newField.type,
      required: newField.required,
      order: schema.fields.length + 1,
      options: newField.type === "ENUM" ? newField.options?.filter((opt) => opt.trim() !== "") : undefined,
    }

    await addFieldMutation.mutateAsync({ schemaId, payload: fieldData })
    setNewField({ name: "", type: "TEXT", required: false, options: [""] })
  }

  const handleUpdateField = async (fieldId: number, updates: Partial<typeof newField>) => {
    const field = schema.fields.find((f) => f.id === fieldId)
    if (!field) return

    const fieldData: any = {}
    if (updates.name !== undefined) fieldData.name = updates.name.trim()
    if (updates.type !== undefined) fieldData.type = updates.type
    if (updates.required !== undefined) fieldData.required = updates.required
    if (updates.options !== undefined) {
      fieldData.options = updates.type === "ENUM" ? updates.options.filter((opt) => opt.trim() !== "") : undefined
    }

    await updateFieldMutation.mutateAsync({ schemaId, fieldId, payload: fieldData })
    setEditingField(null)
  }

  const handleDeleteField = async (fieldId: number) => {
    await deleteFieldMutation.mutateAsync({ schemaId, fieldId })
  }

  const fields = schema.fields.sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t("settings.productSchema.title")}</h3>
          <p className="text-sm text-muted-foreground">{t("settings.productSchema.description")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => document.location.reload()}
          disabled={updateFieldMutation.isPending || deleteFieldMutation.isPending || addFieldMutation.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 transition-transform duration-300 ${(updateFieldMutation.isPending || deleteFieldMutation.isPending || addFieldMutation.isPending) ? "animate-spin" : ""}`} />
          {t("settings.productSchema.refresh")}
        </Button>
      </div>

      <Separator />

      {/* Existing Fields */}
      <div className="space-y-4">
        {fields.map((field) => (
          <Card key={field.id} className="border border-border/50">
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Field Name and Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("settings.productSchema.fieldName")}</Label>
                    <Input
                      value={editingField === field.id ? newField.name : field.name}
                      onChange={(e) =>
                        editingField === field.id
                          ? setNewField({ ...newField, name: e.target.value })
                          : handleUpdateField(field.id, { name: e.target.value })
                      }
                      onBlur={() => {
                        if (editingField === field.id) {
                          handleUpdateField(field.id, { name: newField.name })
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings.productSchema.fieldType")}</Label>
                    <Select
                      value={field.type}
                      onValueChange={(value: any) => handleUpdateField(field.id, { type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {typeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Required Checkbox and Delete Button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`required-${field.id}`}
                      checked={field.required}
                      onCheckedChange={(checked) => handleUpdateField(field.id, { required: !!checked })}
                    />
                    <Label htmlFor={`required-${field.id}`} className="cursor-pointer">
                      {t("settings.productSchema.required")}
                    </Label>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteField(field.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Enum Options */}
                {field.type === "ENUM" && (
                  <div className="border border-border/30 rounded-lg bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>{t("settings.productSchema.options")}</Label>
                      <span className="text-xs text-muted-foreground">
                        {t("settings.productSchema.optionsCount", { count: field.options?.filter((opt) => opt.trim() !== "").length || 0 })}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {field.options?.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(field.options || [])]
                              newOptions[index] = e.target.value
                              handleUpdateField(field.id, { options: newOptions })
                            }}
                            placeholder={t("settings.productSchema.optionPlaceholder", { index: index + 1 })}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newOptions = field.options?.filter((_, i) => i !== index) || []
                              handleUpdateField(field.id, { options: newOptions })
                            }}
                            className="text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newOptions = [...(field.options || []), ""]
                        handleUpdateField(field.id, { options: newOptions })
                      }}
                      className="w-full border-dashed"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t("settings.productSchema.addOption")}
                    </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add New Field Card */}
      <Card className="border-dashed border-border/50">
        <CardContent className="p-4">
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">{t("settings.productSchema.addFieldTitle")}</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("settings.productSchema.fieldName")}</Label>
                <Input
                  value={newField.name}
                  onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                  placeholder={t("settings.productSchema.fieldNamePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("settings.productSchema.fieldType")}</Label>
                <Select
                  value={newField.type}
                  onValueChange={(value: any) =>
                    setNewField({
                      ...newField,
                      type: value,
                      options: value === "ENUM" ? [""] : undefined,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Enum Options for New Field */}
            {newField.type === "ENUM" && (
              <div className="border border-border/30 rounded-lg bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{t("settings.productSchema.options")}</Label>
                  <span className="text-xs text-muted-foreground">
                    {t("settings.productSchema.optionsCount", { count: newField.options?.filter((opt) => opt.trim() !== "").length || 0 })}
                  </span>
                </div>
                <div className="space-y-2">
                  {newField.options?.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...(newField.options || [])]
                          newOptions[index] = e.target.value
                          setNewField({ ...newField, options: newOptions })
                        }}
                        placeholder={t("settings.productSchema.optionPlaceholder", { index: index + 1 })}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newOptions = newField.options?.filter((_, i) => i !== index) || []
                          setNewField({ ...newField, options: newOptions })
                        }}
                        className="text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newOptions = [...(newField.options || []), ""]
                      setNewField({ ...newField, options: newOptions })
                    }}
                    className="w-full border-dashed"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("settings.productSchema.addOption")}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="new-required"
                  checked={newField.required}
                  onCheckedChange={(checked) => setNewField({ ...newField, required: !!checked })}
                />
                <Label htmlFor="new-required" className="cursor-pointer">
                  {t("settings.productSchema.required")}
                </Label>
              </div>
              <Button onClick={handleAddField} size="sm" disabled={!newField.name.trim() || addFieldMutation.isPending}>
                <Plus className="h-4 w-4 mr-2" />
                {t("settings.productSchema.addField")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

