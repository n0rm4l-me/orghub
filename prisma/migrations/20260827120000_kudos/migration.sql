-- AlterTable: add kudos settings columns to SiteSettings
ALTER TABLE "SiteSettings"
  ADD COLUMN "kudosMonthlyBudget"   INTEGER  NOT NULL DEFAULT 100,
  ADD COLUMN "kudosValues"          TEXT     NOT NULL DEFAULT 'Innovation,Teamwork,Quality,Customer Focus',
  ADD COLUMN "kudosRedeemEnabled"   BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN "kudosRedeemWebhook"   TEXT,
  ADD COLUMN "kudosRedeemRateLabel" TEXT;

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING', 'DONE', 'FAILED');

-- CreateTable: Kudos
CREATE TABLE "Kudos" (
  "id"        TEXT        NOT NULL,
  "fromId"    TEXT        NOT NULL,
  "toId"      TEXT        NOT NULL,
  "amount"    INTEGER     NOT NULL DEFAULT 1,
  "message"   TEXT        NOT NULL,
  "value"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Kudos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Kudos_toId_createdAt_idx"   ON "Kudos"("toId",   "createdAt");
CREATE INDEX "Kudos_fromId_createdAt_idx" ON "Kudos"("fromId", "createdAt");
CREATE INDEX "Kudos_createdAt_idx"        ON "Kudos"("createdAt");

ALTER TABLE "Kudos"
  ADD CONSTRAINT "Kudos_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Kudos_toId_fkey"   FOREIGN KEY ("toId")   REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: KudosRedemption
CREATE TABLE "KudosRedemption" (
  "id"              TEXT               NOT NULL,
  "userId"          TEXT               NOT NULL,
  "amount"          INTEGER            NOT NULL,
  "status"          "RedemptionStatus" NOT NULL DEFAULT 'PENDING',
  "webhookResponse" TEXT,
  "createdAt"       TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "KudosRedemption_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "KudosRedemption_userId_createdAt_idx" ON "KudosRedemption"("userId", "createdAt");

ALTER TABLE "KudosRedemption"
  ADD CONSTRAINT "KudosRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
