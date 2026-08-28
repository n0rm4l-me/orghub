-- AlterTable: add kudosLayout column to SiteSettings
ALTER TABLE "SiteSettings"
  ADD COLUMN "kudosLayout" TEXT NOT NULL DEFAULT 'content';
