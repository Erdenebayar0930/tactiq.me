-- СУРГУУЛИЙН БИЧВЭРИЙН ХҮСНЭГТ — дутуу байсныг нэмнэ.
--
-- ⚠ Схемд (`lib/db/schema.ts`) аль хэдийн тодорхойлогдсон ч САНД
-- ҮҮСГЭГДЭЭГҮЙ байв: `/api/schools` дуудагдах бүрд Postgres
-- «relation "school_texts" does not exist» (42P01) буцааж, лог дүүрэн
-- алдаатай байлаа. Route нь алдааг залгидаг тул хэрэглэгч эвдрэл
-- харахгүй — харин админ бичвэр засах үед л мэдэгдэнэ.
--
-- ⚠ БҮХ багана NULLABLE (`slug`-аас бусад): `null` нь «кодын анхдагчийг
-- хэрэглэ» гэсэн утгатай (`lib/tactiq/schools.ts`). Хоосон мөр нь
-- «бичвэрийг устгасан» гэсэн үг БИШ.

CREATE TABLE IF NOT EXISTS school_texts (
  slug varchar(16) PRIMARY KEY,
  title varchar(40),
  subtitle varchar(80),
  tagline varchar(200),
  description text,
  /* `TopicGroup[]` — `null` бол кодын бүлгүүд хэвээр. */
  groups jsonb,
  updated_at timestamp NOT NULL DEFAULT now()
);
