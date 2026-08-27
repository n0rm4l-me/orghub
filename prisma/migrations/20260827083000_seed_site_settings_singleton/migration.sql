-- Seed the SiteSettings singleton so the read path never has to write.
-- getSettings() used to upsert on every call, which meant every page render took a
-- row lock on this single row. That serialises all renders across all pods, so adding
-- replicas made the portal slower rather than faster.
--
-- Every column other than "id" is either nullable or NOT NULL DEFAULT, so inserting
-- the id alone produces a fully valid row.
INSERT INTO "SiteSettings" ("id") VALUES ('singleton')
ON CONFLICT ("id") DO NOTHING;
