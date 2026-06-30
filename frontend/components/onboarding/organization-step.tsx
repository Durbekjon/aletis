"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { OnboardingData } from "@/lib/types/onboarding"
import { ArrowRight } from "lucide-react"
import { useOnboarding } from "@/src/hooks/useOnboarding"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface OrganizationStepProps {
  data: OnboardingData
  onUpdate: (data: Partial<OnboardingData>) => void
  onNext: () => void
}

const MAX_DESCRIPTION_LENGTH = 500

export function OrganizationStep({ data, onUpdate, onNext }: OrganizationStepProps) {
  const [organizationName, setOrganizationName] = useState(data.organizationName)
  const [description, setDescription] = useState(data.organizationDescription ?? "")
  const { createOrganization, loading, error } = useOnboarding()
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleNext = async () => {
    if (!organizationName.trim()) return
    onUpdate({ organizationName: organizationName.trim(), organizationDescription: description.trim() || undefined })
    try {
      await createOrganization(organizationName.trim(), description.trim() || undefined)
      onNext()
    } catch {
      // error handled in context
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading && organizationName.trim()) {
      e.preventDefault()
      handleNext()
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="organizationName">Organization Name *</Label>
        <Input
          id="organizationName"
          ref={inputRef}
          placeholder="Enter your business name"
          value={organizationName}
          onChange={(e) => setOrganizationName(e.target.value)}
          onKeyDown={handleKeyPress}
          className="text-lg"
        />
        <p className="text-sm text-muted-foreground">This will be displayed to your customers and used in your bot</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="organizationDescription">
          About your business <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="organizationDescription"
          placeholder="e.g. We sell premium electronics and accessories in Tashkent. We focus on quality and fast delivery."
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
          rows={4}
          className="resize-none"
        />
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Help the AI understand your business so it can answer as your sales agent
          </p>
          <span className={`text-xs ${description.length >= MAX_DESCRIPTION_LENGTH ? "text-destructive" : "text-muted-foreground"}`}>
            {description.length}/{MAX_DESCRIPTION_LENGTH}
          </span>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button onClick={handleNext} disabled={!organizationName.trim() || loading} className="w-full flex items-center gap-2">
        Continue
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
