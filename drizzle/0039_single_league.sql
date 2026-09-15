-- ЛИГИЙГ СУРГУУЛИАР БУС, НЭГ БОЛГОНО.
--
-- ⚠ Урьд нь лигийн түлхүүр нь сургуулийн slug байсан
-- (`0036_school_leagues.sql`). Сурагч Mind-д Алт, Codely-д Хүрэл лигт
-- зэрэг байж болдог байсан нь хоёр асуудал үүсгэсэн: (1) сурагч «би аль
-- лигт байгаа вэ?» гэдгээ хэлж чадахгүй, (2) сургууль бүрд 20 хүний бүлэг
-- бүрдүүлэх хүн хүрэлцэхгүй тул жагсаалт хоосон харагдана.
--
-- ⚠ DDL БАЙХГҮЙ: `course_slug` баганын НЭР хэвээр үлдэнэ, зөвхөн доторх
-- УТГА нь 'all' болно (`lib/tactiq/league.ts`-ийн `GLOBAL_LEAGUE`).

-- 1. ОДООГИЙН ШАТ — сурагч бүрийн ХАМГИЙН ӨНДӨР шатыг үлдээнэ.
--
-- ⚠ Хамгийн өндрийг сонгох нь ЗОРИУД: аль нэг лигт хүрсэн шатыг нь
-- бууруулах нь шударга бус бөгөөд хэрэглэгч шууд анзаарна.
--
-- ⚠ ХОЁР АЛХАМ: эхлээд ялагч мөрийг 'all' болгож нэрлэнэ, дараа нь
-- үлдсэнийг нь устгана. Бүгдийг устгаад дахин бичвэл ямар нэг алхам
-- тасалдахад сурагчийн шат бүхэлдээ алдагдана.
UPDATE course_leagues AS c
SET course_slug = 'all'
FROM (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY uid
           ORDER BY tier DESC, last_week_key DESC NULLS LAST
         ) AS rn
  FROM course_leagues
) AS ranked
WHERE c.id = ranked.id AND ranked.rn = 1;

DELETE FROM course_leagues WHERE course_slug <> 'all';

-- 2. ЭНЭ ДОЛОО ХОНОГИЙН БҮЛГҮҮД — сургуулиар хуваагдсан тул нэгтгэх
-- боломжгүй (нэг бүлэгт 20 хүний хязгаар бий, хоёр бүлгийг нийлүүлбэл
-- хэтэрнэ). Тиймээс энэ долоо хоногийнхыг нь ЗАЙЛУУЛНА: сурагч дараагийн
-- хичээлээ эхлэхэд шинэ, нэгдсэн бүлэгт автоматаар нэгдэнэ
-- (`lib/api/league.ts`-ийн `joinLeague`).
--
-- ⚠ ӨНГӨРСӨН долоо хоногуудыг ХӨНДӨХГҮЙ — тэдгээр нь түүх бөгөөд дүгнэлт
-- нь аль хэдийн `course_leagues`-д бичигдсэн.
-- ⚠ `week_key` нь DATE БИШ, `varchar(10)` ('YYYY-MM-DD') — `schema.ts`-ийн
-- `dayCol`. `::date` руу хөрвүүлбэл төрлийн алдаа өгнө.
DELETE FROM league_members
WHERE week_key = to_char(date_trunc('week', now()), 'YYYY-MM-DD');

DELETE FROM league_cohorts
WHERE week_key = to_char(date_trunc('week', now()), 'YYYY-MM-DD');
