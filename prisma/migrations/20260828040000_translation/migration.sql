-- AlterTable: add translation settings to SiteSettings
ALTER TABLE "SiteSettings" ADD COLUMN "translationProvider" TEXT NOT NULL DEFAULT 'mymemory';
ALTER TABLE "SiteSettings" ADD COLUMN "translationLanguages" TEXT NOT NULL DEFAULT 'en,ru,ja,zh,es,fr,hi,uk';

-- CreateTable: ArticleTranslation
CREATE TABLE "ArticleTranslation" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArticleTranslation_articleId_idx" ON "ArticleTranslation"("articleId");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "ArticleTranslation_articleId_lang_key" ON "ArticleTranslation"("articleId", "lang");

-- AddForeignKey
ALTER TABLE "ArticleTranslation" ADD CONSTRAINT "ArticleTranslation_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
