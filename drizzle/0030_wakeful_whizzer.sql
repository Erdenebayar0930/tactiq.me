ALTER TABLE "users" ADD COLUMN "bg_theme" varchar(24) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "owned_backgrounds" jsonb DEFAULT '[]'::jsonb NOT NULL;