/**
 * Demo seed for the Replenishment / Consumption-Prediction engine.
 *
 * Creates two believable consumable buyers whose next run-out is due *now*, so
 * the Replenishment dashboard has upcoming reminders and a live scan sends real
 * reorder nudges during the demo:
 *   • Cadence case  — bought shampoo twice ~30 days apart → CADENCE reminder.
 *   • Dosage case   — bought vitamins once, "kuniga 2 mahal" in chat → DOSAGE reminder.
 *
 * Safe to re-run: it wipes only its own demo rows (telegramId / product markers).
 *
 *   npx ts-node prisma/seed-replenishment-demo.ts
 */
import {
  PrismaClient,
  CustomerChannel,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  Currency,
  SenderType,
  ReplenishmentMethod,
  ReplenishmentStatus,
} from '@prisma/client';

const prisma = new PrismaClient();
const TG_PREFIX = 'demo_rp_'; // marker so re-runs only touch demo data
const PRODUCT_MARKER = '[DEMO-RP]'; // suffix on demo product names
const day = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * day);
const inDays = (days: number) => new Date(Date.now() + days * day);
const CURRENCY = 'UZS';

async function wipePrevious(): Promise<void> {
  const demoCustomers = await prisma.customer.findMany({
    where: { telegramId: { startsWith: TG_PREFIX } },
    select: { id: true },
  });
  const ids = demoCustomers.map((c) => c.id);
  if (ids.length) {
    await prisma.orderItem.deleteMany({ where: { order: { customerId: { in: ids } } } });
    await prisma.order.deleteMany({ where: { customerId: { in: ids } } });
    await prisma.message.deleteMany({ where: { customerId: { in: ids } } }); // no cascade on customer
    await prisma.customer.deleteMany({ where: { id: { in: ids } } }); // cascades reminders/aiNote
  }
  // Demo products cascade their orderItems + reminders on delete.
  await prisma.product.deleteMany({
    where: { name: { contains: PRODUCT_MARKER } },
  });
  if (ids.length) console.log(`Wiped ${ids.length} previous demo customers + products.`);
}

async function ensureOrgBotSchema(): Promise<{
  orgId: number;
  botId: number;
  schemaId: number;
}> {
  // Target org selection (so the demo lands in the org you're logged into):
  //   SEED_ORG_ID=3         → force a specific org
  //   SEED_USER_EMAIL=you@… → use that user's org
  //   else                  → first org that has a bot
  const forcedId = process.env.SEED_ORG_ID ? Number(process.env.SEED_ORG_ID) : null;
  const email = process.env.SEED_USER_EMAIL;

  let org: { id: number } | null = null;
  if (forcedId) {
    org = await prisma.organization.findUnique({ where: { id: forcedId }, select: { id: true } });
    if (!org) throw new Error(`SEED_ORG_ID=${forcedId} not found`);
  } else if (email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { member: { select: { organizationId: true } } },
    });
    if (!user?.member?.organizationId) throw new Error(`No org for user ${email}`);
    org = { id: user.member.organizationId };
  }
  org ??= await prisma.organization.findFirst({
    where: { bots: { some: {} } },
    select: { id: true },
  });
  org ??= await prisma.organization.findFirst({ select: { id: true } });
  if (!org) {
    org = await prisma.organization.create({
      data: { name: 'Demo Shop' },
      select: { id: true },
    });
    console.log(`Created demo organization #${org.id}`);
  }

  let bot = await prisma.bot.findFirst({
    where: { organizationId: org.id },
    select: { id: true },
  });
  bot ??= await prisma.bot.create({
    data: {
      token: `${TG_PREFIX}token_${org.id}`,
      telegramId: `${TG_PREFIX}bot_${org.id}`,
      name: 'Demo Bot',
      username: 'demo_bot',
      organizationId: org.id,
    },
    select: { id: true },
  });

  let schema = await prisma.productSchema.findFirst({
    where: { organizationId: org.id },
    select: { id: true },
  });
  schema ??= await prisma.productSchema.create({
    data: { name: 'Default', organizationId: org.id },
    select: { id: true },
  });

  return { orgId: org.id, botId: bot.id, schemaId: schema.id };
}

async function main() {
  await wipePrevious();
  const { orgId, botId, schemaId } = await ensureOrgBotSchema();
  console.log(`Seeding replenishment demo into org #${orgId}, bot #${botId}`);

  // ── Consumable products (pre-classified so the AI classifier is skipped) ──
  const shampoo = await prisma.product.create({
    data: {
      name: `Head & Shoulders shampun 400ml ${PRODUCT_MARKER}`,
      price: 65000,
      currency: Currency.UZS,
      quantity: 50,
      status: ProductStatus.ACTIVE,
      organizationId: orgId,
      schemaId,
      isConsumable: true,
      estimatedLifespanDays: 30,
    },
  });
  const vitamins = await prisma.product.create({
    data: {
      name: `Vitamin D3 2000 IU, 60 tabletka ${PRODUCT_MARKER}`,
      price: 89000,
      currency: Currency.UZS,
      quantity: 40,
      status: ProductStatus.ACTIVE,
      organizationId: orgId,
      schemaId,
      isConsumable: true,
      estimatedLifespanDays: 30,
    },
  });

  // ── Case 1: CADENCE — Feruza bought shampoo twice ~30 days apart ──
  const feruza = await prisma.customer.create({
    data: {
      telegramId: `${TG_PREFIX}cadence_${Date.now()}`,
      name: 'Feruza Toshpulatova',
      username: 'feruza_t',
      lang: 'uz',
      channel: CustomerChannel.TELEGRAM,
      organizationId: orgId,
      botId,
      createdAt: ago(65),
    },
  });
  let lastShampooOrderId = 0;
  for (const daysAgo of [61, 31]) {
    const order = await prisma.order.create({
      data: {
        status: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
        customerId: feruza.id,
        organizationId: orgId,
        totalPrice: shampoo.price,
        currency: CURRENCY,
        details: { source: 'DEMO_SEED' },
        createdAt: ago(daysAgo),
        updatedAt: ago(daysAgo),
        orderItems: { create: [{ productId: shampoo.id, quantity: 1, price: shampoo.price }] },
      },
    });
    lastShampooOrderId = order.id;
  }
  await prisma.replenishmentReminder.create({
    data: {
      customerId: feruza.id,
      organizationId: orgId,
      botId,
      productId: shampoo.id,
      quantity: 1,
      lastOrderId: lastShampooOrderId,
      predictedDepletionDate: inDays(1), // due within the lead window → scan fires
      method: ReplenishmentMethod.CADENCE,
      status: ReplenishmentStatus.SCHEDULED,
      basis: {
        intervalDays: 30,
        purchaseCount: 2,
        source: 'median repeat-purchase interval',
      },
    },
  });

  // ── Case 2: DOSAGE — Bekzod bought vitamins once, prescription in chat ──
  const bekzod = await prisma.customer.create({
    data: {
      telegramId: `${TG_PREFIX}dosage_${Date.now()}`,
      name: 'Bekzod Aliyev',
      username: 'bekzod_a',
      lang: 'uz',
      channel: CustomerChannel.TELEGRAM,
      organizationId: orgId,
      botId,
      createdAt: ago(30),
    },
  });
  const vitOrder = await prisma.order.create({
    data: {
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      customerId: bekzod.id,
      organizationId: orgId,
      totalPrice: vitamins.price,
      currency: CURRENCY,
      details: { source: 'DEMO_SEED' },
      createdAt: ago(30),
      updatedAt: ago(30),
      orderItems: { create: [{ productId: vitamins.id, quantity: 1, price: vitamins.price }] },
    },
  });
  for (const [i, msg] of [
    { sender: SenderType.USER, content: 'Vitamin D3 bormi? Shifokor kuniga 2 mahal ichishni tavsiya qildi' },
    { sender: SenderType.BOT, content: 'Ha, bor! 60 tabletkali qadoq. Buyurtma beramizmi?' },
    { sender: SenderType.USER, content: 'Ha, bittasini oling' },
  ].entries()) {
    await prisma.message.create({
      data: {
        sender: msg.sender,
        content: msg.content,
        customerId: bekzod.id,
        botId,
        createdAt: new Date(ago(30).getTime() + i * 60_000),
      },
    });
  }
  await prisma.replenishmentReminder.create({
    data: {
      customerId: bekzod.id,
      organizationId: orgId,
      botId,
      productId: vitamins.id,
      quantity: 1,
      lastOrderId: vitOrder.id,
      predictedDepletionDate: inDays(1),
      method: ReplenishmentMethod.DOSAGE,
      status: ReplenishmentStatus.SCHEDULED,
      basis: {
        packSize: 60,
        unitsPerDay: 2,
        source: 'pack size ÷ usage rate from conversation',
      },
    },
  });

  console.log('  • Feruza Toshpulatova — shampoo, CADENCE (30d interval)');
  console.log('  • Bekzod Aliyev — vitamins, DOSAGE (60 tabs ÷ 2/day = 30d)');
  console.log('\n✅ Replenishment demo seeded.');
  console.log(
    'Tip: open the Replenishment page, then POST /api/v1/replenishment/scan to send the due reminders.',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
