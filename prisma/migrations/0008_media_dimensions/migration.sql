-- Intrinsic pixel dimensions for uploaded media, so <img width height> can
-- be rendered up front and avoid layout shift. Nullable: existing rows and
-- anything sharp can't read stay untouched, not backfilled.
ALTER TABLE "Media" ADD COLUMN "width" INTEGER;
ALTER TABLE "Media" ADD COLUMN "height" INTEGER;
