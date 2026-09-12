CREATE TABLE "promo_codes" (
	"code" varchar(24) PRIMARY KEY NOT NULL,
	"owner_uid" varchar(128) NOT NULL,
	"discount_percent" integer NOT NULL,
	"commission_percent" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"note" varchar(200) DEFAULT '' NOT NULL,
	"created_by" varchar(128),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promoter_uid" varchar(128) NOT NULL,
	"amount_mnt" integer NOT NULL,
	"note" varchar(200) DEFAULT '' NOT NULL,
	"created_by" varchar(128),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "promo_code" varchar(24);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "promoter_uid" varchar(128);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "commission_mnt" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "promo_codes_owner_idx" ON "promo_codes" USING btree ("owner_uid");--> statement-breakpoint
CREATE INDEX "promo_payouts_promoter_idx" ON "promo_payouts" USING btree ("promoter_uid","created_at");