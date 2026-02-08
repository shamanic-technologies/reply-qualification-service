ALTER TABLE "qualification_requests" ADD COLUMN "app_id" text;--> statement-breakpoint
ALTER TABLE "qualification_requests" ADD COLUMN "clerk_org_id" text;--> statement-breakpoint
ALTER TABLE "qualification_requests" ADD COLUMN "clerk_user_id" text;--> statement-breakpoint
ALTER TABLE "qualification_requests" ADD COLUMN "brand_id" text;--> statement-breakpoint
ALTER TABLE "qualification_requests" ADD COLUMN "campaign_id" text;--> statement-breakpoint
ALTER TABLE "qualification_requests" ADD COLUMN "run_id" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_qr_clerk_org" ON "qualification_requests" USING btree ("clerk_org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_qr_campaign" ON "qualification_requests" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_qr_app" ON "qualification_requests" USING btree ("app_id");