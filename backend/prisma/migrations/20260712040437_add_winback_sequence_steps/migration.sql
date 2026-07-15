-- Escalating win-back sequence: a single attempt walks through several steps
-- (reminder → value → incentive → last chance) until the customer responds.
ALTER TABLE "win_back_attempts" ADD COLUMN "step" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "maxSteps" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN "nextStepAt" TIMESTAMP(3);
