ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "license_text" text;

UPDATE "models"
SET "license_text" = CASE
  WHEN "licenses"."slug" = 'closed-source' THEN 'Proprietary'
  ELSE NULL
END
FROM "licenses"
WHERE "models"."license_id" = "licenses"."id";

DROP INDEX IF EXISTS "models_license_category_idx";
ALTER TABLE "models" DROP COLUMN IF EXISTS "license_id";
CREATE INDEX IF NOT EXISTS "models_category_idx" ON "models" ("category_id");
