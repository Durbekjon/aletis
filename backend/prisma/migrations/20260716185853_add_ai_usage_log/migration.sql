-- CreateEnum
CREATE TYPE "AiFeature" AS ENUM ('SALES_CHAT', 'ORDER_CONFIRMATION', 'LANGUAGE_DETECTION', 'TRANSLATION', 'ORDERS_LIST', 'ORDER_CANCELLATION', 'PRODUCT_MATCHING', 'CUSTOMER_INSIGHTS', 'WIN_BACK', 'CAMPAIGN_BROADCAST', 'AUDIO_TRANSCRIPTION', 'CONSUMABLE_CLASSIFICATION', 'USAGE_RATE_EXTRACTION', 'REPLENISHMENT_REMINDER');

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER,
    "botId" INTEGER,
    "feature" "AiFeature" NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "candidatesTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_usage_logs_organizationId_createdAt_idx" ON "ai_usage_logs"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_logs_feature_createdAt_idx" ON "ai_usage_logs"("feature", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_logs_model_createdAt_idx" ON "ai_usage_logs"("model", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_logs_createdAt_idx" ON "ai_usage_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
