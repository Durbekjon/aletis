"use client"

import { useState } from "react"
import { useTranslation } from "@/src/context/I18nContext"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Crown,
  Zap,
  Users,
  MessageSquare,
  Package,
  Bot,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Check,
} from "lucide-react"
import {
  useBillingDashboard,
  useBillingPlans,
  useInvoices,
  useChangePlan,
  useCancelSubscription,
} from "@/src/hooks/useBilling"
import type { PlanTier, SubscriptionStatus, InvoiceStatus } from "@/src/api/billingApi"

function getStatusBadge(status: SubscriptionStatus | InvoiceStatus | string, t: (key: string) => string) {
  const map: Record<string, { key: string; color: string; icon: React.ElementType }> = {
    ACTIVE:    { key: "active",    color: "bg-primary",    icon: CheckCircle },
    TRIALING:  { key: "trial",     color: "bg-blue-500",   icon: Zap },
    PAST_DUE:  { key: "pastDue",   color: "bg-yellow-500", icon: Clock },
    CANCELLED: { key: "cancelled", color: "bg-red-500",    icon: AlertCircle },
    PAID:      { key: "paid",      color: "bg-primary",    icon: CheckCircle },
    OPEN:      { key: "pending",   color: "bg-yellow-500", icon: Clock },
    DRAFT:     { key: "draft",     color: "bg-gray-400",   icon: Clock },
    VOID:      { key: "void",      color: "bg-gray-500",   icon: AlertCircle },
  }
  const config = map[status.toUpperCase()]
  if (!config) return null
  const Icon = config.icon
  return (
    <Badge variant="outline" className={`${config.color} text-white flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {t(`billing.status.${config.key}`)}
    </Badge>
  )
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

function formatLimit(limit: number, t: (key: string) => string) {
  return limit === -1 ? t("billing.unlimited") : limit.toLocaleString()
}

function usagePercent(current: number, limit: number) {
  if (limit === -1) return 0
  return Math.min((current / limit) * 100, 100)
}

export default function BillingPage() {
  const { t } = useTranslation()
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false)

  const { data: dashboard, isLoading: dashLoading } = useBillingDashboard()
  const { data: plans, isLoading: plansLoading } = useBillingPlans()
  const { data: invoices, isLoading: invoicesLoading } = useInvoices()
  const changePlan = useChangePlan()
  const cancelSub = useCancelSubscription()

  const handleChangePlan = async (tier: PlanTier) => {
    await changePlan.mutateAsync(tier)
    setIsUpgradeDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('billing.title')}</h1>
          <p className="text-muted-foreground">{t('billing.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LanguageSwitcher />
          <Button onClick={() => setIsUpgradeDialogOpen(true)}>
            <Crown className="h-4 w-4 mr-2" />
            {t('billing.upgradePlan')}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">{t('billing.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="usage">{t('billing.tabs.usage')}</TabsTrigger>
          <TabsTrigger value="invoices">{t('billing.tabs.invoices')}</TabsTrigger>
        </TabsList>

        {/* ── Overview ─────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                {t('billing.currentPlan')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashLoading || !dashboard ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-bold">{dashboard.plan.name}</h3>
                      {getStatusBadge(dashboard.subscription.status, t)}
                    </div>
                    {dashboard.subscription.status === "TRIALING" && dashboard.subscription.trialEndsAt && (
                      <p className="text-sm text-blue-600">
                        {t('billing.trialEnds', { date: formatDate(dashboard.subscription.trialEndsAt) })}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        <DollarSign className="h-4 w-4 inline mr-1" />
                        {dashboard.plan.priceUsd === 0 ? t('billing.free') : `$${dashboard.plan.priceUsd}${t('billing.perMonth')}`}
                      </span>
                      <span>
                        <Calendar className="h-4 w-4 inline mr-1" />
                        {dashboard.subscription.cancelAtPeriodEnd
                          ? t('billing.cancels', { date: formatDate(dashboard.subscription.currentPeriodEnd) })
                          : t('billing.renews', { date: formatDate(dashboard.subscription.currentPeriodEnd) })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">
                      {dashboard.plan.priceUsd === 0 ? t('billing.free') : `$${dashboard.plan.priceUsd}`}
                    </div>
                    {dashboard.plan.priceUsd > 0 && (
                      <div className="text-sm text-muted-foreground">{t('billing.perMonthLabel')}</div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick usage cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {dashLoading || !dashboard ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)
            ) : (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('billing.aiConversations')}</CardTitle>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboard.usage.aiConvos.current}</div>
                    <Progress value={usagePercent(dashboard.usage.aiConvos.current, dashboard.usage.aiConvos.limit)} className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {dashboard.usage.aiConvos.current.toLocaleString()} / {formatLimit(dashboard.usage.aiConvos.limit, t)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('billing.products')}</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboard.usage.products.current}</div>
                    <Progress value={usagePercent(dashboard.usage.products.current, dashboard.usage.products.limit)} className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {dashboard.usage.products.current.toLocaleString()} / {formatLimit(dashboard.usage.products.limit, t)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('billing.bots')}</CardTitle>
                    <Bot className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboard.usage.bots.current}</div>
                    <Progress value={usagePercent(dashboard.usage.bots.current, dashboard.usage.bots.limit)} className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {dashboard.usage.bots.current} / {formatLimit(dashboard.usage.bots.limit, t)}
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>

        {/* ── Usage ────────────────────────────────────────────── */}
        <TabsContent value="usage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('billing.usageDetails')}</CardTitle>
              <CardDescription>{t('billing.usageDetailsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {dashLoading || !dashboard ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                [
                  { key: t('billing.aiConversations'), icon: MessageSquare, stat: dashboard.usage.aiConvos },
                  { key: t('billing.products'), icon: Package, stat: dashboard.usage.products },
                  { key: t('billing.bots'), icon: Bot, stat: dashboard.usage.bots },
                  { key: t('billing.teamMembers'), icon: Users, stat: dashboard.usage.teamMembers },
                ].map(({ key, icon: Icon, stat }) => {
                  const pct = usagePercent(stat.current, stat.limit)
                  const isNear = pct > 80 && stat.limit !== -1
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span className="font-medium">{key}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {stat.current.toLocaleString()} / {formatLimit(stat.limit, t)}
                        </span>
                      </div>
                      <Progress value={pct} className={isNear ? "bg-red-100" : ""} />
                      {isNear && (
                        <p className="text-xs text-red-600">{t('billing.approachingLimit')}</p>
                      )}
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Invoices ─────────────────────────────────────────── */}
        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('billing.invoiceHistory')}</CardTitle>
              <CardDescription>{t('billing.invoiceHistoryDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : !invoices || invoices.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">{t('billing.noInvoices')}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('billing.table.invoice')}</TableHead>
                      <TableHead>{t('billing.table.status')}</TableHead>
                      <TableHead>{t('billing.table.amount')}</TableHead>
                      <TableHead>{t('billing.table.period')}</TableHead>
                      <TableHead>{t('billing.table.dueDate')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                        <TableCell>{getStatusBadge(inv.status, t)}</TableCell>
                        <TableCell>
                          ${(inv.amountUsd + inv.overageAmountUsd).toFixed(2)}
                          {inv.overageAmountUsd > 0 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              {t('billing.overageIncl', { amount: inv.overageAmountUsd.toFixed(2) })}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {inv.paidAt ? formatDate(inv.paidAt) : formatDate(inv.dueDate)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Upgrade Dialog ─────────────────────────────────────── */}
      <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
        <DialogContent className="sm:max-w-240 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('billing.chooseYourPlan')}</DialogTitle>
            <DialogDescription>{t('billing.chooseYourPlanDesc')}</DialogDescription>
          </DialogHeader>
          {plansLoading || !plans ? (
            <div className="grid gap-6 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-4">
              {plans.map((plan) => {
                const isCurrent = dashboard?.plan.tier === plan.tier
                const isPopular = plan.tier === "GROWTH"
                return (
                  <Card key={plan.id} className={`relative ${isPopular ? "border-primary" : ""}`}>
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary">{t('billing.mostPopular')}</Badge>
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {plan.tier === "SCALE" && <Crown className="h-4 w-4" />}
                        {plan.name}
                      </CardTitle>
                      <div className="text-3xl font-bold">
                        {plan.priceUsd === 0 ? t('billing.free') : `$${plan.priceUsd}`}
                        {plan.priceUsd > 0 && <span className="text-sm font-normal text-muted-foreground">{t('billing.perMonthShort')}</span>}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-2">
                        {((t(`billing.planFeatures.${plan.tier}`, { returnObjects: true }) as string[]) ?? []).map((f, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <Button
                        className="w-full"
                        variant={isCurrent ? "outline" : "default"}
                        disabled={isCurrent || changePlan.isPending}
                        onClick={() => handleChangePlan(plan.tier)}
                      >
                        {isCurrent ? t('billing.currentPlanBtn') : t('billing.switchTo', { name: plan.name })}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {dashboard && !dashboard.subscription.cancelAtPeriodEnd &&
            dashboard.subscription.status !== "CANCELLED" &&
            dashboard.plan.priceUsd > 0 && (
              <div className="flex justify-end mt-4">
                <Button
                  variant="ghost"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => cancelSub.mutate()}
                  disabled={cancelSub.isPending}
                >
                  {t('billing.cancelSubscription')}
                </Button>
              </div>
            )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
