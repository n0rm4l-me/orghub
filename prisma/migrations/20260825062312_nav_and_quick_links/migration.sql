-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "showInNav" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "QuickLink" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuickLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuickLink_order_idx" ON "QuickLink"("order");

-- CreateIndex
CREATE INDEX "Page_published_order_idx" ON "Page"("published", "order");
