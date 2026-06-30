import React from "react"
import { Controller, FieldErrors } from "react-hook-form"
import { useDynamicProductForm } from "./useDynamicProductForm"

interface DynamicField {
  id: number
  name: string
  type: 'text' | 'number' | 'textarea' | 'select' | 'checkbox'
  required?: boolean
  options?: string[]
}

interface FormData {
  name: string
  price: number
  quantity: number
  images: number[]
  fields: Record<string, any>
}

interface ProductFormProps {
  dynamicFields?: DynamicField[]
  onSuccess?: () => void
}

export function ProductForm({ dynamicFields = [], onSuccess }: ProductFormProps) {
  const { form, onSubmit, isLoading } = useDynamicProductForm()

  const handleSubmit = async (data: FormData) => {
    const success = await onSubmit(data)
    if (success && onSuccess) {
      onSuccess()
    }
  }

  // This ensures numeric dynamic field defaultValue is the correct type
  const getFieldTypeProps = (field: DynamicField) => {
    switch (field.type) {
      case 'number':
        return { inputMode: "decimal", step: "any" }
      default:
        return {}
    }
  }

  // Helper: error accessor type-safe
  const getFieldError = (errors: FieldErrors<FormData>["fields"] | undefined, id: number) => {
    if (!errors) return undefined
    const fieldError = errors[id as keyof typeof errors]
    return fieldError?.message as string | undefined
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Name Field */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-2">
          Product Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          {...form.register("name", {
            required: "Product name is required",
            minLength: { value: 3, message: "Name must be at least 3 characters" }
          })}
          disabled={isLoading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="Enter product name"
        />
        {form.formState.errors.name && (
          <p className="mt-1 text-sm text-red-500">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      {/* Price Field */}
      <div>
        <label htmlFor="price" className="block text-sm font-medium mb-2">
          Price <span className="text-red-500">*</span>
        </label>
        <Controller
          name="price"
          control={form.control}
          rules={{
            required: "Price is required",
            min: { value: 0, message: "Price must be positive" }
          }}
          render={({ field }) => (
            <input
              id="price"
              type="number"
              step="0.01"
              {...field}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                field.onChange(!isNaN(v) ? v : 0)
              }}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="0.00"
            />
          )}
        />
        {form.formState.errors.price && (
          <p className="mt-1 text-sm text-red-500">
            {form.formState.errors.price.message}
          </p>
        )}
      </div>

      {/* Quantity Field */}
      <div>
        <label htmlFor="quantity" className="block text-sm font-medium mb-2">
          Quantity <span className="text-red-500">*</span>
        </label>
        <Controller
          name="quantity"
          control={form.control}
          rules={{
            required: "Quantity is required",
            min: { value: 0, message: "Quantity must be positive" }
          }}
          render={({ field }) => (
            <input
              id="quantity"
              type="number"
              {...field}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                field.onChange(!isNaN(v) ? v : 0)
              }}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="0"
            />
          )}
        />
        {form.formState.errors.quantity && (
          <p className="mt-1 text-sm text-red-500">
            {form.formState.errors.quantity.message}
          </p>
        )}
      </div>

      {/* Images Field */}
      <div>
        <label htmlFor="images" className="block text-sm font-medium mb-2">
          Images (IDs) <span className="text-red-500">*</span>
        </label>
        <Controller
          name="images"
          control={form.control}
          rules={{
            required: "At least one image is required",
            validate: (value) => Array.isArray(value) && value.length > 0 || "At least one image is required"
          }}
          render={({ field }) => (
            <input
              id="images"
              type="text"
              value={Array.isArray(field.value) ? field.value.join(", ") : ""}
              onChange={(e) => {
                const ids = e.target.value
                  .split(',')
                  .map(id => parseInt(id.trim(), 10))
                  .filter(id => !isNaN(id))
                field.onChange(ids)
              }}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="1, 2, 3 (comma-separated image IDs)"
            />
          )}
        />
        {form.formState.errors.images && (
          <p className="mt-1 text-sm text-red-500">
            {form.formState.errors.images.message}
          </p>
        )}
      </div>

      {/* Dynamic Fields */}
      {dynamicFields.length > 0 && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Additional Fields</h3>
          <div className="space-y-4">
            {dynamicFields.map((field) => (
              <div key={field.id}>
                <label htmlFor={`field-${field.id}`} className="block text-sm font-medium mb-2">
                  {field.name} {field.required && <span className="text-red-500">*</span>}
                </label>

                {field.type === "text" && (
                  <input
                    id={`field-${field.id}`}
                    type="text"
                    {...form.register(`fields.${field.id}`, {
                      required: field.required ? `${field.name} is required` : false,
                    })}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder={`Enter ${field.name.toLowerCase()}`}
                  />
                )}

                {field.type === "number" && (
                  <Controller
                    name={`fields.${field.id}`}
                    control={form.control}
                    rules={{
                      required: field.required ? `${field.name} is required` : false,
                    }}
                    render={({ field: controllerField }) => (
                      <input
                        id={`field-${field.id}`}
                        type="number"
                        {...getFieldTypeProps(field)}
                        {...controllerField}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value)
                          controllerField.onChange(!isNaN(v) ? v : undefined)
                        }}
                        disabled={isLoading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        placeholder={`Enter ${field.name.toLowerCase()}`}
                      />
                    )}
                  />
                )}

                {field.type === "textarea" && (
                  <textarea
                    id={`field-${field.id}`}
                    {...form.register(`fields.${field.id}`, {
                      required: field.required ? `${field.name} is required` : false,
                    })}
                    disabled={isLoading}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder={`Enter ${field.name.toLowerCase()}`}
                  />
                )}

                {field.type === "select" && field.options && (
                  <select
                    id={`field-${field.id}`}
                    {...form.register(`fields.${field.id}`, {
                      required: field.required ? `${field.name} is required` : false,
                    })}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">Select {field.name.toLowerCase()}</option>
                    {field.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}

                {field.type === "checkbox" && (
                  <Controller
                    name={`fields.${field.id}`}
                    control={form.control}
                    render={({ field: controllerField }) => (
                      <input
                        id={`field-${field.id}`}
                        type="checkbox"
                        checked={!!controllerField.value}
                        onChange={(e) => controllerField.onChange(e.target.checked)}
                        disabled={isLoading}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    )}
                  />
                )}

                {(form.formState.errors.fields?.[field.id]) && (
                  <p className="mt-1 text-sm text-red-500">
                    {getFieldError(form.formState.errors.fields, field.id)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "Creating..." : "Create Product"}
        </button>

        <button
          type="button"
          onClick={() => form.reset()}
          disabled={isLoading}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
        >
          Reset
        </button>
      </div>
    </form>
  )
}


