CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uid" varchar(128) NOT NULL,
	"plan_id" varchar(16) NOT NULL,
	"amount_mnt" integer NOT NULL,
	"discount_percent" integer DEFAULT 0 NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"invoice_id" varchar(64) DEFAULT '' NOT NULL,
	"sender_invoice_no" varchar(64) NOT NULL,
	"days" integer NOT NULL,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "payments_sender_no_uq" ON "payments" USING btree ("sender_invoice_no");--> statement-breakpoint
CREATE INDEX "payments_uid_idx" ON "payments" USING btree ("uid","created_at");