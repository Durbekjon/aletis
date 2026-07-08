"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { OnboardingData } from "@/lib/types/onboarding"
import { CheckCircle, Bot, ArrowRight, ExternalLink } from "lucide-react"
import { useTranslation } from "@/src/context/I18nContext"

interface CompletionStepProps {
  data: OnboardingData
  onComplete: () => void
}

export function CompletionStep({ data, onComplete }: CompletionStepProps) {
  const { t } = useTranslation()
  const handlePreviewBot = () => {
    // TODO: Open Telegram bot preview
    window.open(`https://t.me/${data.botToken?.split(":")[0]}`, "_blank")
  }

  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-2">{t("onboarding.completionStep.congrats")}</h2>
        <p className="text-muted-foreground">{t("onboarding.completionStep.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("onboarding.completionStep.summary")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-left">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("onboarding.completionStep.organization")}:</span>
            <span className="font-medium">{data.organizationName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("onboarding.completionStep.category")}:</span>
            <span className="font-medium capitalize">{data.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("onboarding.completionStep.botConnected")}:</span>
            <span className="font-medium">{data.botToken ? t("onboarding.completionStep.yes") : t("onboarding.completionStep.no")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Product Fields:</span>
            <span className="font-medium">{data.productSchema.length} fields</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">First Product:</span>
            <span className="font-medium">{data.firstProduct.name}</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Button onClick={onComplete} className="w-full flex items-center gap-2" size="lg">
          {t("onboarding.completionStep.goDashboard")}
          <ArrowRight className="h-4 w-4" />
        </Button>

        {data.botToken && (
          <Button
            variant="outline"
            onClick={handlePreviewBot}
            className="w-full flex items-center gap-2 bg-transparent"
          >
            <Bot className="h-4 w-4" />
            {t("onboarding.completionStep.previewBot")}
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">{t("onboarding.completionStep.footer")}</p>
    </div>
  )
}
