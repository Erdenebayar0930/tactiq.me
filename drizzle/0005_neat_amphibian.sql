ALTER TABLE "users" ADD COLUMN "draughts_wins" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "draughts_losses" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "draughts_draws" integer DEFAULT 0 NOT NULL;