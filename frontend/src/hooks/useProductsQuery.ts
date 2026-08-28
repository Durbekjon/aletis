import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import productsApi, { categoriesApi, type PaginationQuery, type CreateProductRequest, type UpdateProductRequest, type ImportProductsResult } from '@/src/api/productsApi'
import { type Product, mapBackendProductToFrontend } from '@/lib/types/product'

// Products hooks
export function useProductsQuery(params?: PaginationQuery) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const response = await productsApi.getProducts(params)
      const items = response.items.map(mapBackendProductToFrontend)
      return {
        ...response,
        items,
      }
    },
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useProductQuery(id: number) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const response = await productsApi.getProductById(id)
      return mapBackendProductToFrontend(response)
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  })
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateProductRequest) => {
      const response = await productsApi.createProduct(payload)
      return mapBackendProductToFrontend(response)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product created successfully')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create product')
    },
  })
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdateProductRequest }) => {
      const response = await productsApi.updateProduct(id, payload)
      return mapBackendProductToFrontend(response)
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', id] })
      toast.success('Product updated successfully')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update product')
    },
  })
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      return await productsApi.deleteProduct(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete product')
    },
  })
}

export function useBulkDeleteProductsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (productIds: number[]) => {
      return await productsApi.bulkDeleteProducts(productIds)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Products deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete products')
    },
  })
}

export function useImportProductsMutation() {
  const queryClient = useQueryClient()

  return useMutation<ImportProductsResult, any, File>({
    mutationFn: (file: File) => productsApi.importProducts(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      if (data.imported > 0) {
        toast.success(`${data.imported} ta mahsulot import qilindi`)
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Import amalga oshmadi')
    },
  })
}


