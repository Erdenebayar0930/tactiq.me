-- Сургуулийн жагсаалт өөрчлөгдсөнд одоо байгаа курсуудыг тааруулах.
--
-- ⚠ ГАРААР ажиллуулна — `drizzle/meta/_journal.json`-д ОРООГҮЙ (энэ репод
-- өгөгдлийн миграцууд тийм конвенцтой: 0036_school_leagues.sql,
-- 0037_merge_chess_kids.sql). `npm run db:push` нь схемийг л тааруулдаг
-- болохоод мөрийн агуулгад хүрэхгүй тул энэ файлыг psql-ээр дуудна:
--     psql "$DATABASE_URL" -f drizzle/0038_schools_kids_split.sql
--
-- Юу өөрчлөгдсөн (`lib/tactiq/schools.ts`):
--   • ХАСАГДСАН: "itkids", "future"
--   • НЭМЭГДСЭН: "kids-4-6", "kids-7-10" (сэдвээр биш НАСААР)
--   • Дараалал: mind → kids-4-6 → kids-7-10 → codely → create → life
--
-- ⚠ Дахин ажиллуулж болно (idempotent) — бүх UPDATE нь нөхцөлтэй.
--
-- ⚠ `league_members.course_slug` дэх хуучин "itkids"/"future" түлхүүрийг
-- ЗОРИУД хөндөөгүй: `leagueKeyForSchool` (`lib/tactiq/league.ts`) танихгүй
-- түлхүүрийг «Бусад» лиг болгож уншдаг тул XP алга болохгүй, харин өнгөрсөн
-- долоо хоногуудын түүх хэвээр үлдэнэ (0036_school_leagues.sql-ийн адил).

BEGIN;

-- 1. Хоосон `schools`-ыг эхлээд `school`-оор бөглөнө.
--    `courseSchools` (`lib/db/courses.ts`) нь хоосон массивыг `[school]`-оор
--    орлуулдаг тул сан дээр хоёр өөр дүрслэл зэрэг оршдог. Доорх 3-р
--    алхам массив дээр ажиллах тул эхлээд нэг дүрслэл болгоно.
UPDATE "courses"
SET "schools" = ARRAY["school"]::varchar[]
WHERE "school" <> '' AND cardinality("schools") = 0;

-- 2. "itkids" → "codely". Цорын ганц курс нь «Бяцхан кодчин»
--    (`scripts/seed-kids-coding.ts`) — блокоор код бичих тул Codely-д харьяална.
UPDATE "courses" SET "school" = 'codely' WHERE "school" = 'itkids';

--    Массив дээр: аль хэдийн 'codely' байгаа бол ДАВХАРДУУЛАХГҮЙ, зүгээр л
--    'itkids'-ийг хасна; үгүй бол сольж бичнэ.
UPDATE "courses"
SET "schools" = array_remove("schools", 'itkids')
WHERE 'itkids' = ANY("schools") AND 'codely' = ANY("schools");

UPDATE "courses"
SET "schools" = array_replace("schools", 'itkids', 'codely')
WHERE 'itkids' = ANY("schools");

-- 3. `-kids` дагавартай курсуудыг НАСНЫ сургуульд ч нэмнэ.
--    ⚠ `school` (үндсэн) нь СЭДЭВ хэвээр — гэрчилгээ, ур чадвар түүнээс
--    уншигддаг тул хүүхэд "Kids 4-6" биш "Математик" гэсэн гэрчилгээ авна.
--    Тиймээс 'kids-4-6' нь массивын ТӨГСГӨЛД залгагдана.
--
--    ⚠ Нас холилдсон курс (жишээ нь `chess` — 0037_merge_chess_kids.sql нь
--    chess-kids-ийг түүн дотор нийлүүлсэн) дагавартай БИШ тул орохгүй.
UPDATE "courses"
SET "schools" = "schools" || 'kids-4-6'::varchar
WHERE "slug" LIKE '%-kids' AND NOT ('kids-4-6' = ANY("schools"));

COMMIT;
