/*
  Warnings:

  - You are about to drop the column `brandName` on the `barcode_catalog_entries` table. All the data in the column will be lost.
  - You are about to drop the column `categoryName` on the `barcode_catalog_entries` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `barcode_catalog_entries` table. All the data in the column will be lost.
  - You are about to drop the column `productName` on the `barcode_catalog_entries` table. All the data in the column will be lost.
  - You are about to drop the column `unitName` on the `barcode_catalog_entries` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "barcode_catalog_entries" DROP COLUMN "brandName",
DROP COLUMN "categoryName",
DROP COLUMN "description",
DROP COLUMN "productName",
DROP COLUMN "unitName",
ADD COLUMN     "businessCategories" "BUSINESS_CATEGORY"[];

-- CreateTable
CREATE TABLE "barcode_catalog_translations" (
    "id" SERIAL NOT NULL,
    "entryId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "productName" TEXT,
    "description" TEXT,
    "brandName" TEXT,
    "categoryName" TEXT,
    "unitName" TEXT,

    CONSTRAINT "barcode_catalog_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "barcode_catalog_translations_entryId_languageCode_key" ON "barcode_catalog_translations"("entryId", "languageCode");

-- AddForeignKey
ALTER TABLE "barcode_catalog_translations" ADD CONSTRAINT "barcode_catalog_translations_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "barcode_catalog_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
