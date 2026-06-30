import { useQuery } from "@tanstack/react-query"
import { activityLogsApi, type ActivityLogsQuery, type ActivityLogsResponse } from "@/src/api/activityLogsApi"

export function useActivityLogsQuery(params: ActivityLogsQuery) {
  return useQuery<ActivityLogsResponse>({
    queryKey: ["activity-logs", params],
    queryFn: () => activityLogsApi.getActivityLogs(params),
    keepPreviousData: true,
    staleTime: 120 * 1000, // matches backend cache TTL
  })
}


