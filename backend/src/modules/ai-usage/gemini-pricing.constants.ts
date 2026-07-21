interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
  /** True once confirmed directly against https://ai.google.dev/gemini-api/docs/pricing. */
  verified: boolean;
}

/**
 * gemini-2.5-flash: confirmed 2026-07-17 against ai.google.dev/gemini-api/docs/pricing
 * — standard (synchronous, non-batch, non-cached, text) tier, which is what
 * GeminiService.callWithRotation() actually calls via generateContent(). The
 * cheaper $0.15/$1.25 figures on that same page are the BATCH-API rate, not
 * the standard rate this codebase uses — do not swap them back in.
 *
 * gemini-1.5-flash: NOT on the current pricing page — Google has deprecated
 * this model and no longer lists it at all, meaning there is no way to
 * "verify" a price for it anymore. The figures below are its last known
 * official standard-tier pricing before deprecation, kept only so existing
 * cost estimates don't silently become zero. The bigger issue this surfaces:
 * several call sites (detectLanguage, translateMessage,
 * generateOrdersListResponse, generateOrderCancellationResponse) still
 * hardcode 'gemini-1.5-flash' as a live model string — a deprecated model
 * can be sunset by Google without much notice, which would break those
 * features outright. Worth migrating to gemini-2.5-flash-lite separately.
 */
export const GEMINI_PRICING: Record<string, ModelPricing> = {
  'gemini-2.5-flash': { inputPerMillion: 0.3, outputPerMillion: 2.5, verified: true },
  'gemini-1.5-flash': { inputPerMillion: 0.35, outputPerMillion: 1.05, verified: false },
};

export function estimateCostUsd(
  model: string,
  promptTokens: number,
  candidatesTokens: number,
): number {
  const rate = GEMINI_PRICING[model];
  if (!rate) return 0;
  return (
    (promptTokens / 1_000_000) * rate.inputPerMillion +
    (candidatesTokens / 1_000_000) * rate.outputPerMillion
  );
}

/** True only if every model that has recorded usage has Google-verified pricing. */
export function isPricingVerified(modelsUsed: string[]): boolean {
  return modelsUsed.every((m) => GEMINI_PRICING[m]?.verified === true);
}
