CREATE TABLE "path_chests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uid" varchar(128) NOT NULL,
	"unit_id" uuid NOT NULL,
	"chest_index" integer NOT NULL,
	"gems" integer DEFAULT 0 NOT NULL,
	"claimed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "path_chests_uid_unit_index_uq" ON "path_chests" USING btree ("uid","unit_id","chest_index");--> statement-breakpoint
CREATE INDEX "path_chests_uid_idx" ON "path_chests" USING btree ("uid");