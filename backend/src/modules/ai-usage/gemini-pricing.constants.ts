/**
 * ⚠️ Sourced from third-party pricing aggregators, not confirmed directly
 * against https://ai.google.dev/gemini-api/docs/pricing. Verify before
 * removing the "unverified" badge from the admin AI-cost dashboard.
 */
export const GEMINI_PRICING: Record<string, { inputPerMillion: number; outputPerMillion: number }> = {
  'gemini-2.5-flash': { inputPerMillion: 0.15, outputPerMillion: 1.25 },
  'gemini-1.5-flash': { inputPerMillion: 0.35, outputPerMillion: 1.05 },
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
