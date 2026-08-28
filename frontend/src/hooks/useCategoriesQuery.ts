import { useQuery } from '@tanstack/react-query'
import { categoriesApi } from '@/src/api/productsApi'

export function useCategoriesQuery(params?: { isRoot?: boolean; parentId?: number }) {
  return useQuery({
    queryKey: ['categories', params],
    queryFn: () => categoriesApi.getCategories(params),
  })
}

export function useCategoryQuery(id?: number | null) {
  return useQuery({
    queryKey: ['categories', id],
    queryFn: () => id ? categoriesApi.getCategoryById(id) : null,
    enabled: !!id,
  })
}
