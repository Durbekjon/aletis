import axiosInstance from "./client"

export interface QueueHealth {
  name: string
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
}

export interface QueueFailure {
  queue: string
  failures: {
    id: string | number | undefined
    jobName: string
    failedReason: string | undefined
    attemptsMade: number
    timestamp: string | null
  }[]
}

export const adminJobsApi = {
  async getHealth(): Promise<QueueHealth[]> {
    const { data } = await axiosInstance.get<QueueHealth[]>("/v1/admin/jobs/health")
    return data
  },

  async getFailures(): Promise<QueueFailure[]> {
    const { data } = await axiosInstance.get<QueueFailure[]>("/v1/admin/jobs/failures")
    return data
  },
}

export default adminJobsApi
