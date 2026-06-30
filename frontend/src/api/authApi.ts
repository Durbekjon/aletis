import axiosInstance, { setStoredTokens, clearStoredTokens } from "./client"

export type LoginPayload = { email: string; password: string }
export type RegisterPayload = {
  firstName?: string
  lastName?: string
  email: string
  password: string
}

export type TokensResponse = { accessToken: string; refreshToken: string }

export type OnboardingProgress = {
  id: number
  percentage: number
  isCategorySelected: boolean
  isSchemaConfigured: boolean
  isFirstProductAdded: boolean
  isBotConnected: boolean
  nextStep: OnboardingStep
  status: "INCOMPLETE" | "COMPLETE"
}

export type Organization = {
  id: number
  name: string
  onboardingProgress: OnboardingProgress
}

export type LoginResponse = {
  accessToken: string
  refreshToken: string
  hasOrganization: boolean
  organization?: Organization
}

export type UserResponse = {
  id: number
  email: string
  firstName: string
  lastName: string
  logo?: {
    id: number
    key: string
    url: string
  }
}

export type UpdateProfilePayload = {
  firstName?: string | null
  lastName?: string | null
  logoId?: number | null
}

export type UpdatePasswordPayload = {
  oldPassword: string
  newPassword: string
}

export enum OnboardingStep {
  SELECT_CATEGORY = "SELECT_CATEGORY",
  CONFIGURE_SCHEMA = "CONFIGURE_SCHEMA", 
  ADD_FIRST_PRODUCT = "ADD_FIRST_PRODUCT",
  CONNECT_BOT = "CONNECT_BOT",
}

export const authApi = {
  async register(payload: RegisterPayload): Promise<LoginResponse> {
    const { data } = await axiosInstance.post<LoginResponse>("/v1/auth/register", payload)
    setStoredTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken })
    return data
  },

  async login(payload: LoginPayload): Promise<LoginResponse> {
    const { data } = await axiosInstance.post<LoginResponse>("/v1/auth/login", payload)
    setStoredTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken })
    return data
  },

  async me(): Promise<UserResponse> {
    const { data } = await axiosInstance.get<UserResponse>("/v1/auth/me")
    return data
  },

  async refresh(refreshToken: string): Promise<TokensResponse> {
    const { data } = await axiosInstance.post<TokensResponse>("/v1/auth/refresh", { refreshToken })
    setStoredTokens(data)
    return data
  },

  async logout(): Promise<void> {
    try {
      await axiosInstance.post("/v1/auth/logout")
    } finally {
      clearStoredTokens()
    }
  },

  async forgotPassword(email: string): Promise<void> {
    await axiosInstance.post("/v1/auth/forgot-password", { email })
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await axiosInstance.post("/v1/auth/reset-password", { token, newPassword })
  },

  async updateOnboardingProgress(step: OnboardingStep): Promise<void> {
    await axiosInstance.patch("/v1/onboarding-progress/next-step", { step })
  },

  async getOnboardingProgress(): Promise<OnboardingProgress> {
    const { data } = await axiosInstance.get<OnboardingProgress>("/v1/onboarding-progress")
    return data
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<UserResponse> {
    const { data } = await axiosInstance.patch<UserResponse>("/v1/auth/update-profile", payload)
    return data
  },

  async updatePassword(payload: UpdatePasswordPayload): Promise<void> {
    await axiosInstance.patch("/v1/auth/update-password", payload)
  },
}

export default authApi


