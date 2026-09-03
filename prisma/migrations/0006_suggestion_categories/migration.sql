-- CreateTable: SuggestionCategory
CREATE TABLE "SuggestionCategory" (
  "id"   TEXT NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "SuggestionCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SuggestionCategory_name_key" ON "SuggestionCategory"("name");

-- AlterTable: replace free-text category with FK
ALTER TABLE "Suggestion" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "Suggestion" DROP COLUMN IF EXISTS "category";
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "SuggestionCategory"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
