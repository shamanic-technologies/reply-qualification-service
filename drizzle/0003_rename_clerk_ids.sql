ALTER TABLE "qualification_requests" RENAME COLUMN "clerk_org_id" TO "org_id";--> statement-breakpoint
ALTER TABLE "qualification_requests" RENAME COLUMN "clerk_user_id" TO "user_id";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_qr_clerk_org";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_qr_org" ON "qualification_requests" USING btree ("org_id");
