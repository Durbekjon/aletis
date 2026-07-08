"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { OnboardingData } from "@/lib/types/onboarding"
import { BUSINESS_CATEGORIES } from "@/lib/constants"
import { ArrowRight, Sparkles } from "lucide-react"
import { useOnboarding } from "@/src/hooks/useOnboarding"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useTranslation } from "@/src/context/I18nContext"

interface CategoryStepProps {
  data: OnboardingData
  onUpdate: (data: Partial<OnboardingData>) => void
  onNext: () => void
}

export function CategoryStep({ data, onUpdate, onNext }: CategoryStepProps) {
  const { t } = useTranslation()
  const [category, setCategory] = useState(data.category)
  const { updateCategory, loading, error } = useOnboarding()
  const selectRef = useRef<HTMLButtonElement>(null)

  // Auto-focus select on mount
  useEffect(() => {
    if (selectRef.current) {
      selectRef.current.focus()
    }
  }, [])

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading && category) {
      e.preventDefault()
      handleNext()
    }
  }

  const handleNext = async () => {
    if (!category) return
    onUpdate({ category })
    try {
      await updateCategory(category.toUpperCase())
      onNext()
    } catch {
      // error surfaced via context
    }
  }

  const handleSelectCategory = (value: string) => {
    setCategory(value)
  }

  return (
    <div className="space-y-6" onKeyDown={handleKeyPress}>
      {/* {suggestedCategory && !category && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-medium text-primary">AI Suggestion</span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Based on your organization name, we suggest:{" "}
            <strong>{suggestedCategory.charAt(0).toUpperCase() + suggestedCategory.slice(1)}</strong>
          </p>
          <Button variant="outline" size="sm" onClick={() => setCategory(suggestedCategory)}>
            Use Suggestion
          </Button>
        </div>
      )} */}

      <div className="space-y-2">
        <Label htmlFor="category">{t("onboarding.categoryStep.label")} *</Label>
        <Select value={category} onValueChange={(value) => handleSelectCategory(value as string)}>
          <SelectTrigger ref={selectRef} className="w-full">
            <SelectValue placeholder={t("onboarding.categoryStep.placeholder")} />
          </SelectTrigger>
          <SelectContent>
            {BUSINESS_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {t("onboarding.categoryStep.help")}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button onClick={handleNext} disabled={!category || loading} className="w-full flex items-center gap-2">
        {t("onboarding.continue")}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
