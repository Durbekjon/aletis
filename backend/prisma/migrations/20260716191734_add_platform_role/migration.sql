-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('STAFF', 'SUPERADMIN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "platformRole" "PlatformRole";
