-- ⚠ ЭНЭ ХОЁР DELETE-ийг drizzle-kit БИЧЭЭГҮЙ, ГАРААР нэмсэн.
--
-- `course_slug` нь NOT NULL бөгөөд анхдагч утгагүй тул байгаа мөрүүд дээр
-- ALTER TABLE амжилтгүй болно. Анхдагч утга ("chess" гэх мэт) өгөх нь БУРУУ
-- байх байсан: тэдгээр мөрүүд нь БҮХ курсын XP-г нэгтгэсэн хуучин ЕРӨНХИЙ
-- лигийнх — аль нэг курст хамааруулбал өгөгдөл нь худал болно.
--
-- Энэ нь долоо хоногийн өрсөлдөөн тул алдагдал нь ТУХАЙН долоо хоногоор
-- хязгаарлагдана: сурагчдын нийт XP, дараалал, амжилт огт хөндөгдөхгүй.
-- Шинэ бүлэгт дараагийн хичээл дуусгамагц эсвэл жагсаалт нээмэгц нэгдэнэ.
DELETE FROM "league_members";--> statement-breakpoint
DELETE FROM "league_cohorts";--> statement-breakpoint
CREATE TABLE "course_leagues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uid" varchar(128) NOT NULL,
	"course_slug" varchar(32) NOT NULL,
	"tier" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "league_cohorts_tier_week_idx";--> statement-breakpoint
DROP INDEX "league_members_uid_week_uq";--> statement-breakpoint
ALTER TABLE "league_cohorts" ADD COLUMN "course_slug" varchar(32) NOT NULL;--> statement-breakpoint
ALTER TABLE "league_members" ADD COLUMN "course_slug" varchar(32) NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "course_leagues_uid_course_uq" ON "course_leagues" USING btree ("uid","course_slug");--> statement-breakpoint
CREATE INDEX "league_cohorts_course_tier_week_idx" ON "league_cohorts" USING btree ("course_slug","tier","week_key","member_count");--> statement-breakpoint
CREATE UNIQUE INDEX "league_members_uid_course_week_uq" ON "league_members" USING btree ("uid","course_slug","week_key");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "league_tier";