import axiosInstance from "./client"

export type ActivityLog = {
  id: number
  createdAt: string
  message: string
  entityType: string
  action: string
  entityId: number | null
  meta: Record<string, unknown> | null
  user: { id: number; firstName: string | null } | null
}

export type ActivityLogsQuery = {
  page?: number
  limit?: number
  order?: "asc" | "desc"
  lang?: "en" | "uz" | "ru"
  entityType?: string
  action?: string
  from?: string
  to?: string
}

export type ActivityLogsResponse = {
  items: ActivityLog[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export const activityLogsApi = {
  async getActivityLogs(params: ActivityLogsQuery = {}): Promise<ActivityLogsResponse> {
    const search = new URLSearchParams()
    if (params.page) search.set("page", String(params.page))
    if (params.limit) search.set("limit", String(params.limit))
    if (params.order) search.set("order", params.order)
    if (params.lang) search.set("lang", params.lang)
    if (params.entityType) search.set("entityType", params.entityType)
    if (params.action) search.set("action", params.action)
    if (params.from) search.set("from", params.from)
    if (params.to) search.set("to", params.to)

    const qs = search.toString()
    const url = qs ? `/v1/activity-logs?${qs}` : "/v1/activity-logs"
    const { data } = await axiosInstance.get<ActivityLogsResponse>(url)
    return data
  },
}

export default activityLogsApi


