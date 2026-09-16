-- ШАТРЫН НЭР ТОМЬЁО: «шат» → «шаг».
--
-- Ноёныг дайрахыг монголоор «ШАГ» гэдэг. Хичээлийн бичвэрт «шат» гэж
-- буруу орсон байсныг засав (`scripts/curriculum/chess*.ts`-ийг мөн
-- зассан; энэ файл нь САНД аль хэдийн бичигдсэн мөрүүдийг засна — seed-ийг
-- дахин ажиллуулбал сурагчийн явц алдагдана).
--
-- ⚠ «шатны мад» нь ҮЛДЭНЭ: тэнд «шат» нь ГИШГҮҮР гэсэн ЗӨВ утгатай
-- (тэрэгнүүд ээлжлэн эгнээ хааж, шат шиг буулгадаг мад).

CREATE OR REPLACE FUNCTION pg_temp.fix_check_term(src text) RETURNS text AS $$
  SELECT CASE WHEN src IS NULL THEN NULL ELSE
    replace(
      regexp_replace(
        replace(replace(replace(replace(replace(replace(replace(replace(
        replace(replace(replace(replace(replace(replace(replace(replace(
        replace(replace(replace(replace(
          replace(replace(src, 'шатны мад', E'\u0001'), 'шатны мат', E'\u0001'),
          'Шатлагчийг', 'Шаг өгсөн дүрсийг'), 'шатлагчийг', 'шаг өгсөн дүрсийг'),
          'Шатлагдсан', 'Дайрагдсан'), 'шатлагдсан', 'дайрагдсан'),
          'Шатлагч', 'Шаг өгсөн'), 'шатлагч', 'шаг өгсөн'),
          'Шатлана', 'Шаг өгнө'), 'шатлана', 'шаг өгнө'),
          'Шатлаж', 'Шаг өгч'), 'шатлаж', 'шаг өгч'),
          'Шатанд', 'Шагт'), 'шатанд', 'шагт'),
          'Шатнаас', 'Шагаас'), 'шатнаас', 'шагаас'),
          'Шатыг', 'Шагийг'), 'шатыг', 'шагийг'),
          'Шатгүй', 'Шаггүй'), 'шатгүй', 'шаггүй'),
          'Шатны', 'Шагийн'), 'шатны', 'шагийн'),
        -- ⚠ Дагаваргүй «шат» — «шатар», «шатрын» зэргийг ХӨНДӨХГҮЙ.
        '([Шш])ат(?![а-яөүёА-ЯӨҮЁ])', '\1аг', 'g'),
      E'\u0001', 'шатны мад')
  END;
$$ LANGUAGE sql IMMUTABLE;

-- Хичээлийн гарчиг.
UPDATE lessons l
SET title = pg_temp.fix_check_term(l.title)
FROM units u
WHERE u.id = l.unit_id AND u.course_slug = 'chess';

-- Дасгалын асуулт, тайлбар.
UPDATE exercises e
SET prompt = pg_temp.fix_check_term(e.prompt),
    explanation = pg_temp.fix_check_term(e.explanation)
FROM lessons l JOIN units u ON u.id = l.unit_id
WHERE l.id = e.lesson_id AND u.course_slug = 'chess';

/*
 * Сонголтын шошго (`options` — jsonb массив).
 *
 * ⚠ ДАРААЛАЛ нь чухал: зөв хариу нь `correct_option_id`-аар холбогддог ч
 * сурагчид шошгууд ижил дарааллаар харагдах ёстой. `WITH ORDINALITY` +
 * `ORDER BY` нь массивыг эвдэхгүй.
 */
UPDATE exercises e
SET options = (
  SELECT jsonb_agg(jsonb_set(el, '{label}', to_jsonb(pg_temp.fix_check_term(el->>'label'))) ORDER BY ord)
  FROM jsonb_array_elements(e.options) WITH ORDINALITY AS t(el, ord)
)
FROM lessons l JOIN units u ON u.id = l.unit_id
WHERE l.id = e.lesson_id AND u.course_slug = 'chess' AND e.options IS NOT NULL;
