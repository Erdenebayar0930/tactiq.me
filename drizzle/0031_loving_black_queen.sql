CREATE TABLE "chess_invites" (
	"code" varchar(12) PRIMARY KEY NOT NULL,
	"host_uid" varchar(128) NOT NULL,
	"guest_uid" varchar(128),
	"room_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX "chess_invites_host_idx" ON "chess_invites" USING btree ("host_uid");