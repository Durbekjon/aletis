"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { setStoredTokens } from "@/src/api/client"

export default function AuthCallbackPage() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const bearer = params.get("bearer")
    const refresh = params.get("refresh")
    const hasOrganization = params.get("hasOrganization")
    const orgId = params.get("orgId")
    const orgName = params.get("orgName")
    const onboardPercent = params.get("onboardPercent")
    const onboardStep = params.get("onboardStep")
    const onboardStatus = params.get("onboardStatus")
    const onboardBot = params.get("onboardBot")
    const onboardProduct = params.get("onboardProduct")
    const onboardCategory = params.get("onboardCategory")
    const onboardSchema = params.get("onboardSchema")

    if (bearer && refresh) {
      setStoredTokens({ accessToken: bearer, refreshToken: refresh })
      
      // Handle redirect logic based on new parameters
      if (hasOrganization === "false") {
        // No organization - redirect to onboarding
        router.replace("/onboarding")
      } else if (hasOrganization === "true" && onboardStatus === "INCOMPLETE" && onboardStep) {
        // Has organization but onboarding incomplete - redirect to specific step
        router.replace(`/onboarding?step=${onboardStep}`)
      } else {
        // Onboarding complete or no specific step - redirect to dashboard
        router.replace("/dashboard")
      }
    } else {
      router.replace("/login")
    }
  }, [params, router])

  return null
}


