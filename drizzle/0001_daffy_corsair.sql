CREATE TABLE "chess_queue" (
	"uid" varchar(128) PRIMARY KEY NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chess_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"white_uid" varchar(128) NOT NULL,
	"black_uid" varchar(128) NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"winner_uid" varchar(128),
	"end_reason" varchar(16),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chess_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"from_uid" varchar(128) NOT NULL,
	"type" varchar(16) NOT NULL,
	"payload" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "chess_rooms_white_uid_idx" ON "chess_rooms" USING btree ("white_uid");--> statement-breakpoint
CREATE INDEX "chess_rooms_black_uid_idx" ON "chess_rooms" USING btree ("black_uid");--> statement-breakpoint
CREATE INDEX "chess_signals_room_created_idx" ON "chess_signals" USING btree ("room_id","created_at");