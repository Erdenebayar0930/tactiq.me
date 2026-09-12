-- ГАРААР бичсэн ӨГӨГДЛИЙН миграц.
--
-- "Шатар Kids" ("chess-kids") курсийг "Шатар" ("chess") руу НЭГТГЭНЭ — шатар
-- НЭГ л курс болно.
--
--   1. units          — chess-kids-ийн бүлгүүд chess руу. Дараалал:
--                       chess-ийн эхний бүлэг (Эхлэл) → хүүхдийн бүлгүүд
--                       (хөлөг, дүрсийн нүүдэл, идэлт) → chess-ийн бусад бүлэг
--                       (Өрөг бодлого …). Анхан шатнаас нь эхлэхийн тулд.
--   2. lesson_progress — сурагчдын дуусгасан хичээлийн курсийг шилжүүлнэ
--                        (хичээлийн id өөрчлөгдөхгүй тул явц алдагдахгүй).
--   3. course_time     — зарцуулсан цагийг chess дээр НЭМНЭ.
--   4. users           — идэвхтэй курс нь chess-kids байсан бол chess.
--   5. courses         — chess-kids-ийг устгана (бүлгүүд нь аль хэдийн зөөгдсөн
--                        тул CASCADE юу ч устгахгүй).
--
-- ⚠ ЗӨВХӨН НЭГ УДАА, НЭГ ГҮЙЛГЭЭ ДОТОР ажиллуулна. Дахин ажиллуулахад
-- chess-kids мөр байхгүй тул UPDATE-үүд юу ч өөрчлөхгүй — гэхдээ 1-р
-- алхмын дарааллын шилжүүлэлт нь chess-kids бүлэг байх үед л ажиллана.
UPDATE "units"
SET "sort_order" = "sort_order" + (SELECT count(*) FROM "units" WHERE "course_slug" = 'chess-kids')
WHERE "course_slug" = 'chess' AND "sort_order" > 0;--> statement-breakpoint
UPDATE "units" SET "course_slug" = 'chess', "sort_order" = "sort_order" + 1
WHERE "course_slug" = 'chess-kids';--> statement-breakpoint
UPDATE "lesson_progress" SET "course_slug" = 'chess' WHERE "course_slug" = 'chess-kids';--> statement-breakpoint
INSERT INTO "course_time" ("uid", "course_slug", "seconds", "updated_at")
SELECT "uid", 'chess', "seconds", "updated_at" FROM "course_time" WHERE "course_slug" = 'chess-kids'
ON CONFLICT ("uid", "course_slug") DO UPDATE SET
  "seconds" = "course_time"."seconds" + EXCLUDED."seconds",
  "updated_at" = GREATEST("course_time"."updated_at", EXCLUDED."updated_at");--> statement-breakpoint
DELETE FROM "course_time" WHERE "course_slug" = 'chess-kids';--> statement-breakpoint
UPDATE "users" SET "active_course_slug" = 'chess' WHERE "active_course_slug" = 'chess-kids';--> statement-breakpoint
DELETE FROM "courses" WHERE "slug" = 'chess-kids';
