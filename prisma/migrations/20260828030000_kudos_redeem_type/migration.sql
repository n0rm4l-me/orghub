-- CreateTable
CREATE TABLE "KudosRedeemType" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "rateLabel" TEXT,
    "webhook" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "KudosRedeemType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KudosRedeemType_active_order_idx" ON "KudosRedeemType"("active", "order");

-- AlterTable
ALTER TABLE "KudosRedemption" ADD COLUMN "typeId" TEXT;

-- AddForeignKey
ALTER TABLE "KudosRedemption" ADD CONSTRAINT "KudosRedemption_typeId_fkey"
    FOREIGN KEY ("typeId") REFERENCES "KudosRedeemType"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
