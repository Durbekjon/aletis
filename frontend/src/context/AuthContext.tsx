"use client"

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import authApi, { LoginPayload, RegisterPayload, LoginResponse, OnboardingStep } from "@/src/api/authApi"
import { clearStoredTokens, setStoredTokens, getErrorMessage } from "@/src/api/client"
import { useRouter } from "next/navigation"

type AuthUser = {
  id: number
  email: string
  firstName: string
  lastName: string
  platformRole?: "STAFF" | "SUPERADMIN" | null
}

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
  refreshTokens: () => Promise<void>
  getUser: () => Promise<AuthUser | null>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasFetchedUserRef = useRef(false)
  const router = useRouter()
  const queryClient = useQueryClient()

  const handleAuthRedirect = useCallback((loginResponse: LoginResponse) => {
    if (!loginResponse.hasOrganization) {
      // No organization - redirect to onboarding
      router.push("/onboarding")
    } else if (loginResponse.organization?.onboardingProgress.status === "INCOMPLETE") {
      // Has organization but onboarding incomplete - redirect to specific step
      const nextStep = loginResponse.organization.onboardingProgress.nextStep
      router.push(`/onboarding?step=${nextStep}`)
    } else {
      // Onboarding complete - redirect to dashboard
      router.push("/dashboard")
    }
  }, [router])

  const fetchUser = useCallback(async () => {
    try {
      const me = await authApi.me()
      setUser(me)
      // sync React Query cache to avoid duplicate /me fetches elsewhere
      queryClient.setQueryData(["user"], me)
      return me
    } catch (e) {
      setUser(null)
      return null
    }
  }, [queryClient])

  const initialize = useCallback(async () => {
    setLoading(true)
    try {
      if (!hasFetchedUserRef.current) {
        hasFetchedUserRef.current = true
        await fetchUser()
      }
    } finally {
      setLoading(false)
    }
  }, [fetchUser])

  useEffect(() => {
    void initialize()
  }, [initialize])

  const login = useCallback(async (email: string, password: string) => {
    setError(null)
    try {
      const loginResponse = await authApi.login({ email, password } as LoginPayload)
      await fetchUser()
      handleAuthRedirect(loginResponse)
    } catch (e) {
      const msg = getErrorMessage(e)
      setError(msg)
      throw e
    }
  }, [fetchUser, handleAuthRedirect])

  const register = useCallback(async (payload: RegisterPayload) => {
    setError(null)
    try {
      const loginResponse = await authApi.register(payload)
      await fetchUser()
      handleAuthRedirect(loginResponse)
    } catch (e) {
      const msg = getErrorMessage(e)
      setError(msg)
      throw e
    }
  }, [fetchUser, handleAuthRedirect])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch (e) {
      // even if logout fails, we clear tokens locally
      setError(getErrorMessage(e))
    } finally {
      clearStoredTokens()
      setUser(null)
      // Redirect to login page
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
    }
  }, [])

  const refreshTokens = useCallback(async () => {
    // The axios interceptor handles refresh automatically; we expose for explicit calls if needed
    await fetchUser()
  }, [fetchUser])

  const getUser = useCallback(async () => {
    if (user) return user
    return await fetchUser()
  }, [user, fetchUser])

  const value: AuthContextValue = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshTokens,
    getUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider")
  return ctx
}


