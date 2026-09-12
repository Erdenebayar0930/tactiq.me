CREATE TABLE "pets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uid" varchar(128) NOT NULL,
	"species" varchar(24) NOT NULL,
	"name" varchar(40) DEFAULT '' NOT NULL,
	"last_care_at" timestamp,
	"care_streak" integer DEFAULT 0 NOT NULL,
	"best_streak" integer DEFAULT 0 NOT NULL,
	"total_care" integer DEFAULT 0 NOT NULL,
	"claimed_milestones" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "pets_uid_idx" ON "pets" USING btree ("uid","created_at");