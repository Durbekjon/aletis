"use client"

import { useEffect } from "react"
import { useAuthContext } from "@/src/context/AuthContext"

export function useAuth() {
  const { user, loading, isAuthenticated, login, logout, register, getUser } = useAuthContext()

  useEffect(() => {
    // Ensure user is fetched on mount without causing flicker
    void getUser()
  }, [getUser])

  return { user, loading, isAuthenticated, login, logout, register }
}

export default useAuth


