import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { organizationApi, type Organization, type UpdateOrganizationDto } from "@/src/api/organizationApi"
import { toast } from "sonner"

export function useOrganizationQuery() {
  return useQuery({
    queryKey: ["organization"],
    queryFn: () => organizationApi.getOrganization(),
  })
}

export function useUpdateOrganizationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateOrganizationDto }) =>
      organizationApi.updateOrganization(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] })
      toast.success("Organization updated successfully ✅")
    },
    onError: () => {
      toast.error("Failed to update organization")
    },
  })
}

