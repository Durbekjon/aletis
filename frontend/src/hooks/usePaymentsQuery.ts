import { useMutation } from "@tanstack/react-query"
import paymentsApi, { PaymentProvider } from "@/src/api/paymentsApi"

export function useCreateOrderPaymentLink() {
  return useMutation({
    mutationFn: ({
      orderId,
      provider,
    }: {
      orderId: number
      provider: PaymentProvider
    }) => paymentsApi.createOrderLink(orderId, provider),
  })
}
