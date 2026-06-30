/**
 * Demo seed for the Retention / Win-Back engine.
 *
 * Populates a believable "client base" of dormant customers (with purchase
 * history + AI notes) plus a few win-back attempts in various states, so the
 * Retention dashboard looks alive and there are fresh dormant customers to run
 * a live win-back scan on during the demo.
 *
 * Safe to re-run: it wipes only its own demo rows (telegramId prefix below).
 *
 *   npx ts-node prisma/seed-retention-demo.ts
 */
import {
  PrismaClient,
  CustomerChannel,
  OrderStatus,
  PaymentStatus,
  PriceSensitivity,
  WinBackStatus,
} from '@prisma/client';

const prisma = new PrismaClient();
const TG_PREFIX = 'demo_wb_'; // marker so re-runs only touch demo data
const day = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * day);

type Spec = {
  name: string;
  username: string;
  lang: string;
  channel: CustomerChannel;
  daysDormant: number;
  orders: { total: number; daysAgo: number }[];
  tags: string[];
  favoriteCategories: string[];
  summary: string;
  /** win-back already attempted? and in which state */
  winBack?: {
    status: WinBackStatus;
    message: string;
    sentDaysAgo?: number;
    recoveredRevenue?: number;
  };
};

const CURRENCY = 'UZS';

const SPECS: Spec[] = [
  {
    name: 'Dilnoza Karimova',
    username: 'dilnoza_k',
    lang: 'uz',
    channel: CustomerChannel.TELEGRAM,
    daysDormant: 47,
    orders: [
      { total: 320000, daysAgo: 47 },
      { total: 180000, daysAgo: 95 },
    ],
    tags: ['At Risk', 'Frequent Buyer'],
    favoriteCategories: ['Kosmetika', 'Parfyumeriya'],
    summary: 'Doimiy xaridor edi, oxirgi 1.5 oyda faolligi yo‘qoldi. Kosmetikaga qiziqadi.',
  },
  {
    name: 'Aziz Rahmatov',
    username: 'aziz_r',
    lang: 'uz',
    channel: CustomerChannel.TELEGRAM,
    daysDormant: 33,
    orders: [{ total: 540000, daysAgo: 33 }],
    tags: ['At Risk'],
    favoriteCategories: ['Elektronika'],
    summary: 'Bitta katta xarid qildi, qaytmadi. Aksessuarlarga qiziqishi mumkin.',
  },
  {
    name: 'Madina Yusupova',
    username: 'madina_y',
    lang: 'ru',
    channel: CustomerChannel.INSTAGRAM,
    daysDormant: 58,
    orders: [
      { total: 210000, daysAgo: 58 },
      { total: 260000, daysAgo: 88 },
      { total: 150000, daysAgo: 120 },
    ],
    tags: ['At Risk', 'Loyal Customer'],
    favoriteCategories: ['Одежда', 'Аксессуары'],
    summary: 'Постоянная клиентка из Instagram, давно не заказывала. Любит новинки одежды.',
  },
  {
    name: 'Jahongir Tursunov',
    username: 'jahongir_t',
    lang: 'uz',
    channel: CustomerChannel.TELEGRAM,
    daysDormant: 26,
    orders: [{ total: 95000, daysAgo: 26 }],
    tags: ['At Risk', 'Price Sensitive'],
    favoriteCategories: ['Sport'],
    summary: 'Narxga sezgir mijoz, chegirma bo‘lsa qaytishi mumkin.',
  },
  {
    name: 'Nigora Abdullayeva',
    username: 'nigora_a',
    lang: 'uz',
    channel: CustomerChannel.TELEGRAM,
    daysDormant: 41,
    orders: [
      { total: 430000, daysAgo: 41 },
      { total: 380000, daysAgo: 70 },
    ],
    tags: ['At Risk', 'VIP'],
    favoriteCategories: ['Kosmetika'],
    summary: 'Yuqori cheklik VIP mijoz, qaytarish juda muhim.',
    winBack: {
      status: WinBackStatus.RECOVERED,
      message:
        'Salom Nigora! 👋 Sizni sog‘inib qoldik. Sevimli kosmetika brendingizdan yangi to‘plam keldi — birinchi bo‘lib ko‘rishni xohlaysizmi?',
      sentDaysAgo: 5,
      recoveredRevenue: 410000,
    },
  },
  {
    name: 'Sardor Mirzaev',
    username: 'sardor_m',
    lang: 'ru',
    channel: CustomerChannel.TELEGRAM,
    daysDormant: 38,
    orders: [{ total: 175000, daysAgo: 38 }],
    tags: ['At Risk'],
    favoriteCategories: ['Электроника'],
    summary: 'Покупал аксессуары, давно не заходил.',
    winBack: {
      status: WinBackStatus.RESPONDED,
      message:
        'Здравствуйте, Сардор! 👋 Мы по вам соскучились. Заглянете посмотреть наши новинки?',
      sentDaysAgo: 2,
    },
  },
  {
    name: 'Kamola Saidova',
    username: 'kamola_s',
    lang: 'uz',
    channel: CustomerChannel.INSTAGRAM,
    daysDormant: 52,
    orders: [{ total: 140000, daysAgo: 52 }],
    tags: ['At Risk'],
    favoriteCategories: ['Aksessuarlar'],
    summary: 'Instagram orqali bitta xarid, qaytarish kerak.',
    winBack: {
      status: WinBackStatus.SENT,
      message:
        'Salom Kamola! 👋 Yangi aksessuarlar to‘plamimizni ko‘rib chiqishni xohlaysizmi? Siz uchun maxsus takliflar bor 🎁',
      sentDaysAgo: 1,
    },
  },
];

async function wipePrevious(): Promise<void> {
  const demoCustomers = await prisma.customer.findMany({
    where: { telegramId: { startsWith: TG_PREFIX } },
    select: { id: true },
  });
  const ids = demoCustomers.map((c) => c.id);
  if (ids.length === 0) return;
  // win-back attempts + ai notes cascade on customer delete; orders are SetNull,
  // so delete them explicitly first.
  await prisma.orderItem.deleteMany({ where: { order: { customerId: { in: ids } } } });
  await prisma.order.deleteMany({ where: { customerId: { in: ids } } });
  await prisma.customer.deleteMany({ where: { id: { in: ids } } });
  console.log(`Wiped ${ids.length} previous demo customers.`);
}

async function ensureOrgAndBot(): Promise<{ orgId: number; botId: number }> {
  let org = await prisma.organization.findFirst({
    where: { bots: { some: {} } },
    select: { id: true },
  });
  org ??= await prisma.organization.findFirst({ select: { id: true } });
  if (!org) {
    const created = await prisma.organization.create({
      data: { name: 'Demo Shop' },
      select: { id: true },
    });
    org = created;
    console.log(`Created demo organization #${org.id}`);
  }

  let bot = await prisma.bot.findFirst({
    where: { organizationId: org.id },
    select: { id: true },
  });
  if (!bot) {
    bot = await prisma.bot.create({
      data: {
        token: `${TG_PREFIX}token_${org.id}`,
        telegramId: `${TG_PREFIX}bot_${org.id}`,
        name: 'Demo Bot',
        username: 'demo_bot',
        organizationId: org.id,
      },
      select: { id: true },
    });
    console.log(`Created demo bot #${bot.id}`);
  }
  return { orgId: org.id, botId: bot.id };
}

async function main() {
  await wipePrevious();
  const { orgId, botId } = await ensureOrgAndBot();
  console.log(`Seeding retention demo into org #${orgId}, bot #${botId}`);

  for (const [i, spec] of SPECS.entries()) {
    const oldest = Math.max(...spec.orders.map((o) => o.daysAgo));
    const customer = await prisma.customer.create({
      data: {
        telegramId: `${TG_PREFIX}${i}_${Date.now()}`,
        name: spec.name,
        username: spec.username,
        lang: spec.lang,
        channel: spec.channel,
        organizationId: orgId,
        botId,
        createdAt: ago(oldest + 5),
      },
    });

    // Past orders (delivered), backdated
    for (const o of spec.orders) {
      await prisma.order.create({
        data: {
          status: OrderStatus.DELIVERED,
          paymentStatus: PaymentStatus.PAID,
          customerId: customer.id,
          organizationId: orgId,
          totalPrice: o.total,
          currency: CURRENCY,
          details: { source: 'DEMO_SEED' },
          createdAt: ago(o.daysAgo),
          updatedAt: ago(o.daysAgo),
        },
      });
    }

    // AI note: the intelligence the win-back engine personalizes from
    await prisma.customerAiNote.create({
      data: {
        customerId: customer.id,
        organizationId: orgId,
        aiTags: spec.tags,
        priceSensitivity: spec.tags.includes('Price Sensitive')
          ? PriceSensitivity.HIGH
          : spec.tags.includes('VIP')
            ? PriceSensitivity.LOW
            : PriceSensitivity.MEDIUM,
        favoriteCategories: spec.favoriteCategories,
        purchaseHistory: spec.orders.map((o) => ({
          total: o.total,
          currency: CURRENCY,
          date: ago(o.daysAgo).toISOString().split('T')[0],
        })),
        salesOpportunities: [
          {
            type: 'win-back',
            description: 'Dormant buyer — re-engage with personalized offer',
            suggestedProducts: spec.favoriteCategories,
          },
        ],
        aiSummary: spec.summary,
        lastAnalyzedAt: ago(spec.daysDormant),
      },
    });

    // Optional pre-existing win-back attempt (history + metrics)
    if (spec.winBack) {
      const wb = spec.winBack;
      const sentAt = wb.sentDaysAgo != null ? ago(wb.sentDaysAgo) : null;
      await prisma.winBackAttempt.create({
        data: {
          customerId: customer.id,
          organizationId: orgId,
          channel: spec.channel,
          status: wb.status,
          dormantDays: spec.daysDormant,
          generatedMessage: wb.message,
          sentAt,
          respondedAt:
            wb.status === WinBackStatus.RESPONDED ||
            wb.status === WinBackStatus.RECOVERED
              ? ago((wb.sentDaysAgo ?? 1) - 0.5 < 0 ? 0 : (wb.sentDaysAgo ?? 1))
              : null,
          recoveredAt: wb.status === WinBackStatus.RECOVERED ? ago(1) : null,
          recoveredRevenue: wb.recoveredRevenue ?? null,
          createdAt: sentAt ?? ago(1),
        },
      });
    }

    console.log(`  • ${spec.name} (${spec.channel}, ${spec.daysDormant}d dormant)`);
  }

  console.log('\n✅ Retention demo seeded.');
  console.log(
    'Tip: open the Retention page, then click "Run win-back scan" to target the customers without an attempt yet.',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
