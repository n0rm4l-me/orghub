-- Anonymous suggestions must keep no link to their submitter.
-- Earlier versions stored authorId and only masked it on read, which left the
-- author recoverable from the database, a backup or a replica.
UPDATE "Suggestion" SET "authorId" = NULL WHERE "anonymous" = true;
