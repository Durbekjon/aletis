"use client"

import { createContext, useContext, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useProductSchemasQuery } from '@/src/hooks/useProductsQuery'
import type { ProductSchema } from '@/lib/types/product'

interface ProductSchemaContextType {
  schemas: ProductSchema[]
  isLoading: boolean
  error: any
  defaultSchema: ProductSchema | null
}

const ProductSchemaContext = createContext<ProductSchemaContextType | undefined>(undefined)

export function ProductSchemaProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const shouldFetch = pathname?.includes('/products') || pathname?.includes('/posts')
  const schemasQuery = useProductSchemasQuery({ enabled: Boolean(shouldFetch) })
  
  // Handle both single schema and array of schemas - fix undefined handling
  const rawData = schemasQuery.data
  const schemas = rawData ? (Array.isArray(rawData) ? rawData : [rawData]) : []
  const isLoading = schemasQuery.isLoading
  const error = schemasQuery.error
  
  // Get the default schema (usually the first one or one named "Default Product Schema")
  const defaultSchema = schemas.length > 0 ? (schemas.find(schema => 
    schema.name.toLowerCase().includes('default') || 
    schema.name.toLowerCase().includes('product schema')
  ) || schemas[0]) : null

  return (
    <ProductSchemaContext.Provider value={{
      schemas,
      isLoading,
      error,
      defaultSchema
    }}>
      {children}
    </ProductSchemaContext.Provider>
  )
}

export function useProductSchema() {
  const context = useContext(ProductSchemaContext)
  if (context === undefined) {
    throw new Error('useProductSchema must be used within a ProductSchemaProvider')
  }
  return context
}
