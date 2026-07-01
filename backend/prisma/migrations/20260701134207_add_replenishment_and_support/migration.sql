-- CreateEnum
CREATE TYPE "ReplenishmentMethod" AS ENUM ('CADENCE', 'DOSAGE', 'AI_ESTIMATE');

-- CreateEnum
CREATE TYPE "ReplenishmentStatus" AS ENUM ('SCHEDULED', 'SENT', 'RESPONDED', 'PURCHASED', 'DISMISSED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "estimatedLifespanDays" INTEGER,
ADD COLUMN     "isConsumable" BOOLEAN;

-- CreateTable
CREATE TABLE "replenishment_reminders" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "botId" INTEGER,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "lastOrderId" INTEGER,
    "predictedDepletionDate" TIMESTAMP(3) NOT NULL,
    "method" "ReplenishmentMethod" NOT NULL,
    "status" "ReplenishmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "basis" JSONB,
    "generatedMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "purchasedAt" TIMESTAMP(3),
    "purchasedOrderId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "replenishment_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "replenishment_reminders_organizationId_status_idx" ON "replenishment_reminders"("organizationId", "status");

-- CreateIndex
CREATE INDEX "replenishment_reminders_customerId_productId_idx" ON "replenishment_reminders"("customerId", "productId");

-- CreateIndex
CREATE INDEX "replenishment_reminders_status_predictedDepletionDate_idx" ON "replenishment_reminders"("status", "predictedDepletionDate");

-- CreateIndex
CREATE INDEX "support_tickets_organizationId_status_createdAt_idx" ON "support_tickets"("organizationId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "support_tickets_customerId_idx" ON "support_tickets"("customerId");

-- AddForeignKey
ALTER TABLE "replenishment_reminders" ADD CONSTRAINT "replenishment_reminders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replenishment_reminders" ADD CONSTRAINT "replenishment_reminders_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replenishment_reminders" ADD CONSTRAINT "replenishment_reminders_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

