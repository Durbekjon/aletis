import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import billingApi, { type PlanTier } from '@/src/api/billingApi'

export function useBillingDashboard() {
  return useQuery({
    queryKey: ['billing', 'dashboard'],
    queryFn: () => billingApi.getDashboard(),
    staleTime: 60 * 1000,
  })
}

export function useBillingPlans() {
  return useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: () => billingApi.getPlans(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useBillingUsage() {
  return useQuery({
    queryKey: ['billing', 'usage'],
    queryFn: () => billingApi.getUsage(),
    staleTime: 30 * 1000,
  })
}

export function useInvoices() {
  return useQuery({
    queryKey: ['billing', 'invoices'],
    queryFn: () => billingApi.getInvoices(),
    staleTime: 60 * 1000,
  })
}

export function useChangePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (tier: PlanTier) => billingApi.changePlan(tier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      toast.success('Plan updated successfully')
    },
    onError: () => {
      toast.error('Failed to update plan')
    },
  })
}

export function useCancelSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => billingApi.cancelSubscription(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      toast.success('Subscription will be cancelled at the end of the billing period')
    },
    onError: () => {
      toast.error('Failed to cancel subscription')
    },
  })
}
