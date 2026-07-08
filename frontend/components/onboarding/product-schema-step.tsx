"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
// import { Switch } from "@/components/ui/switch"
import type { FieldType, OnboardingData, ProductSchemaField } from "@/lib/types/onboarding"
import { ArrowRight, Plus, Trash2, X } from "lucide-react"
import { useOnboarding } from "@/src/hooks/useOnboarding"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/src/context/I18nContext"

interface ProductSchemaStepProps {
  data: OnboardingData
  onUpdate: (data: Partial<OnboardingData>) => void
  onNext: () => void
}

const DEFAULT_SCHEMAS: Record<string, ProductSchemaField[]> = {
  clothing: [
    { id: "4", name: "Size", type: "ENUM", required: false, options: ["XS", "S", "M", "L", "XL", "XXL"] },
    { id: "5", name: "Color", type: "TEXT", required: false },
    { id: "6", name: "Material", type: "TEXT", required: false },
  ],
  electronics: [
    { id: "4", name: "Brand", type: "TEXT", required: false },
    { id: "5", name: "Model", type: "TEXT", required: false },
    { id: "6", name: "Warranty", type: "TEXT", required: false },
  ],
  food: [
    { id: "4", name: "Weight", type: "NUMBER", required: false },
    { id: "5", name: "Ingredients", type: "TEXT", required: false },
    { id: "6", name: "Expiry Date", type: "DATE", required: false },
  ],
  other: [
    { id: "4", name: "Description", type: "TEXT", required: false },
  ],
}

export function ProductSchemaStep({ data, onUpdate, onNext }: ProductSchemaStepProps) {
  const { t } = useTranslation()
  const [schema, setSchema] = useState<ProductSchemaField[]>(data.productSchema)
  const [newField, setNewField] = useState({ name: "", type: "TEXT" as FieldType, required: false })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { createSchemaWithFields, loading, error } = useOnboarding()
  const { toast } = useToast()
  const firstInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus first input on mount
  useEffect(() => {
    if (firstInputRef.current) {
      firstInputRef.current.focus()
    }
  }, [])

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitting) {
      e.preventDefault()
      handleNext()
    }
  }

  useEffect(() => {
    if (data.category && schema.length === 0) {
      const defaultSchema = DEFAULT_SCHEMAS[data.category] || DEFAULT_SCHEMAS.other
      setSchema(defaultSchema)
    }
  }, [data.category, schema.length])

  const validateSchema = () => {
    for (const field of schema) {
      if (!field.name.trim()) {
        return "All fields must have a name"
      }
      if (field.type === "ENUM") {
        const validOptions = field.options?.filter(opt => opt.trim() !== "") || []
        if (validOptions.length === 0) {
          return `Field "${field.name}" must have at least one option`
        }
        // Check for duplicate options
        const uniqueOptions = new Set(validOptions)
        if (uniqueOptions.size !== validOptions.length) {
          return `Field "${field.name}" has duplicate options`
        }
      }
    }
    return null
  }

  const handleNext = async () => {
    // Prevent double submission
    if (isSubmitting) return
    
    const validationError = validateSchema()
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    onUpdate({ productSchema: schema })

    const fields = schema.map((f, i) => {
      const fieldData: any = {
        name: f.name,
        type: f.type.toUpperCase() as any,
        required: f.required,
        order: i + 1,
      }
      if (f.type === "ENUM" && f.options && f.options.length > 0) {
        fieldData.options = f.options.filter(opt => opt.trim() !== "")
      }
      return fieldData
    })

    try {
      await createSchemaWithFields("Default Product Schema", fields)
      onNext()
    } catch (error) {
      console.error("Failed to create schema and fields:", error)
      toast({
        title: "Error",
        description: "Failed to save product schema. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const addField = () => {
    if (newField.name.trim()) {
      const field: ProductSchemaField = {
        id: Date.now().toString(),
        name: newField.name.trim(),
        type: newField.type,
        required: newField.required,
        options: newField.type === "ENUM" ? [""] : undefined,
      }
      setSchema([...schema, field])
      setNewField({ name: "", type: "TEXT", required: false })
    }
  }

  const removeField = (id: string) => {
    setSchema(schema.filter((field) => field.id !== id))
  }

  const updateField = (id: string, updates: Partial<ProductSchemaField>) => {
    setSchema(schema.map((field) => {
      if (field.id === id) {
        const updatedField = { ...field, ...updates }
        // If changing to enum, initialize options; if changing from enum, remove options
        if (updates.type === "ENUM" && !updatedField.options) {
          updatedField.options = [""]
        } else if (updates.type && updates.type !== "ENUM") {
          updatedField.options = undefined
        }
        return updatedField
      }
      return field
    }))
  }

  return (
    <div className="space-y-8" onKeyDown={handleKeyPress}>
      {/* Header Section */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{t("onboarding.schema.title")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("onboarding.schema.desc")}
        </p>
      </div>

      {/* Fields Section */}
      <div className="space-y-6">
        {schema.map((field) => (
          <Card key={field.id} className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Main Field Controls */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Field Name */}
                  <div className="space-y-2">
                    <Label htmlFor={`field-name-${field.id}`} className="text-sm font-medium text-foreground">
                      {t("onboarding.schema.fieldName")}
                    </Label>
                    <Input
                      id={`field-name-${field.id}`}
                      value={field.name}
                      onChange={(e) => updateField(field.id, { name: e.target.value })}
                      placeholder="Enter field name..."
                      className="transition-all duration-200 focus:ring-2 focus:ring-[#00FFC2]/20 focus:border-[#00FFC2]/30"
                    />
                  </div>

                  {/* Field Type */}
                  <div className="space-y-2">
                    <Label htmlFor={`field-type-${field.id}`} className="text-sm font-medium text-foreground">
                      {t("onboarding.schema.fieldType")}
                    </Label>
                    <Select value={field.type} onValueChange={(value: any) => updateField(field.id, { type: value })}>
                      <SelectTrigger 
                        id={`field-type-${field.id}`}
                        className="transition-all duration-200 focus:ring-2 focus:ring-[#00FFC2]/20 focus:border-[#00FFC2]/30"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TEXT">{t("onboarding.schema.typeText")}</SelectItem>
                        <SelectItem value="NUMBER">{t("onboarding.schema.typeNumber")}</SelectItem>
                        <SelectItem value="DATE">{t("onboarding.schema.typeDate")}</SelectItem>
                        <SelectItem value="BOOLEAN">{t("onboarding.schema.typeBool")}</SelectItem>
                        <SelectItem value="ENUM">{t("onboarding.schema.typeSelect")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Secondary Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`required-${field.id}`}
                        checked={field.required}
                        onCheckedChange={(checked) => updateField(field.id, { required: !!checked })}
                        className="transition-all duration-200"
                      />
                      <Label htmlFor={`required-${field.id}`} className="text-sm font-medium text-foreground cursor-pointer">
                        {t("onboarding.schema.required")}
                      </Label>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeField(field.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Options Section for ENUM fields */}
                {field.type === "ENUM" && (
                  <div className="border border-border/30 rounded-lg bg-muted/20 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-foreground">{t("onboarding.schema.options")}</Label>
                      <span className="text-xs text-muted-foreground">
                        {field.options?.filter(opt => opt.trim() !== "").length || 0} options
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      {field.options?.map((option, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="flex-1">
                            <Input
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...(field.options || [])]
                                newOptions[index] = e.target.value
                                updateField(field.id, { options: newOptions })
                              }}
                              placeholder={`Option ${index + 1}`}
                              className="transition-all duration-200 focus:ring-2 focus:ring-[#00FFC2]/20 focus:border-[#00FFC2]/30"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newOptions = field.options?.filter((_, i) => i !== index) || []
                              updateField(field.id, { options: newOptions })
                            }}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
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
                          updateField(field.id, { options: newOptions })
                        }}
                        className="w-full border-dashed border-border/50 hover:border-[#00FFC2]/30 hover:bg-[#00FFC2]/5 transition-all duration-200"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Option
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add New Field Card */}
        <Card className="border-dashed border-border/50 hover:border-[#00FFC2]/30 transition-all duration-200">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="text-center">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">{t("onboarding.schema.addNew")}</h4>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* New Field Name */}
                <div className="space-y-2">
                  <Label htmlFor="new-field-name" className="text-sm font-medium text-foreground">
                    {t("onboarding.schema.fieldName")}
                  </Label>
                  <Input
                    id="new-field-name"
                    ref={firstInputRef}
                    value={newField.name}
                    onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                    placeholder="Enter field name..."
                    className="transition-all duration-200 focus:ring-2 focus:ring-[#00FFC2]/20 focus:border-[#00FFC2]/30"
                  />
                </div>

                {/* New Field Type */}
                <div className="space-y-2">
                  <Label htmlFor="new-field-type" className="text-sm font-medium text-foreground">
                    {t("onboarding.schema.fieldType")}
                  </Label>
                  <Select value={newField.type} onValueChange={(value: any) => setNewField({ ...newField, type: value })}>
                    <SelectTrigger 
                      id="new-field-type"
                      className="transition-all duration-200 focus:ring-2 focus:ring-[#00FFC2]/20 focus:border-[#00FFC2]/30"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEXT">{t("onboarding.schema.typeText")}</SelectItem>
                      <SelectItem value="NUMBER">{t("onboarding.schema.typeNumber")}</SelectItem>
                      <SelectItem value="DATE">{t("onboarding.schema.typeDate")}</SelectItem>
                      <SelectItem value="BOOLEAN">{t("onboarding.schema.typeBool")}</SelectItem>
                      <SelectItem value="ENUM">{t("onboarding.schema.typeSelect")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="new-required"
                    checked={newField.required}
                    onCheckedChange={(checked) => setNewField({ ...newField, required: !!checked })}
                    className="transition-all duration-200"
                  />
                  <Label htmlFor="new-required" className="text-sm font-medium text-foreground cursor-pointer">
                    {t("onboarding.schema.required")}
                  </Label>
                </div>
                
                <Button 
                  onClick={addField} 
                  size="sm"
                  className="bg-[#00E6A8] hover:bg-[#00E6A8]/90 text-black font-medium transition-all duration-200 hover:scale-105"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("onboarding.schema.addField")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end pt-4">
        <Button 
          onClick={handleNext} 
          disabled={schema.length === 0 || loading || isSubmitting} 
          className="bg-[#00E6A8] hover:bg-[#00E6A8]/90 text-black font-medium px-8 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
              Saving Schema...
            </>
          ) : (
            <>
              {t("onboarding.continue")}
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
