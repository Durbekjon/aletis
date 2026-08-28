"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Package, Truck, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "@/src/context/I18nContext"
import { useFulfillmentSettingsQuery, useUpsertFulfillmentSettingsMutation } from "@/src/hooks/useFulfillmentSettings"
import type {
  FulfillmentMode,
  DeliveryMethod,
  DeliveryFeeType,
  FulfillmentSettings,
} from "@/src/api/organizationApi"

interface FulfillmentSettingsTabProps {
  orgId: number
  orgCurrency?: string
}

interface FormState {
  fulfillmentMode: FulfillmentMode
  deliveryMethod: DeliveryMethod | null
  deliveryFeeType: DeliveryFeeType | null
  deliveryFee: string
  pickupAddress: string
  pickupInstructions: string
}

function settingsToForm(settings: FulfillmentSettings | null): FormState {
  if (!settings) {
    return {
      fulfillmentMode: "PICKUP_ONLY",
      deliveryMethod: null,
      deliveryFeeType: null,
      deliveryFee: "",
      pickupAddress: "",
      pickupInstructions: "",
    }
  }
  return {
    fulfillmentMode: settings.fulfillmentMode,
    deliveryMethod: settings.deliveryMethod,
    deliveryFeeType: settings.deliveryFeeType,
    deliveryFee: settings.deliveryFee != null ? String(settings.deliveryFee) : "",
    pickupAddress: settings.pickupAddress ?? "",
    pickupInstructions: settings.pickupInstructions ?? "",
  }
}

export function FulfillmentSettingsTab({ orgId, orgCurrency = "UZS" }: FulfillmentSettingsTabProps) {
  const { t } = useTranslation()
  const { data: settings, isLoading, error } = useFulfillmentSettingsQuery(orgId)
  const mutation = useUpsertFulfillmentSettingsMutation()

  const [form, setForm] = useState<FormState>(settingsToForm(null))
  const [initialized, setInitialized] = useState(false)

  // Sync form when data loads
  useEffect(() => {
    if (!isLoading && !initialized) {
      setForm(settingsToForm(settings ?? null))
      setInitialized(true)
    }
  }, [settings, isLoading, initialized])

  const deliveryEnabled =
    form.fulfillmentMode === "DELIVERY" || form.fulfillmentMode === "PICKUP_AND_DELIVERY"
  const pickupEnabled =
    form.fulfillmentMode === "PICKUP_ONLY" || form.fulfillmentMode === "PICKUP_AND_DELIVERY"

  // When mode changes, reset irrelevant fields
  const handleModeChange = (mode: FulfillmentMode) => {
    setForm((prev) => ({
      ...prev,
      fulfillmentMode: mode,
      // Clear delivery if no longer needed
      deliveryMethod:
        mode === "PICKUP_ONLY" ? null : prev.deliveryMethod,
      deliveryFeeType:
        mode === "PICKUP_ONLY" ? null : prev.deliveryFeeType,
      deliveryFee: mode === "PICKUP_ONLY" ? "" : prev.deliveryFee,
      // Clear pickup if no longer needed
      pickupAddress: mode === "DELIVERY" ? "" : prev.pickupAddress,
      pickupInstructions: mode === "DELIVERY" ? "" : prev.pickupInstructions,
    }))
  }

  const handleSave = async () => {
    // Client-side validation
    if (deliveryEnabled) {
      if (!form.deliveryMethod) {
        toast.error(t("settings.fulfillment.errors.deliveryMethodRequired"))
        return
      }
      if (!form.deliveryFeeType) {
        toast.error(t("settings.fulfillment.errors.feeTypeRequired"))
        return
      }
      if (form.deliveryFeeType === "FIXED") {
        const amount = parseFloat(form.deliveryFee)
        if (!form.deliveryFee || isNaN(amount) || amount <= 0) {
          toast.error(t("settings.fulfillment.errors.feeAmountRequired"))
          return
        }
      }
    }

    await mutation.mutateAsync(
      {
        orgId,
        payload: {
          fulfillmentMode: form.fulfillmentMode,
          deliveryMethod: deliveryEnabled ? form.deliveryMethod : null,
          deliveryFeeType: deliveryEnabled ? form.deliveryFeeType : null,
          deliveryFee:
            deliveryEnabled && form.deliveryFeeType === "FIXED" && form.deliveryFee
              ? parseFloat(form.deliveryFee)
              : null,
          pickupAddress: pickupEnabled ? (form.pickupAddress || null) : null,
          pickupInstructions: pickupEnabled ? (form.pickupInstructions || null) : null,
        },
      },
      {
        onSuccess: () => {
          toast.success(t("settings.fulfillment.saveSuccess"))
        },
      },
    )
  }

  if (isLoading) {
    return (
      <Card className="lp-glass-card">
        <CardContent className="pt-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-3/4" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{t("settings.fulfillment.errors.load")}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className="lp-glass-card">
      <CardHeader>
        <CardTitle>{t("settings.fulfillment.cardTitle")}</CardTitle>
        <CardDescription>{t("settings.fulfillment.cardDescription")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Not configured banner */}
        {!settings && (
          <Alert className="border-amber-500/30 bg-amber-500/10">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-600 dark:text-amber-400">
              <span className="font-medium">{t("settings.fulfillment.notConfiguredTitle")}</span>
              {" — "}
              {t("settings.fulfillment.notConfiguredDesc")}
            </AlertDescription>
          </Alert>
        )}

        {/* ─── Fulfillment Mode ─────────────────────────────────────────── */}
        <div className="space-y-3">
          <div>
            <Label className="text-base font-semibold">{t("settings.fulfillment.modeLabel")}</Label>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("settings.fulfillment.modeDescription")}
            </p>
          </div>
          <RadioGroup
            value={form.fulfillmentMode}
            onValueChange={(v) => handleModeChange(v as FulfillmentMode)}
            className="space-y-2"
          >
            {(["PICKUP_ONLY", "DELIVERY", "PICKUP_AND_DELIVERY"] as FulfillmentMode[]).map((mode) => (
              <div key={mode} className="flex items-center space-x-3 rounded-lg border border-border/50 p-3 hover:border-border transition-colors cursor-pointer">
                <RadioGroupItem value={mode} id={`mode-${mode}`} />
                <Label htmlFor={`mode-${mode}`} className="cursor-pointer flex items-center gap-2 font-normal">
                  {mode === "PICKUP_ONLY" && <Package className="h-4 w-4 text-muted-foreground" />}
                  {mode === "DELIVERY" && <Truck className="h-4 w-4 text-muted-foreground" />}
                  {mode === "PICKUP_AND_DELIVERY" && (
                    <span className="flex gap-1">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <Truck className="h-4 w-4 text-muted-foreground" />
                    </span>
                  )}
                  {t(`settings.fulfillment.modes.${mode}`)}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* ─── Delivery Settings ───────────────────────────────────────── */}
        {deliveryEnabled && (
          <>
            <Separator />
            <div className="space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Truck className="h-4 w-4" />
                {t("settings.fulfillment.deliverySection")}
              </h3>

              {/* Delivery Method */}
              <div className="space-y-2">
                <Label>{t("settings.fulfillment.methodLabel")}</Label>
                <RadioGroup
                  value={form.deliveryMethod ?? ""}
                  onValueChange={(v) => setForm((f) => ({ ...f, deliveryMethod: v as DeliveryMethod }))}
                  className="space-y-2"
                >
                  {(["MERCHANT", "EXTERNAL_COURIER"] as DeliveryMethod[]).map((method) => (
                    <div key={method} className="flex items-center space-x-3 rounded-lg border border-border/50 p-3 hover:border-border transition-colors">
                      <RadioGroupItem value={method} id={`method-${method}`} />
                      <Label htmlFor={`method-${method}`} className="cursor-pointer font-normal">
                        {t(`settings.fulfillment.methods.${method}`)}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Delivery Fee */}
              <div className="space-y-2">
                <Label>{t("settings.fulfillment.feeLabel")}</Label>
                <RadioGroup
                  value={form.deliveryFeeType ?? ""}
                  onValueChange={(v) => setForm((f) => ({
                    ...f,
                    deliveryFeeType: v as DeliveryFeeType,
                    deliveryFee: v !== "FIXED" ? "" : f.deliveryFee,
                  }))}
                  className="space-y-2"
                >
                  {(["FREE", "FIXED", "CUSTOMER_PAYS_SEPARATELY"] as DeliveryFeeType[]).map((feeType) => (
                    <div key={feeType} className="flex items-center space-x-3 rounded-lg border border-border/50 p-3 hover:border-border transition-colors">
                      <RadioGroupItem value={feeType} id={`fee-${feeType}`} />
                      <Label htmlFor={`fee-${feeType}`} className="cursor-pointer font-normal">
                        {t(`settings.fulfillment.feeTypes.${feeType}`)}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                {/* Fixed fee amount input */}
                {form.deliveryFeeType === "FIXED" && (
                  <div className="mt-3 space-y-1">
                    <Label htmlFor="delivery-fee-amount">
                      {t("settings.fulfillment.feeAmountLabel")}
                    </Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="delivery-fee-amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder={t("settings.fulfillment.feeAmountPlaceholder")}
                        value={form.deliveryFee}
                        onChange={(e) => setForm((f) => ({ ...f, deliveryFee: e.target.value }))}
                        className="max-w-[200px]"
                      />
                      <span className="text-sm text-muted-foreground font-medium">{orgCurrency}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ─── Pickup Information ──────────────────────────────────────── */}
        {pickupEnabled && (
          <>
            <Separator />
            <div className="space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                {t("settings.fulfillment.pickupSection")}
              </h3>

              <div className="space-y-2">
                <Label htmlFor="pickup-address">{t("settings.fulfillment.pickupAddressLabel")}</Label>
                <Input
                  id="pickup-address"
                  placeholder={t("settings.fulfillment.pickupAddressPlaceholder")}
                  value={form.pickupAddress}
                  onChange={(e) => setForm((f) => ({ ...f, pickupAddress: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pickup-instructions">
                  {t("settings.fulfillment.pickupInstructionsLabel")}
                </Label>
                <Textarea
                  id="pickup-instructions"
                  placeholder={t("settings.fulfillment.pickupInstructionsPlaceholder")}
                  value={form.pickupInstructions}
                  onChange={(e) => setForm((f) => ({ ...f, pickupInstructions: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          </>
        )}

        <Separator />

        <Button
          onClick={handleSave}
          disabled={mutation.isPending}
          id="save-fulfillment-settings"
        >
          {mutation.isPending
            ? t("settings.fulfillment.saving")
            : t("settings.fulfillment.save")}
        </Button>
      </CardContent>
    </Card>
  )
}
