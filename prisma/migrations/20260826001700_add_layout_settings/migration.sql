-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "feedSidebar" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pagesSidebar" BOOLEAN NOT NULL DEFAULT false;
