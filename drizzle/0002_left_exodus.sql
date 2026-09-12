ALTER TABLE "users" ADD COLUMN "chess_wins" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "chess_losses" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "chess_draws" integer DEFAULT 0 NOT NULL;