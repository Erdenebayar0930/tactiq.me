CREATE TABLE "courses" (
	"slug" varchar(32) PRIMARY KEY NOT NULL,
	"title" varchar(120) NOT NULL,
	"description" varchar(500) DEFAULT '' NOT NULL,
	"icon" varchar(32) DEFAULT 'book' NOT NULL,
	"color" varchar(16) DEFAULT 'violet' NOT NULL,
	"status" varchar(16) DEFAULT 'coming-soon' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" varchar(64) NOT NULL,
	"prompt" varchar(500) NOT NULL,
	"options" jsonb NOT NULL,
	"correct_option_id" varchar(8) NOT NULL,
	"explanation" varchar(500) DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"unit_id" uuid NOT NULL,
	"title" varchar(160) NOT NULL,
	"xp_reward" integer DEFAULT 10 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_slug" varchar(32) NOT NULL,
	"title" varchar(120) NOT NULL,
	"color" varchar(16) DEFAULT 'violet' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_course_slug_courses_slug_fk" FOREIGN KEY ("course_slug") REFERENCES "public"."courses"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exercises_lesson_idx" ON "exercises" USING btree ("lesson_id","sort_order");--> statement-breakpoint
CREATE INDEX "lessons_unit_idx" ON "lessons" USING btree ("unit_id","sort_order");--> statement-breakpoint
CREATE INDEX "units_course_idx" ON "units" USING btree ("course_slug","sort_order");