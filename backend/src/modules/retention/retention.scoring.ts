export type HealthTier = 'cooling' | 'at_risk' | 'lost';

export interface RfmSignals {
  dormantDays: number;
  orderCount: number;
  totalSpent: number;
}

export interface ChurnScore {
  churnRisk: number; // 0-100, rises with time since last activity
  priorityScore: number; // churnRisk weighted by recoverable value
  healthTier: HealthTier;
}

/**
 * Churn scoring from RFM signals (recency / frequency / monetary).
 * - churnRisk (0-100) grows smoothly with days since last activity.
 * - priorityScore ranks who to save first: risk weighted by recoverable value
 *   (spend + loyalty), so a high-value loyal buyer going quiet outranks a
 *   one-off cheap buyer at the same recency.
 *
 * Pure and dependency-free so it can be unit-tested in isolation.
 */
export function computeChurnScore(rfm: RfmSignals): ChurnScore {
  const churnRisk = Math.round(100 * (1 - Math.exp(-rfm.dormantDays / 45)));
  const valueWeight =
    1 + Math.log1p(Math.max(0, rfm.totalSpent)) + rfm.orderCount * 0.1;
  const priorityScore = Math.round(churnRisk * valueWeight);

  let healthTier: HealthTier = 'cooling';
  if (rfm.dormantDays > 60) healthTier = 'lost';
  else if (rfm.dormantDays > 30) healthTier = 'at_risk';

  return { churnRisk, priorityScore, healthTier };
}
