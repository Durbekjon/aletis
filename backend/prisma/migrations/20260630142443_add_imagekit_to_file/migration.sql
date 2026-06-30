-- AlterTable: migrate File storage from local disk to ImageKit
ALTER TABLE "files" ADD COLUMN "url" TEXT NOT NULL DEFAULT '';
ALTER TABLE "files" ADD COLUMN "imagekitFileId" TEXT;

-- Drop the default now that the column exists; new rows must supply a url
ALTER TABLE "files" ALTER COLUMN "url" DROP DEFAULT;
