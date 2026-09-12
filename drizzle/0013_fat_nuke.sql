ALTER TABLE "referrals" ADD COLUMN "rewarded_at" timestamp;--> statement-breakpoint
CREATE INDEX "referrals_referrer_rewarded_idx" ON "referrals" USING btree ("referrer_uid","rewarded_at");