-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "eventDate" TIMESTAMP(3),
ADD COLUMN     "eventEndDate" TIMESTAMP(3),
ADD COLUMN     "eventLocation" TEXT;

-- CreateIndex
CREATE INDEX "Article_published_eventDate_idx" ON "Article"("published", "eventDate");
