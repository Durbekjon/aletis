import { PrismaClient, PlanTier } from '@prisma/client';

const prisma = new PrismaClient();

const plans = [
  {
    tier: PlanTier.FREE,
    name: 'Free',
    priceUsd: 0,
    convoLimit: 100,
    productLimit: 50,
    botLimit: 1,
    teamMemberLimit: 1,
    overagePriceUsd: 0,
    overageCap: 0,
  },
  {
    tier: PlanTier.STARTER,
    name: 'Starter',
    priceUsd: 19,
    convoLimit: 500,
    productLimit: 500,
    botLimit: 1,
    teamMemberLimit: 3,
    overagePriceUsd: 0.04,
    overageCap: 1425, // 3× plan price / $0.04
  },
  {
    tier: PlanTier.GROWTH,
    name: 'Growth',
    priceUsd: 49,
    convoLimit: 2000,
    productLimit: 2000,
    botLimit: 3,
    teamMemberLimit: 10,
    overagePriceUsd: 0.04,
    overageCap: 3675, // 3× plan price / $0.04
  },
  {
    tier: PlanTier.SCALE,
    name: 'Scale',
    priceUsd: 129,
    convoLimit: 8000,
    productLimit: -1,
    botLimit: -1,
    teamMemberLimit: -1,
    overagePriceUsd: 0.04,
    overageCap: 9675, // 3× plan price / $0.04
  },
];

async function main() {
  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { tier: plan.tier },
      update: {
        name: plan.name,
        priceUsd: plan.priceUsd,
        convoLimit: plan.convoLimit,
        productLimit: plan.productLimit,
        botLimit: plan.botLimit,
        teamMemberLimit: plan.teamMemberLimit,
        overagePriceUsd: plan.overagePriceUsd,
        overageCap: plan.overageCap,
      },
      create: plan,
    });
  }
  console.log('Subscription plans seeded.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
