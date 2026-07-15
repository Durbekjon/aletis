"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Megaphone, Plus, Send, Loader2, Users } from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "@/src/context/I18nContext"
import { cn } from "@/lib/utils"
import {
  useCampaigns,
  useCreateCampaign,
  useLaunchCampaign,
  useSegmentPreview,
} from "@/src/hooks/useCampaignsQuery"
import {
  CAMPAIGN_SEGMENTS,
  CampaignSegment,
  CampaignStatus,
} from "@/src/api/campaignsApi"

const STATUS_STYLES: Record<CampaignStatus, string> = {
  DRAFT: "bg-gray-500/15 text-gray-400 border border-gray-500/30",
  SENDING: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  SENT: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  FAILED: "bg-red-500/15 text-red-400 border border-red-500/30",
}

const SEGMENT_STYLES: Record<CampaignSegment, string> = {
  ALL_BUYERS: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
  NEW: "bg-teal-500/15 text-teal-400 border border-teal-500/30",
  VIP: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  AT_RISK: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  DORMANT: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
}

export default function CampaignsPage() {
  const { t, i18n } = useTranslation()
  const locale =
    i18n.language === "ru" ? "ru-RU" : i18n.language === "en" ? "en-US" : "uz-UZ"
  const fmt = (n: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n)
  const fmtDate = (s: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(s))

  const { data: campaigns, isLoading } = useCampaigns()
  const createMutation = useCreateCampaign()
  const launchMutation = useLaunchCampaign()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [segment, setSegment] = useState<CampaignSegment | null>(null)
  const [message, setMessage] = useState("")
  const [incentive, setIncentive] = useState("")
  const [launchingId, setLaunchingId] = useState<number | null>(null)

  const { data: preview } = useSegmentPreview(segment)

  const resetForm = () => {
    setName("")
    setSegment(null)
    setMessage("")
    setIncentive("")
  }

  const handleCreate = async () => {
    if (!name.trim() || !segment) return
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        segment,
        messageTemplate: message.trim() || undefined,
        incentive: incentive.trim() || undefined,
      })
      toast.success(t("campaigns.created"))
      setOpen(false)
      resetForm()
    } catch {
      toast.error(t("campaigns.createError"))
    }
  }

  const handleLaunch = async (id: number) => {
    if (!window.confirm(t("campaigns.confirmLaunch"))) return
    setLaunchingId(id)
    try {
      await launchMutation.mutateAsync(id)
      toast.success(t("campaigns.launched"))
    } catch {
      toast.error(t("campaigns.launchError"))
    } finally {
      setLaunchingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-emerald-400" />
            {t("campaigns.title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-xl">
            {t("campaigns.subtitle")}
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("campaigns.new")}
        </Button>
      </div>

      {/* Campaigns table */}
      <Card className="lp-glass-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="pl-4">{t("campaigns.col.name")}</TableHead>
                <TableHead>{t("campaigns.col.segment")}</TableHead>
                <TableHead>{t("campaigns.col.status")}</TableHead>
                <TableHead>{t("campaigns.col.sent")}</TableHead>
                <TableHead>{t("campaigns.col.created")}</TableHead>
                <TableHead className="text-right pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !campaigns?.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Megaphone className="h-12 w-12 opacity-20" />
                      <p className="text-sm">{t("campaigns.empty")}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="pl-4 py-3 font-semibold text-sm">
                      {c.name}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                          SEGMENT_STYLES[c.segment],
                        )}
                      >
                        {t(`campaigns.segments.${c.segment}`)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                          STATUS_STYLES[c.status],
                        )}
                      >
                        {t(`campaigns.status.${c.status}`)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {fmt(c.sent)}
                        {c.targeted ? ` / ${fmt(c.targeted)}` : ""}
                        {c.failed ? (
                          <span className="text-red-400"> ({fmt(c.failed)})</span>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fmtDate(c.createdAt)}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      {c.status === "DRAFT" ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-1.5"
                          disabled={launchingId === c.id}
                          onClick={() => handleLaunch(c.id)}
                        >
                          {launchingId === c.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          {t("campaigns.launch")}
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("campaigns.create")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("campaigns.name")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("campaigns.namePlaceholder")}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("campaigns.segment")}</Label>
              <Select
                value={segment ?? undefined}
                onValueChange={(v) => setSegment(v as CampaignSegment)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("campaigns.segment")} />
                </SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_SEGMENTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`campaigns.segments.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {segment && preview ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-0.5">
                  <Users className="h-3.5 w-3.5" />
                  {t("campaigns.recipients", { count: preview.count })}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label>{t("campaigns.message")}</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("campaigns.messagePlaceholder")}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("campaigns.incentive")}</Label>
              <Input
                value={incentive}
                onChange={(e) => setIncentive(e.target.value)}
                placeholder={t("campaigns.incentivePlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={createMutation.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                createMutation.isPending || !name.trim() || !segment
              }
              className="gap-2"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {t("campaigns.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
