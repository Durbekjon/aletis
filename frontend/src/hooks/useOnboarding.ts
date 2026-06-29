"use client"

import { useOnboardingContext } from "@/src/context/OnboardingContext"

export function useOnboarding() {
  return useOnboardingContext()
}

export default useOnboarding


