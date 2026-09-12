-- ГАРААР бичсэн ӨГӨГДЛИЙН миграц.
--
-- Лиг КУРС ТУС БҮРД тусдаа байсныг СУРГУУЛЬ ТУС БҮРД (Mind, Codely, ITkids,
-- Create, Life, Future, бусад → 'other') болгоно. Хүснэгтийн бүтэц
-- өөрчлөгдөхгүй: `course_slug` баганад одоо ЛИГИЙН ТҮЛХҮҮР бичигдэнэ
-- (`leagueKeyForSchool`, `lib/tactiq/league.ts`).
--
--   1. course_leagues  — (хэрэглэгч, сургууль) бүрт НЭГ мөр: тэр сургуулийн
--                        курсуудын ХАМГИЙН ӨНДӨР шат, хамгийн сүүлийн `last_week_key`.
--   2. league_members  — ДҮГНЭГДЭЭГҮЙ мөрүүдийг (хэрэглэгч, долоо хоног, сургууль)-иар
--                        нэгтгэнэ: XP нийлбэр, шат нь хамгийн өндөр, нэгдсэн мөч нь
--                        хамгийн эрт. Дүгнэгдсэн мөрүүд (түүх) ХЭВЭЭР үлдэнэ.
--   3. league_cohorts  — нэгтгэсэн гишүүдийг (долоо хоног, сургууль, шат) бүрд
--                        20 хүнээр шинэ бүлгүүдэд хуваана.
--
-- ⚠ ЗӨВХӨН НЭГ УДАА, НЭГ ГҮЙЛГЭЭ ДОТОР ажиллуулна.
CREATE TEMP TABLE "league_key_map" AS
SELECT "slug" AS "course_slug",
  CASE WHEN "school" IN ('mind', 'codely', 'itkids', 'create', 'life', 'future') THEN "school" ELSE 'other' END AS "league_key"
FROM "courses";--> statement-breakpoint
CREATE TEMP TABLE "league_standing_merge" AS
SELECT cl."uid", COALESCE(k."league_key", 'other') AS "league_key", max(cl."tier") AS "tier", max(cl."last_week_key") AS "last_week_key"
FROM "course_leagues" cl
LEFT JOIN "league_key_map" k ON k."course_slug" = cl."course_slug"
GROUP BY cl."uid", COALESCE(k."league_key", 'other');--> statement-breakpoint
DELETE FROM "course_leagues";--> statement-breakpoint
INSERT INTO "course_leagues" ("uid", "course_slug", "tier", "last_week_key", "updated_at")
SELECT "uid", "league_key", "tier", "last_week_key", now() FROM "league_standing_merge";--> statement-breakpoint
CREATE TEMP TABLE "league_merge" AS
SELECT
  m."uid",
  m."week_key",
  COALESCE(k."league_key", 'other') AS "league_key",
  max(m."tier") AS "tier",
  sum(m."xp")::int AS "xp",
  min(m."created_at") AS "created_at",
  (row_number() OVER (
    PARTITION BY m."week_key", COALESCE(k."league_key", 'other'), max(m."tier")
    ORDER BY min(m."created_at"), m."uid"
  ) - 1) / 20 AS "bucket"
FROM "league_members" m
LEFT JOIN "league_key_map" k ON k."course_slug" = m."course_slug"
WHERE m."settled_at" IS NULL
GROUP BY m."uid", m."week_key", COALESCE(k."league_key", 'other');--> statement-breakpoint
CREATE TEMP TABLE "league_merge_cohorts" AS
SELECT gen_random_uuid() AS "id", "week_key", "league_key", "tier", "bucket", count(*)::int AS "member_count", min("created_at") AS "created_at"
FROM "league_merge"
GROUP BY "week_key", "league_key", "tier", "bucket";--> statement-breakpoint
DELETE FROM "league_cohorts" c
WHERE EXISTS (SELECT 1 FROM "league_members" m WHERE m."cohort_id" = c."id" AND m."settled_at" IS NULL);--> statement-breakpoint
DELETE FROM "league_members" WHERE "settled_at" IS NULL;--> statement-breakpoint
INSERT INTO "league_cohorts" ("id", "course_slug", "tier", "week_key", "member_count", "created_at")
SELECT "id", "league_key", "tier", "week_key", "member_count", "created_at" FROM "league_merge_cohorts";--> statement-breakpoint
INSERT INTO "league_members" ("cohort_id", "uid", "course_slug", "week_key", "tier", "xp", "created_at")
SELECT c."id", m."uid", m."league_key", m."week_key", m."tier", m."xp", m."created_at"
FROM "league_merge" m
JOIN "league_merge_cohorts" c
  ON c."week_key" = m."week_key" AND c."league_key" = m."league_key" AND c."tier" = m."tier" AND c."bucket" = m."bucket";--> statement-breakpoint
DROP TABLE "league_merge_cohorts";--> statement-breakpoint
DROP TABLE "league_merge";--> statement-breakpoint
DROP TABLE "league_standing_merge";--> statement-breakpoint
DROP TABLE "league_key_map";
