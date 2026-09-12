ALTER TABLE "courses" ADD COLUMN "title_en" varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "description_en" varchar(500) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "prompt_en" varchar(500) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "options_en" jsonb;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "explanation_en" varchar(500) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "title_en" varchar(160) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "title_en" varchar(120) DEFAULT '' NOT NULL;