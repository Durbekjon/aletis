-- CreateEnum
CREATE TYPE "CustomerChannel" AS ENUM ('TELEGRAM', 'INSTAGRAM');

-- CreateEnum
CREATE TYPE "WinBackStatus" AS ENUM ('QUEUED', 'SENT', 'RESPONDED', 'RECOVERED', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "channel" "CustomerChannel" NOT NULL DEFAULT 'TELEGRAM',
ADD COLUMN     "instagramId" TEXT;

-- CreateTable
CREATE TABLE "win_back_attempts" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "channel" "CustomerChannel" NOT NULL DEFAULT 'TELEGRAM',
    "status" "WinBackStatus" NOT NULL DEFAULT 'QUEUED',
    "dormantDays" INTEGER,
    "generatedMessage" TEXT,
    "incentive" TEXT,
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "recoveredAt" TIMESTAMP(3),
    "recoveredOrderId" INTEGER,
    "recoveredRevenue" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "win_back_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "win_back_attempts_organizationId_status_idx" ON "win_back_attempts"("organizationId", "status");

-- CreateIndex
CREATE INDEX "win_back_attempts_customerId_createdAt_idx" ON "win_back_attempts"("customerId", "createdAt");

-- AddForeignKey
ALTER TABLE "win_back_attempts" ADD CONSTRAINT "win_back_attempts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "win_back_attempts" ADD CONSTRAINT "win_back_attempts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
