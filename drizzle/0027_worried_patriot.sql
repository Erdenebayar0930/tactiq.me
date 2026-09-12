ALTER TABLE "users" ADD COLUMN "avatar_frame" varchar(24) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "owned_frames" jsonb DEFAULT '[]'::jsonb NOT NULL;