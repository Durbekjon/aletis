import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  fulfillmentApi,
  type FulfillmentSettings,
  type UpsertFulfillmentSettingsDto,
} from "@/src/api/organizationApi"
import { toast } from "sonner"

export function useFulfillmentSettingsQuery(orgId: number | undefined) {
  return useQuery<FulfillmentSettings | null>({
    queryKey: ["fulfillmentSettings", orgId],
    queryFn: () => fulfillmentApi.getFulfillmentSettings(orgId!),
    enabled: !!orgId,
  })
}

export function useUpsertFulfillmentSettingsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      orgId,
      payload,
    }: {
      orgId: number
      payload: UpsertFulfillmentSettingsDto
    }) => fulfillmentApi.upsertFulfillmentSettings(orgId, payload),
    onSuccess: (_, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: ["fulfillmentSettings", orgId] })
    },
    onError: () => {
      toast.error("Failed to save fulfillment settings")
    },
  })
}
