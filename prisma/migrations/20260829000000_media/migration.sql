-- AlterTable: add key column and relation to Media
ALTER TABLE "Media" ADD COLUMN "key" TEXT NOT NULL DEFAULT '';
UPDATE "Media" SET "key" = "id" WHERE "key" = '';
ALTER TABLE "Media" ALTER COLUMN "key" DROP DEFAULT;
ALTER TABLE "Media" ADD CONSTRAINT "Media_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "Media_key_key" ON "Media"("key");
CREATE INDEX "Media_uploadedById_idx" ON "Media"("uploadedById");
CREATE INDEX "Media_createdAt_idx" ON "Media"("createdAt");
