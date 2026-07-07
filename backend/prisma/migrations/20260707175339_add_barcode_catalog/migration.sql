-- CreateEnum
CREATE TYPE "BarcodeCatalogStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BarcodeSource" AS ENUM ('SOLIQ', 'MANUAL');

-- CreateTable
CREATE TABLE "barcode_catalog_entries" (
    "id" SERIAL NOT NULL,
    "barcode" TEXT NOT NULL,
    "status" "BarcodeCatalogStatus" NOT NULL DEFAULT 'PENDING',
    "source" "BarcodeSource",
    "productName" TEXT,
    "description" TEXT,
    "brandName" TEXT,
    "categoryName" TEXT,
    "unitName" TEXT,
    "mxikCode" TEXT,
    "imageUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "barcode_catalog_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "barcode_catalog_entries_barcode_key" ON "barcode_catalog_entries"("barcode");

-- CreateIndex
CREATE INDEX "barcode_catalog_entries_status_idx" ON "barcode_catalog_entries"("status");
