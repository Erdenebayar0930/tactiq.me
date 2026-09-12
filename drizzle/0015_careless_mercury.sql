CREATE TABLE "course_time" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uid" varchar(128) NOT NULL,
	"course_slug" varchar(32) NOT NULL,
	"seconds" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "friend_quests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_key" varchar(10) NOT NULL,
	"user_a_uid" varchar(128) NOT NULL,
	"user_b_uid" varchar(128) NOT NULL,
	"goal_xp" integer NOT NULL,
	"xp_a" integer DEFAULT 0 NOT NULL,
	"xp_b" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp,
	"rewarded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_a_uid" varchar(128) NOT NULL,
	"user_b_uid" varchar(128) NOT NULL,
	"requested_by" varchar(128) NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "league_cohorts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tier" integer NOT NULL,
	"week_key" varchar(10) NOT NULL,
	"member_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "league_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cohort_id" uuid NOT NULL,
	"uid" varchar(128) NOT NULL,
	"week_key" varchar(10) NOT NULL,
	"tier" integer NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"rank" integer,
	"outcome" varchar(16),
	"settled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "rating" integer DEFAULT 1200 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "rating_games" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "league_tier" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "course_time_uid_course_uq" ON "course_time" USING btree ("uid","course_slug");--> statement-breakpoint
CREATE INDEX "course_time_uid_idx" ON "course_time" USING btree ("uid");--> statement-breakpoint
CREATE UNIQUE INDEX "friend_quests_week_pair_uq" ON "friend_quests" USING btree ("week_key","user_a_uid","user_b_uid");--> statement-breakpoint
CREATE INDEX "friend_quests_a_idx" ON "friend_quests" USING btree ("user_a_uid","week_key");--> statement-breakpoint
CREATE INDEX "friend_quests_b_idx" ON "friend_quests" USING btree ("user_b_uid","week_key");--> statement-breakpoint
CREATE UNIQUE INDEX "friendships_pair_uq" ON "friendships" USING btree ("user_a_uid","user_b_uid");--> statement-breakpoint
CREATE INDEX "friendships_a_idx" ON "friendships" USING btree ("user_a_uid","status");--> statement-breakpoint
CREATE INDEX "friendships_b_idx" ON "friendships" USING btree ("user_b_uid","status");--> statement-breakpoint
CREATE INDEX "league_cohorts_tier_week_idx" ON "league_cohorts" USING btree ("tier","week_key","member_count");--> statement-breakpoint
CREATE UNIQUE INDEX "league_members_uid_week_uq" ON "league_members" USING btree ("uid","week_key");--> statement-breakpoint
CREATE INDEX "league_members_cohort_xp_idx" ON "league_members" USING btree ("cohort_id","xp");--> statement-breakpoint
CREATE INDEX "league_members_uid_settled_idx" ON "league_members" USING btree ("uid","settled_at");