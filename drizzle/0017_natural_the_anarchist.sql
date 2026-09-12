CREATE TABLE "family_seats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_uid" varchar(128) NOT NULL,
	"member_uid" varchar(128) NOT NULL,
	"granted_until" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "family_seats_owner_member_uq" ON "family_seats" USING btree ("owner_uid","member_uid");--> statement-breakpoint
CREATE INDEX "family_seats_owner_idx" ON "family_seats" USING btree ("owner_uid","granted_until");