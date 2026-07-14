"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { OnboardingData } from "@/lib/types/onboarding"
import { ArrowRight, ExternalLink, Info } from "lucide-react"
import { useOnboarding } from "@/src/hooks/useOnboarding"
import { useTranslation } from "@/src/context/I18nContext"

interface BotConnectionStepProps {
  data: OnboardingData
  onUpdate: (data: Partial<OnboardingData>) => void
  onNext: () => void
  onSkip: () => void
}

export function BotConnectionStep({ data, onUpdate, onNext, onSkip }: BotConnectionStepProps) {
  const { t } = useTranslation()
  const [botToken, setBotToken] = useState(data.botToken || "")
  const { connectAndStartBot, loading, error } = useOnboarding()

  const handleNext = async () => {
    onUpdate({ botToken: botToken.trim() })
    if (!botToken.trim()) {
      onNext()
      return
    }
    try {
      await connectAndStartBot(botToken.trim())
      onNext()
    } catch {
      // error displayed below
    }
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {t("onboarding.bot.recommend")}
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="botToken">{t("onboarding.bot.tokenLabel")}</Label>
        <Input
          id="botToken"
          placeholder={t("onboarding.bot.tokenPlaceholder")}
          value={botToken}
          onChange={(e) => setBotToken(e.target.value)}
        />
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{t("onboarding.bot.needHelp")}</span>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-primary"
            onClick={() => window.open("https://core.telegram.org/bots#creating-a-new-bot", "_blank")}
          >
            {t("onboarding.bot.howToGet")}
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={onSkip} variant="outline" className="flex-1 bg-transparent">
          {t("onboarding.skipForNow")}
        </Button>
        <Button onClick={handleNext} disabled={loading} className="flex-1 flex items-center gap-2">
          {t("onboarding.continue")}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
