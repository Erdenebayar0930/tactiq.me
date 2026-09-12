CREATE TABLE "app_config" (
	"id" varchar(16) PRIMARY KEY DEFAULT 'app' NOT NULL,
	"has_admin" boolean DEFAULT false NOT NULL,
	"site_name" varchar(120) DEFAULT 'Tactiq' NOT NULL,
	"default_daily_goal" integer DEFAULT 3 NOT NULL,
	"heart_refill_minutes" integer DEFAULT 30 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uid" varchar(128) NOT NULL,
	"device_id" varchar(64) NOT NULL,
	"label" varchar(200) DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uid" varchar(128) NOT NULL,
	"course_slug" varchar(32) NOT NULL,
	"lesson_id" varchar(64) NOT NULL,
	"xp_earned" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"uid" varchar(128) PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"display_name" varchar(120) DEFAULT '' NOT NULL,
	"first_name" varchar(120) DEFAULT '' NOT NULL,
	"last_name" varchar(120) DEFAULT '' NOT NULL,
	"photo_url" varchar(1024) DEFAULT '' NOT NULL,
	"birth_year" integer DEFAULT 0 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"gems" integer DEFAULT 230 NOT NULL,
	"hearts" integer DEFAULT 5 NOT NULL,
	"hearts_updated_at" timestamp DEFAULT now() NOT NULL,
	"streak_days" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"streak_freezes" integer DEFAULT 1 NOT NULL,
	"streak_freezes_purchased" integer DEFAULT 0 NOT NULL,
	"last_active_day" varchar(10) DEFAULT '' NOT NULL,
	"daily_goal" integer DEFAULT 3 NOT NULL,
	"language" varchar(8) DEFAULT 'mn' NOT NULL,
	"sound_enabled" boolean DEFAULT true NOT NULL,
	"notifications_enabled" boolean DEFAULT true NOT NULL,
	"theme" varchar(16) DEFAULT 'system' NOT NULL,
	"active_course_slug" varchar(32),
	"role" varchar(32) DEFAULT 'student' NOT NULL,
	"secondary_role" varchar(32),
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"student_invite_code" varchar(12),
	"referred_by" varchar(128),
	"referral_rewarded_at" timestamp,
	"premium_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "devices_uid_device_uq" ON "devices" USING btree ("uid","device_id");--> statement-breakpoint
CREATE INDEX "devices_uid_idx" ON "devices" USING btree ("uid","last_seen_at");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_progress_uid_lesson_uq" ON "lesson_progress" USING btree ("uid","lesson_id");--> statement-breakpoint
CREATE INDEX "lesson_progress_uid_course_idx" ON "lesson_progress" USING btree ("uid","course_slug");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_student_invite_code_uq" ON "users" USING btree ("student_invite_code");--> statement-breakpoint
CREATE INDEX "users_xp_idx" ON "users" USING btree ("xp");