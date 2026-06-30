"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import type { OnboardingData, OnboardingStep } from "@/lib/types/onboarding"
import { OrganizationStep } from "@/components/onboarding/organization-step"
import { BotConnectionStep } from "@/components/onboarding/bot-connection-step"
import { CategoryStep } from "@/components/onboarding/category-step"
import { ProductSchemaStep } from "@/components/onboarding/product-schema-step"
import { FirstProductStep } from "@/components/onboarding/first-product-step"
import { CompletionStep } from "@/components/onboarding/completion-step"
import { OnboardingProvider } from "@/src/context/OnboardingContext"
import { OnboardingStep as BackendOnboardingStep } from "@/src/api/authApi"
import authApi from "@/src/api/authApi"
import Image from "next/image"

const ONBOARDING_STEPS: OnboardingStep[] = [
  { id: 1, title: "Organization Name", description: "Tell us about your business", isComplete: false },
  { id: 2, title: "Choose Category", description: "Select your business type", isComplete: false },
  { id: 3, title: "Configure Product Schema", description: "Set up your product fields", isComplete: false },
  { id: 4, title: "Create First Product", description: "Add your first product", isComplete: false },
  {
    id: 5,
    title: "Connect Telegram Bot",
    description: "Connect your Telegram bot using Telegram Bot Token",
    isComplete: false,
    isOptional: true,
  },
  { id: 6, title: "Completion", description: "You're all set!", isComplete: false },
]

const STEP_MAPPING: Record<BackendOnboardingStep, number> = {
  [BackendOnboardingStep.SELECT_CATEGORY]: 2,
  [BackendOnboardingStep.CONFIGURE_SCHEMA]: 3,
  [BackendOnboardingStep.ADD_FIRST_PRODUCT]: 4,
  [BackendOnboardingStep.CONNECT_BOT]: 5,
}

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [steps, setSteps] = useState(ONBOARDING_STEPS)
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    organizationName: "",
    organizationDescription: "",
    botToken: "",
    category: "",
    productSchema: [],
    firstProduct: {
      name: "",
      price: 0,
      quantity: 0,
      description: "",
      images: [],
      currency: "USD" as "USD" | "EUR" | "UZS" | "RUB" | "KZT" | "GBP" | "JPY",
    },
  })
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const stepParam = searchParams.get("step")
    if (stepParam && stepParam in STEP_MAPPING) {
      const stepNumber = STEP_MAPPING[stepParam as BackendOnboardingStep]
      setCurrentStep(stepNumber)
    }
  }, [searchParams])

  const updateOnboardingData = (data: Partial<OnboardingData>) => {
    setOnboardingData((prev) => ({ ...prev, ...data }))
  }

  const markStepComplete = (stepId: number) => {
    setSteps((prev) => prev.map((step) => (step.id === stepId ? { ...step, isComplete: true } : step)))
  }

  const handleNext = async () => {
    if (currentStep < 6) {
      markStepComplete(currentStep)
      try {
        if (currentStep === 2) {
          await authApi.updateOnboardingProgress(BackendOnboardingStep.SELECT_CATEGORY)
        } else if (currentStep === 3) {
          await authApi.updateOnboardingProgress(BackendOnboardingStep.CONFIGURE_SCHEMA)
        } else if (currentStep === 4) {
          await authApi.updateOnboardingProgress(BackendOnboardingStep.ADD_FIRST_PRODUCT)
        }
      } catch (error) {
        console.error("Failed to update onboarding progress:", error)
      }
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = async () => {
    const currentStepData = steps.find((step) => step.id === currentStep)
    if (currentStepData?.isOptional) {
      if (currentStep === 5) {
        try {
          await authApi.updateOnboardingProgress(BackendOnboardingStep.CONNECT_BOT)
        } catch (error) {
          console.error("Failed to update onboarding progress:", error)
        }
      }
      handleNext()
    }
  }

  const handleComplete = () => {
    router.push("/dashboard")
  }

  const currentStepData = steps.find((step) => step.id === currentStep)
  const progress = ((currentStep - 1) / 6) * 100

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <OrganizationStep data={onboardingData} onUpdate={updateOnboardingData} onNext={handleNext} />
      case 2:
        return <CategoryStep data={onboardingData} onUpdate={updateOnboardingData} onNext={handleNext} />
      case 3:
        return <ProductSchemaStep data={onboardingData} onUpdate={updateOnboardingData} onNext={handleNext} />
      case 4:
        return <FirstProductStep data={onboardingData} onUpdate={updateOnboardingData} onNext={handleNext} />
      case 5:
        return (
          <BotConnectionStep
            data={onboardingData}
            onUpdate={updateOnboardingData}
            onNext={handleNext}
            onSkip={handleSkip}
          />
        )
      case 6:
        return <CompletionStep data={onboardingData} onComplete={handleComplete} />
      default:
        return null
    }
  }

  return (
    <div className="relative z-10 min-h-screen p-4 py-8">
      <div className="max-w-4xl mx-auto">
        <OnboardingProvider>
          {/* Header */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <Image src="/images/aletis-logo.jpg" alt="aletis logo" width={32} height={32} className="rounded-md" />
            <span className="text-2xl font-bold">Aletis</span>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Step {currentStep} of 6</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Content */}
          <Card className="lp-auth-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {currentStepData?.title}
                {currentStepData?.isOptional && (
                  <span className="text-sm font-normal text-muted-foreground">(Optional)</span>
                )}
              </CardTitle>
              <p className="text-muted-foreground">{currentStepData?.description}</p>
            </CardHeader>
            <CardContent>{renderStepContent()}</CardContent>
          </Card>

          {/* Navigation */}
          {currentStep < 6 && (
            <div className="flex items-center justify-end mt-6">
              <div className="flex items-center gap-2">
                {currentStepData?.isOptional && (
                  <Button variant="ghost" onClick={handleSkip}>
                    Skip
                  </Button>
                )}
              </div>
            </div>
          )}
        </OnboardingProvider>
      </div>
    </div>
  )
}
