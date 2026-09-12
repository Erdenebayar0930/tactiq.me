ALTER TABLE "users" ADD COLUMN "banner_theme" varchar(24) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "owned_banners" jsonb DEFAULT '[]'::jsonb NOT NULL;