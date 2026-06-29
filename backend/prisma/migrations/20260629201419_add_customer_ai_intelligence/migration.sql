-- CreateEnum
CREATE TYPE "PriceSensitivity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "followUpSentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "customer_ai_notes" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "purchaseHistory" JSONB,
    "productInterests" JSONB,
    "favoriteCategories" JSONB,
    "frequentQuestions" JSONB,
    "priceSensitivity" "PriceSensitivity" NOT NULL DEFAULT 'MEDIUM',
    "buyingBehavior" JSONB,
    "aiSummary" TEXT,
    "salesOpportunities" JSONB,
    "aiTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastAnalyzedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_ai_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_ai_notes_customerId_key" ON "customer_ai_notes"("customerId");

-- CreateIndex
CREATE INDEX "customer_ai_notes_organizationId_idx" ON "customer_ai_notes"("organizationId");

-- AddForeignKey
ALTER TABLE "customer_ai_notes" ADD CONSTRAINT "customer_ai_notes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_ai_notes" ADD CONSTRAINT "customer_ai_notes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
