-- Add wordCount field to Article
ALTER TABLE "Article" ADD COLUMN "wordCount" INTEGER NOT NULL DEFAULT 0;

-- Article compound indexes
CREATE INDEX "Article_published_pinned_publishedAt_idx" ON "Article"("published", "pinned", "publishedAt");
CREATE INDEX "Article_eventDate_createdAt_idx" ON "Article"("eventDate", "createdAt");

-- CategoriesOnArticles
CREATE INDEX "CategoriesOnArticles_categoryId_idx" ON "CategoriesOnArticles"("categoryId");

-- Category
CREATE INDEX "Category_name_idx" ON "Category"("name");

-- WeekMenu
CREATE UNIQUE INDEX IF NOT EXISTS "WeekMenu_venueId_weekStart_key" ON "WeekMenu"("venueId", "weekStart");
CREATE INDEX "WeekMenu_venueId_publishedAt_idx" ON "WeekMenu"("venueId", "publishedAt");

-- User
CREATE INDEX "User_role_createdAt_idx" ON "User"("role", "createdAt");
CREATE INDEX "User_active_name_idx" ON "User"("active", "name");
CREATE INDEX "User_role_active_idx" ON "User"("role", "active");

-- Dish
CREATE INDEX "Dish_venueId_name_idx" ON "Dish"("venueId", "name");

-- MonthlyTopic
CREATE INDEX IF NOT EXISTS "MonthlyTopic_venueId_publishedAt_idx" ON "MonthlyTopic"("venueId", "publishedAt");

-- Full-text search (pg_trgm)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "Article_title_trgm_idx" ON "Article" USING gin (title gin_trgm_ops);
CREATE INDEX "Article_excerpt_trgm_idx" ON "Article" USING gin (excerpt gin_trgm_ops);
CREATE INDEX "User_name_trgm_idx" ON "User" USING gin (name gin_trgm_ops);
CREATE INDEX "Media_filename_trgm_idx" ON "Media" USING gin (filename gin_trgm_ops);
