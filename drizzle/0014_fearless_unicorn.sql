CREATE TABLE "student_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adult_uid" varchar(128) NOT NULL,
	"student_uid" varchar(128) NOT NULL,
	"relation" varchar(16) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "student_links_uq" ON "student_links" USING btree ("adult_uid","student_uid","relation");--> statement-breakpoint
CREATE INDEX "student_links_adult_idx" ON "student_links" USING btree ("adult_uid","relation");--> statement-breakpoint
CREATE INDEX "student_links_student_idx" ON "student_links" USING btree ("student_uid");