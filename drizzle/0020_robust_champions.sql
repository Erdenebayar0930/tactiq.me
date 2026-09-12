ALTER TABLE "exercises" ADD COLUMN "created_by" varchar(128);--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "created_by" varchar(128);--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "created_by" varchar(128);