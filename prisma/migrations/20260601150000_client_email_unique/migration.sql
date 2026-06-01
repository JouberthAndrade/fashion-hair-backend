-- Unique e-mail for active clients (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS "clients_email_active_unique"
ON "clients" (LOWER("email"))
WHERE "deleted_at" IS NULL AND "email" IS NOT NULL;
