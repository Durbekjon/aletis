'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RefreshButton } from '@/components/ui/refresh-button';
import { Skeleton } from '@/components/ui/skeleton';
import type { TelegramBot } from '@/lib/types/bot';
import type { ActivityLog, ActivityLogsResponse } from '@/src/api/activityLogsApi';
import { useTranslation } from '@/src/context/I18nContext';
import { useActivityLogsQuery } from '@/src/hooks/useActivityLogs';
import { useBotsQuery } from '@/src/hooks/useBotsQuery';
import { useDashboardSummary } from '@/src/hooks/useDashboardSummary';
import { useOnboardingProgress } from '@/src/hooks/useOnboardingProgress';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  CheckCircle,
  Clock,
  DollarSign,
  Loader2,
  MessageSquare,
  Minus,
  Newspaper,
  Package,
  Plus,
  ShoppingCart,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { useState } from 'react';

/* ─── Activity Logs ─── */

function ActivityIcon({ entityType }: { entityType: string }) {
  const base = 'flex h-8 w-8 items-center justify-center rounded-full';
  switch (entityType) {
    case 'ORDER':
      return (
        <div className={`${base} bg-primary/10`}>
          <ShoppingCart className="h-4 w-4 text-primary" />
        </div>
      );
    case 'CONVERSATION':
      return (
        <div className={`${base} bg-blue-500/10`}>
          <MessageSquare className="h-4 w-4 text-blue-400" />
        </div>
      );
    default:
      return (
        <div className={`${base} bg-purple-500/10`}>
          <Package className="h-4 w-4 text-purple-400" />
        </div>
      );
  }
}

function ActivityLogsSection() {
  const { language } = useTranslation();
  const [page, setPage] = useState(1);
  const { data, isLoading, error, isFetching } = useActivityLogsQuery({
    page,
    limit: 10,
    order: 'desc',
    lang: (language as any) ?? 'uz',
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-sm text-muted-foreground">Failed to load activity logs</p>;
  }

  const resp = data as unknown as ActivityLogsResponse;
  const { items, page: currentPage, totalPages, hasNext, hasPrevious } = resp as any;

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recent activity</p>
      ) : (
        items.map((log: ActivityLog) => (
          <div key={log.id} className="flex items-start gap-3 group">
            <ActivityIcon entityType={log.entityType} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium truncate">{log.message}</p>
                <Badge variant="outline" className="text-[10px] uppercase shrink-0">
                  {log.entityType}
                </Badge>
                <Badge variant="secondary" className="text-[10px] uppercase shrink-0">
                  {log.action}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(log.createdAt).toLocaleString()}
                {log.user?.firstName ? ` • ${log.user.firstName}` : ''}
                {isFetching && ' • Refreshing...'}
              </p>
            </div>
          </div>
        ))
      )}

      {(hasNext || hasPrevious) && (
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <p className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={!hasPrevious || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={!hasNext || isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Stat Card ─── */

function StatCard({
  title,
  icon: Icon,
  iconColor,
  isLoading,
  isError,
  value,
  change,
  sub,
}: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  isLoading: boolean;
  isError: boolean;
  value: string | number;
  change?: string;
  sub?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const isPositive = change?.startsWith('+');
  const isNegative = change?.startsWith('-');

  return (
    <div className="lp-glass-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconColor}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3.5 w-24" />
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{t('dashboard.failedToLoad')}</span>
        </div>
      ) : (
        <>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {change && (
            <div className="flex items-center gap-1 mt-1">
              {isPositive ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
              ) : isNegative ? (
                <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />
              ) : (
                <Minus className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span
                className={`text-xs font-medium ${isPositive ? 'text-primary' : isNegative ? 'text-red-400' : 'text-muted-foreground'}`}
              >
                {change}
              </span>
              {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
            </div>
          )}
          {!change && sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
        </>
      )}
    </div>
  );
}

/* ─── Main Page ─── */

export default function DashboardPage() {
  const { t } = useTranslation();

  const botsQuery = useBotsQuery();
  const bots = botsQuery.data?.items || [];

  const onboardingProgressQuery = useOnboardingProgress();
  const onboardingProgress = onboardingProgressQuery.data;

  const dashboardSummaryQuery = useDashboardSummary();
  const dashboardSummary = dashboardSummaryQuery.data;
  const dashboardLoading = dashboardSummaryQuery.isLoading;
  const dashboardError = !!dashboardSummaryQuery.error;

  const getBotStatusInfo = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return {
          label: t('dashboard.active'),
          color: 'bg-primary/10 text-primary',
          dot: 'bg-primary',
          icon: CheckCircle,
        };
      case 'INACTIVE':
        return {
          label: t('dashboard.inactive'),
          color: 'bg-muted text-muted-foreground',
          dot: 'bg-gray-400',
          icon: Clock,
        };
      case 'ERROR':
        return {
          label: t('dashboard.error'),
          color: 'bg-red-500/10 text-red-400',
          dot: 'bg-red-500',
          icon: XCircle,
        };
      case 'CONNECTING':
        return {
          label: t('dashboard.connecting'),
          color: 'bg-yellow-500/10 text-yellow-400',
          dot: 'bg-yellow-500',
          icon: Loader2,
        };
      default:
        return {
          label: t('dashboard.unknown'),
          color: 'bg-muted text-muted-foreground',
          dot: 'bg-gray-400',
          icon: AlertCircle,
        };
    }
  };

  const quickActions = [
    { href: '/products/new', icon: Package, label: t('dashboard.addNewProduct') },
    { href: '/orders', icon: ShoppingCart, label: t('dashboard.viewOrders') },
    { href: '/posts', icon: Newspaper, label: t('dashboard.writeNewPost') },
    { href: '/bots', icon: Bot, label: t('dashboard.manageBots') },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lp-gradient-text">
            {t('dashboard.welcomeBack')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('dashboard.whatsHappening')}</p>
        </div>
        <div className="flex gap-2">
          <RefreshButton
            variant="outline"
            size="sm"
            onClick={() => {
              dashboardSummaryQuery.refetch();
              botsQuery.refetch();
              onboardingProgressQuery.refetch();
            }}
            isLoading={dashboardLoading || botsQuery.isLoading || onboardingProgressQuery.isLoading}
          >
            {t('dashboard.refresh')}
          </RefreshButton>
          <Button size="sm" className="lp-glow-btn" asChild>
            <Link href="/products/new">
              <Plus className="h-4 w-4 mr-1.5" />
              {t('dashboard.addProduct')}
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('dashboard.todaysOrders')}
          icon={ShoppingCart}
          iconColor="bg-primary/10 text-primary"
          isLoading={dashboardLoading}
          isError={dashboardError}
          value={dashboardSummary?.ordersToday ?? 0}
          change={dashboardSummary?.ordersChange}
          sub={t('dashboard.fromYesterday')}
        />
        <StatCard
          title={t('dashboard.revenue')}
          icon={DollarSign}
          iconColor="bg-amber-500/10 text-amber-400"
          isLoading={dashboardLoading}
          isError={dashboardError}
          value={`$${(dashboardSummary?.revenue?.amount ?? 0).toLocaleString()}`}
          change={dashboardSummary?.revenue?.change}
          sub={t('dashboard.fromYesterday')}
        />
        <StatCard
          title={t('dashboard.activeConversations')}
          icon={MessageSquare}
          iconColor="bg-blue-500/10 text-blue-400"
          isLoading={dashboardLoading}
          isError={dashboardError}
          value={dashboardSummary?.activeConversations?.count ?? 0}
          sub={
            dashboardSummary?.activeConversations?.needAttention ? (
              <>
                <span className="text-amber-400 font-medium">
                  {dashboardSummary.activeConversations.needAttention}
                </span>{' '}
                {t('dashboard.needAttention')}
              </>
            ) : undefined
          }
        />
        <StatCard
          title={t('dashboard.conversionRate')}
          icon={TrendingUp}
          iconColor="bg-purple-500/10 text-purple-400"
          isLoading={dashboardLoading}
          isError={dashboardError}
          value={`${dashboardSummary?.conversionRate?.value ?? 0}%`}
          change={dashboardSummary?.conversionRate?.change}
          sub={t('dashboard.fromLastWeek')}
        />
      </div>

      {/* ── Middle Row ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Bot Status */}
        <div className="lp-glass-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">{t('dashboard.botStatus')}</h2>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link href="/bots">{t('dashboard.manageBots')} →</Link>
            </Button>
          </div>

          <div className="space-y-3">
            {botsQuery.isLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))
            ) : botsQuery.error ? (
              <p className="text-sm text-muted-foreground">{t('dashboard.failedToLoadBots')}</p>
            ) : bots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                <Bot className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">{t('dashboard.noBotsConfigured')}</p>
                <Button size="sm" variant="outline" className="mt-1" asChild>
                  <Link href="/bots">{t('dashboard.manageBots')}</Link>
                </Button>
              </div>
            ) : (
              bots.slice(0, 4).map((bot: TelegramBot) => {
                const si = getBotStatusInfo(bot.status);
                const Icon = si.icon;
                return (
                  <div key={bot.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-2 w-2 rounded-full ${si.dot}`} />
                      <span className="text-sm font-medium truncate max-w-[140px]">{bot.name}</span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${si.color}`}
                    >
                      <Icon className="h-3 w-3" />
                      {si.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lp-glass-card rounded-xl p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-sm">{t('dashboard.quickActions')}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t('dashboard.commonTasks')}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="group flex flex-col items-center gap-2 rounded-lg border border-border/40 bg-background/30 p-3 text-center transition-all hover:border-primary/30 hover:bg-primary/5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs font-medium leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Setup Progress */}
        <div className="lp-glass-card rounded-xl p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-sm">{t('dashboard.setupProgress')}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('dashboard.completeStoreSetup')}
            </p>
          </div>

          {onboardingProgressQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-2 w-full" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-40" />
              ))}
            </div>
          ) : onboardingProgressQuery.error ? (
            <p className="text-sm text-muted-foreground">{t('dashboard.failedToLoadProgress')}</p>
          ) : onboardingProgress ? (
            <>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t('dashboard.storeConfiguration')}</span>
                  <span className="font-semibold text-primary">
                    {onboardingProgress.percentage}%
                  </span>
                </div>
                <Progress value={onboardingProgress.percentage} className="h-1.5" />
              </div>

              <div className="space-y-2">
                {[
                  {
                    done: onboardingProgress.isCategorySelected,
                    label: t('dashboard.categorySelected'),
                  },
                  {
                    done: onboardingProgress.isSchemaConfigured,
                    label: t('dashboard.schemaConfigured'),
                  },
                  {
                    done: onboardingProgress.isFirstProductAdded,
                    label: t('dashboard.firstProductAdded'),
                  },
                  { done: onboardingProgress.isBotConnected, label: t('dashboard.botConnected') },
                ].map(({ done, label }) => (
                  <div key={label} className="flex items-center gap-2 text-sm">
                    {done ? (
                      <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-border shrink-0" />
                    )}
                    <span className={done ? 'text-foreground' : 'text-muted-foreground'}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              {onboardingProgress.status === 'INCOMPLETE' && (
                <Button size="sm" className="w-full lp-glow-btn" asChild>
                  <Link href={`/onboarding?step=${onboardingProgress.nextStep}`}>
                    {t('dashboard.continueSetup')}
                  </Link>
                </Button>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <div className="lp-glass-card rounded-xl p-5">
        <div className="mb-5">
          <h2 className="font-semibold text-sm">{t('dashboard.recentActivity')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('dashboard.recentActivityDescription')}
          </p>
        </div>
        <ActivityLogsSection />
      </div>
    </div>
  );
}
