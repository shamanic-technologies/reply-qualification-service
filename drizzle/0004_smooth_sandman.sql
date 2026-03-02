DROP INDEX IF EXISTS "idx_qr_app";--> statement-breakpoint
ALTER TABLE "qualification_requests" DROP COLUMN IF EXISTS "app_id";