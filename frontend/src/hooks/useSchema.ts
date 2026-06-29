import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { schemaApi, type CreateFieldDto, type UpdateFieldDto, type ReorderFieldsDto } from "@/src/api/schemaApi"
import { toast } from "sonner"

export function useSchemaQuery() {
  return useQuery({
    queryKey: ["product-schema"],
    queryFn: () => schemaApi.getSchema(),
  })
}

export function useUpdateSchemaMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { name?: string; description?: string } }) =>
      schemaApi.updateSchema(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-schema"] })
      toast.success("Schema updated successfully ✅")
    },
    onError: () => {
      toast.error("Failed to update schema")
    },
  })
}

export function useAddFieldMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ schemaId, payload }: { schemaId: number; payload: CreateFieldDto }) =>
      schemaApi.addField(schemaId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-schema"] })
      toast.success("Field added successfully ✅")
    },
    onError: () => {
      toast.error("Failed to add field")
    },
  })
}

export function useUpdateFieldMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ schemaId, fieldId, payload }: { schemaId: number; fieldId: number; payload: UpdateFieldDto }) =>
      schemaApi.updateField(schemaId, fieldId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-schema"] })
      toast.success("Field updated successfully ✅")
    },
    onError: () => {
      toast.error("Failed to update field")
    },
  })
}

export function useDeleteFieldMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ schemaId, fieldId }: { schemaId: number; fieldId: number }) =>
      schemaApi.deleteField(schemaId, fieldId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-schema"] })
      toast.success("Field deleted successfully ✅")
    },
    onError: () => {
      toast.error("Failed to delete field")
    },
  })
}

export function useReorderFieldsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ schemaId, payload }: { schemaId: number; payload: ReorderFieldsDto }) =>
      schemaApi.reorderFields(schemaId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-schema"] })
      toast.success("Fields reordered successfully ✅")
    },
    onError: () => {
      toast.error("Failed to reorder fields")
    },
  })
}

