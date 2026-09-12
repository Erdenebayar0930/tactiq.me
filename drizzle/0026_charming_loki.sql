ALTER TABLE "payments" ADD COLUMN "ebarimt_type" varchar(16) DEFAULT 'citizen' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "register_no" varchar(16) DEFAULT '' NOT NULL;