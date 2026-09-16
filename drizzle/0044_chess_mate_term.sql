-- ШАТРЫН НЭР ТОМЬЁО: «мат» → «мад».
--
-- Агуулгад хоёр бичлэг зэрэг хэрэглэгдэж байсан («мад» 535 удаа, «мат»
-- 11). Нэг хичээлд «мад», дараагийнх нь «мат» гэж бичигдсэн байхад
-- сурагч хоёр ӨӨР ойлголт гэж бодох эрсдэлтэй.
--
-- ⚠ ЗӨВХӨН ДАНГААР бичигдсэн «мат» — «материал», «математик», «матч»
-- зэргийг хөндөхгүйн тулд үгийн ЗААГААР хязгаарлав.

UPDATE lessons l
SET title = regexp_replace(l.title, '([Мм])ат([^а-яөүёА-ЯӨҮЁ]|$)', '\1ад\2', 'g')
FROM units u
WHERE u.id = l.unit_id AND u.course_slug = 'chess';

UPDATE exercises e
SET prompt = regexp_replace(e.prompt, '([Мм])ат([^а-яөүёА-ЯӨҮЁ]|$)', '\1ад\2', 'g'),
    explanation = regexp_replace(e.explanation, '([Мм])ат([^а-яөүёА-ЯӨҮЁ]|$)', '\1ад\2', 'g')
FROM lessons l JOIN units u ON u.id = l.unit_id
WHERE l.id = e.lesson_id AND u.course_slug = 'chess';

UPDATE exercises e
SET options = (
  SELECT jsonb_agg(
           jsonb_set(el, '{label}',
             to_jsonb(regexp_replace(el->>'label', '([Мм])ат([^а-яөүёА-ЯӨҮЁ]|$)', '\1ад\2', 'g')))
           ORDER BY ord)
  FROM jsonb_array_elements(e.options) WITH ORDINALITY AS t(el, ord)
)
FROM lessons l JOIN units u ON u.id = l.unit_id
WHERE l.id = e.lesson_id AND u.course_slug = 'chess' AND e.options IS NOT NULL;
