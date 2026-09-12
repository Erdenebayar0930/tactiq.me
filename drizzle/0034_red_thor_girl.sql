CREATE TABLE "tournament_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uid" varchar(128) NOT NULL,
	"tournament_id" varchar(64) NOT NULL,
	"source" varchar(16) NOT NULL,
	"month_key" varchar(7) NOT NULL,
	"payment_id" uuid,
	"synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "kind" varchar(16) DEFAULT 'premium' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "ref" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tournament_tier" varchar(16);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tournament_tier_until" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_entries_uid_tournament_uq" ON "tournament_entries" USING btree ("uid","tournament_id");--> statement-breakpoint
CREATE INDEX "tournament_entries_uid_month_idx" ON "tournament_entries" USING btree ("uid","month_key");