ALTER TABLE "Suggestion" ADD COLUMN "anonymous" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "SuggestionComment" (
  "id"           TEXT NOT NULL,
  "suggestionId" TEXT NOT NULL,
  "authorId"     TEXT,
  "body"         TEXT NOT NULL,
  "isAdminReply" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SuggestionComment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SuggestionComment"
  ADD CONSTRAINT "SuggestionComment_suggestionId_fkey"
  FOREIGN KEY ("suggestionId") REFERENCES "Suggestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SuggestionComment"
  ADD CONSTRAINT "SuggestionComment_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "SuggestionComment_suggestionId_idx" ON "SuggestionComment"("suggestionId");
