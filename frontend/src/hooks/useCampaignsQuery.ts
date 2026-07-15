import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import campaignsApi, {
  CampaignSegment,
  CreateCampaignBody,
} from "@/src/api/campaignsApi"

export function useCampaigns() {
  return useQuery({
    queryKey: ["campaigns", "list"],
    queryFn: () => campaignsApi.list(),
    staleTime: 15 * 1000,
  })
}

export function useCampaign(id: number | null) {
  return useQuery({
    queryKey: ["campaigns", "detail", id],
    queryFn: () => campaignsApi.get(id as number),
    enabled: id != null,
    staleTime: 10 * 1000,
  })
}

export function useSegmentPreview(segment: CampaignSegment | null) {
  return useQuery({
    queryKey: ["campaigns", "preview", segment],
    queryFn: () => campaignsApi.preview(segment as CampaignSegment),
    enabled: segment != null,
    staleTime: 30 * 1000,
  })
}

function useInvalidateCampaigns() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ["campaigns"] })
}

export function useCreateCampaign() {
  const invalidate = useInvalidateCampaigns()
  return useMutation({
    mutationFn: (body: CreateCampaignBody) => campaignsApi.create(body),
    onSuccess: invalidate,
  })
}

export function useLaunchCampaign() {
  const invalidate = useInvalidateCampaigns()
  return useMutation({
    mutationFn: (id: number) => campaignsApi.launch(id),
    onSuccess: invalidate,
  })
}
