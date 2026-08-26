-- Backfill 'pages' into enabledModules so existing installations keep pages accessible.
UPDATE "SiteSettings"
SET "enabledModules" = CASE
  WHEN "enabledModules" = '' THEN 'pages'
  WHEN "enabledModules" NOT LIKE '%pages%' THEN "enabledModules" || ',pages'
  ELSE "enabledModules"
END;
