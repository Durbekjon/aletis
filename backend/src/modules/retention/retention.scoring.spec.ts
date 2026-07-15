import { computeChurnScore } from './retention.scoring';

describe('computeChurnScore', () => {
  it('returns zero churn risk for a customer active today', () => {
    const { churnRisk } = computeChurnScore({
      dormantDays: 0,
      orderCount: 1,
      totalSpent: 100,
    });
    expect(churnRisk).toBe(0);
  });

  it('increases churn risk monotonically with dormancy', () => {
    const a = computeChurnScore({ dormantDays: 10, orderCount: 1, totalSpent: 0 });
    const b = computeChurnScore({ dormantDays: 45, orderCount: 1, totalSpent: 0 });
    const c = computeChurnScore({ dormantDays: 120, orderCount: 1, totalSpent: 0 });
    expect(a.churnRisk).toBeLessThan(b.churnRisk);
    expect(b.churnRisk).toBeLessThan(c.churnRisk);
    expect(c.churnRisk).toBeLessThanOrEqual(100);
  });

  it('classifies health tiers by recency', () => {
    expect(computeChurnScore({ dormantDays: 20, orderCount: 1, totalSpent: 0 }).healthTier).toBe('cooling');
    expect(computeChurnScore({ dormantDays: 45, orderCount: 1, totalSpent: 0 }).healthTier).toBe('at_risk');
    expect(computeChurnScore({ dormantDays: 90, orderCount: 1, totalSpent: 0 }).healthTier).toBe('lost');
  });

  it('prioritises higher-value customers at the same recency', () => {
    const cheap = computeChurnScore({ dormantDays: 45, orderCount: 1, totalSpent: 10 });
    const valuable = computeChurnScore({ dormantDays: 45, orderCount: 5, totalSpent: 5000 });
    // Same churn risk (same recency), but the valuable buyer ranks higher.
    expect(valuable.churnRisk).toBe(cheap.churnRisk);
    expect(valuable.priorityScore).toBeGreaterThan(cheap.priorityScore);
  });

  it('never produces NaN for zero spend/orders', () => {
    const s = computeChurnScore({ dormantDays: 50, orderCount: 0, totalSpent: 0 });
    expect(Number.isNaN(s.churnRisk)).toBe(false);
    expect(Number.isNaN(s.priorityScore)).toBe(false);
  });
});
