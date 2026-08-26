-- Add layout string columns with defaults
ALTER TABLE "SiteSettings" ADD COLUMN "feedLayout" TEXT NOT NULL DEFAULT 'sidebar-right';
ALTER TABLE "SiteSettings" ADD COLUMN "articleLayout" TEXT NOT NULL DEFAULT 'sidebar-right';
ALTER TABLE "SiteSettings" ADD COLUMN "pagesLayout" TEXT NOT NULL DEFAULT 'content';
ALTER TABLE "SiteSettings" ADD COLUMN "leftSidebarOrder" TEXT NOT NULL DEFAULT '';

-- Backfill from existing booleans
UPDATE "SiteSettings" SET
  "feedLayout"    = CASE WHEN "feedSidebar"    = TRUE THEN 'sidebar-right' ELSE 'content' END,
  "articleLayout" = CASE WHEN "articleSidebar" = TRUE THEN 'sidebar-right' ELSE 'content' END,
  "pagesLayout"   = CASE WHEN "pagesSidebar"   = TRUE THEN 'sidebar-right' ELSE 'content' END;

-- Drop boolean columns
ALTER TABLE "SiteSettings" DROP COLUMN "feedSidebar";
ALTER TABLE "SiteSettings" DROP COLUMN "articleSidebar";
ALTER TABLE "SiteSettings" DROP COLUMN "pagesSidebar";
