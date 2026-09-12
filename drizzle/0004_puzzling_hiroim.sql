CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_uid" varchar(128) NOT NULL,
	"referee_uid" varchar(128) NOT NULL,
	"referred_month" varchar(7) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referee_bonus_percent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "referrals_referrer_month_idx" ON "referrals" USING btree ("referrer_uid","referred_month");--> statement-breakpoint
CREATE UNIQUE INDEX "referrals_referee_uq" ON "referrals" USING btree ("referee_uid");