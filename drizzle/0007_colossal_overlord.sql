ALTER TABLE "exercises" ALTER COLUMN "options" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "exercises" ALTER COLUMN "correct_option_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "type" varchar(16) DEFAULT 'choice' NOT NULL;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "fen" varchar(100);--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "correct_from" varchar(4);--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "correct_to" varchar(4);--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "correct_promotion" varchar(4);