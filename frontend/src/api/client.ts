import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios"

// Base URL for backend API. Configure via NEXT_PUBLIC_API_BASE_URL in .env
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.aletis.me/api"

type TokenPair = {
  accessToken: string
  refreshToken: string
}

const ACCESS_TOKEN_KEY = "accessToken"
const REFRESH_TOKEN_KEY = "refreshToken"

function getStoredTokens(): TokenPair | null {
  if (typeof window === "undefined") return null
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
  if (!accessToken || !refreshToken) return null
  return { accessToken, refreshToken }
}

export function setStoredTokens(tokens: TokenPair) {
  if (typeof window === "undefined") return
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
}

export function clearStoredTokens() {
  if (typeof window === "undefined") return
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
  config: AxiosRequestConfig
}> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error)
    } else if (token) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newConfig: any = { ...config }
      newConfig.headers = { ...(config.headers || {}), Authorization: `Bearer ${token}` }
      resolve(newConfig)
    } else {
      reject(new Error("No token provided"))
    }
  })
  failedQueue = []
}

export const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
})

axiosInstance.interceptors.request.use((config) => {
  const tokens = getStoredTokens()
  if (tokens?.accessToken) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${tokens.accessToken}`
  }
  return config
})

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config

    if (!originalRequest) {
      return Promise.reject(error)
    }

    const status = error.response?.status
    const isAuthEndpoint = originalRequest.url?.includes("/v1/auth/")

    if (status === 401 && !isAuthEndpoint) {
      const tokens = getStoredTokens()
      const refreshToken = tokens?.refreshToken

      if (!refreshToken) {
        clearStoredTokens()
        if (typeof window !== "undefined") {
          const currentPath = window.location.pathname
          const publicPaths = new Set(["/", "/login", "/register", "/forgot-password"]) // avoid redirect loops on public pages
          if (!publicPaths.has(currentPath)) {
            window.location.href = "/login"
          }
        }
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (newConfig) => resolve(axiosInstance(newConfig as AxiosRequestConfig)),
            reject,
            config: originalRequest,
          })
        })
      }

      isRefreshing = true

      try {
        const refreshResponse = await axiosInstance.post<{
          accessToken: string
          refreshToken: string
        }>("/v1/auth/refresh", { refreshToken })

        const newAccess = refreshResponse.data.accessToken
        const newRefresh = refreshResponse.data.refreshToken
        setStoredTokens({ accessToken: newAccess, refreshToken: newRefresh })

        processQueue(null, newAccess)

        // Retry original request with new token
        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${newAccess}`
        return axiosInstance(originalRequest)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        clearStoredTokens()
        if (typeof window !== "undefined") {
          const currentPath = window.location.pathname
          const publicPaths = new Set(["/", "/login", "/register", "/forgot-password"]) // avoid redirect loops on public pages
          if (!publicPaths.has(currentPath)) {
            window.location.href = "/login"
          }
        }
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default axiosInstance

export function getErrorMessage(error: unknown, context: string = "Registration"): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const err: any = error
  const messageFromResponse = err?.response?.data?.message
  if (typeof messageFromResponse === "string" && messageFromResponse.trim().length > 0) {
    return `${context} failed: ${messageFromResponse}`
  }
  const messageFromError = err?.message
  if (typeof messageFromError === "string" && messageFromError.trim().length > 0) {
    return `${context} failed: ${messageFromError}`
  }
  return `${context} failed. Please try again.`
}


