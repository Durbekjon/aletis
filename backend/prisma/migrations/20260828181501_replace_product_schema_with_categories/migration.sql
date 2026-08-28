/*
  Warnings:

  - The values [SCHEMA] on the enum `EntityType` will be removed. If these variants are still used in the database, this will fail.
  - The values [CONFIGURE_SCHEMA] on the enum `OnboardingStep` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `isSchemaConfigured` on the `onboarding_progress` table. All the data in the column will be lost.
  - You are about to drop the column `schemaId` on the `products` table. All the data in the column will be lost.
  - You are about to drop the `field_values` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `product_schemas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `schema_fields` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "FulfillmentMode" AS ENUM ('PICKUP_ONLY', 'DELIVERY', 'PICKUP_AND_DELIVERY');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('MERCHANT', 'EXTERNAL_COURIER');

-- CreateEnum
CREATE TYPE "DeliveryFeeType" AS ENUM ('FREE', 'FIXED', 'CUSTOMER_PAYS_SEPARATELY');

-- AlterEnum
BEGIN;
CREATE TYPE "EntityType_new" AS ENUM ('PRODUCT', 'ORDER', 'CUSTOMER', 'BOT', 'CHANNEL', 'CATEGORY', 'POST');
ALTER TABLE "activity_logs" ALTER COLUMN "entityType" TYPE "EntityType_new" USING ("entityType"::text::"EntityType_new");
ALTER TYPE "EntityType" RENAME TO "EntityType_old";
ALTER TYPE "EntityType_new" RENAME TO "EntityType";
DROP TYPE "public"."EntityType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "OnboardingStep_new" AS ENUM ('SELECT_CATEGORY', 'ADD_FIRST_PRODUCT', 'CONNECT_BOT');
ALTER TABLE "public"."onboarding_progress" ALTER COLUMN "nextStep" DROP DEFAULT;
ALTER TABLE "onboarding_progress" ALTER COLUMN "nextStep" TYPE "OnboardingStep_new" USING ("nextStep"::text::"OnboardingStep_new");
ALTER TYPE "OnboardingStep" RENAME TO "OnboardingStep_old";
ALTER TYPE "OnboardingStep_new" RENAME TO "OnboardingStep";
DROP TYPE "public"."OnboardingStep_old";
ALTER TABLE "onboarding_progress" ALTER COLUMN "nextStep" SET DEFAULT 'SELECT_CATEGORY';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."field_values" DROP CONSTRAINT "field_values_fieldId_fkey";

-- DropForeignKey
ALTER TABLE "public"."field_values" DROP CONSTRAINT "field_values_productId_fkey";

-- DropForeignKey
ALTER TABLE "public"."product_schemas" DROP CONSTRAINT "product_schemas_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."products" DROP CONSTRAINT "products_schemaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."schema_fields" DROP CONSTRAINT "schema_fields_schemaId_fkey";

-- AlterTable
ALTER TABLE "onboarding_progress" DROP COLUMN "isSchemaConfigured";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "schemaId",
ADD COLUMN     "categoryId" INTEGER;

-- DropTable
DROP TABLE "public"."field_values";

-- DropTable
DROP TABLE "public"."product_schemas";

-- DropTable
DROP TABLE "public"."schema_fields";

-- CreateTable
CREATE TABLE "fulfillment_settings" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "fulfillmentMode" "FulfillmentMode" NOT NULL,
    "deliveryMethod" "DeliveryMethod",
    "deliveryFeeType" "DeliveryFeeType",
    "deliveryFee" DOUBLE PRECISION,
    "pickupAddress" TEXT,
    "pickupInstructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fulfillment_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name_uz" TEXT NOT NULL DEFAULT '',
    "name_ru" TEXT NOT NULL DEFAULT '',
    "name_en" TEXT NOT NULL DEFAULT '',
    "parentId" INTEGER,
    "isLeaf" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_specs" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "item_specs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_spec_values" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "itemSpecId" INTEGER NOT NULL,
    "valueText" TEXT,
    "valueNumber" DOUBLE PRECISION,
    "valueBool" BOOLEAN,
    "valueDate" TIMESTAMP(3),
    "valueJson" JSONB,

    CONSTRAINT "item_spec_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CategoryToOrganization" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_CategoryToOrganization_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "fulfillment_settings_organizationId_key" ON "fulfillment_settings"("organizationId");

-- CreateIndex
CREATE INDEX "item_spec_values_valueText_idx" ON "item_spec_values"("valueText");

-- CreateIndex
CREATE INDEX "item_spec_values_productId_idx" ON "item_spec_values"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "item_spec_values_productId_itemSpecId_key" ON "item_spec_values"("productId", "itemSpecId");

-- CreateIndex
CREATE INDEX "_CategoryToOrganization_B_index" ON "_CategoryToOrganization"("B");

-- AddForeignKey
ALTER TABLE "fulfillment_settings" ADD CONSTRAINT "fulfillment_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_specs" ADD CONSTRAINT "item_specs_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_spec_values" ADD CONSTRAINT "item_spec_values_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_spec_values" ADD CONSTRAINT "item_spec_values_itemSpecId_fkey" FOREIGN KEY ("itemSpecId") REFERENCES "item_specs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToOrganization" ADD CONSTRAINT "_CategoryToOrganization_A_fkey" FOREIGN KEY ("A") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToOrganization" ADD CONSTRAINT "_CategoryToOrganization_B_fkey" FOREIGN KEY ("B") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
