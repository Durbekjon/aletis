-- CreateTable
CREATE TABLE "ai_cost_daily_aggregates" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER,
    "day" TIMESTAMP(3) NOT NULL,
    "model" TEXT NOT NULL,
    "feature" "AiFeature" NOT NULL,
    "callCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "candidatesTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgLatencyMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_cost_daily_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_cost_daily_aggregates_day_idx" ON "ai_cost_daily_aggregates"("day");

-- CreateIndex
CREATE UNIQUE INDEX "ai_cost_daily_aggregates_organizationId_day_model_feature_key" ON "ai_cost_daily_aggregates"("organizationId", "day", "model", "feature");

-- AddForeignKey
ALTER TABLE "ai_cost_daily_aggregates" ADD CONSTRAINT "ai_cost_daily_aggregates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
