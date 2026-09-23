-- СУРГАЛТЫН ТӨВҮҮДИЙН ЛАВЛАХ.
--
-- «Клубууд» таб нь зөвхөн ТАНИЛЦУУЛГА байсан (хүснэгт, API огт
-- байхгүй). Эзний шийдвэрээр тэр нь «Сургалтын төв» болж, зураг,
-- байршил, мэдээлэлтэй БОДИТ лавлах болов.
--
-- ⚠ АДМИН УДИРДАНА. Багш өөрөө бүртгүүлдэг байвал хүүхдийг бодит хаяг
-- руу чиглүүлдэг жагсаалт хяналтгүй зар болно. Үүсгэх, засах нь
-- `requireAdmin`-ий ард (`/api/admin/training-centers`).
--
-- ⚠ `visible` АНХДАГЧААР false: админ мэдээллийг бүрэн бөглөж,
-- шалгасны дараа л нийтэд гаргана. Дутуу бөглөсөн төв жагсаалтад
-- гарах нь харсан хүнд «ажиллагаагүй сайт» гэсэн сэтгэгдэл үлдээнэ.
--
-- ⚠ Текст талбарууд NULL биш, `''` анхдагчтай: жагсаалт зурахад
-- `null` бүрийг шалгах шаардлагагүй болж, UI код хялбар болно.

CREATE TABLE IF NOT EXISTS training_centers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            varchar(120)  NOT NULL,
  description     text          NOT NULL DEFAULT '',
  photo_url       varchar(500)  NOT NULL DEFAULT '',
  city            varchar(60)   NOT NULL DEFAULT '',
  address         varchar(200)  NOT NULL DEFAULT '',
  map_url         varchar(500)  NOT NULL DEFAULT '',
  phone           varchar(32)   NOT NULL DEFAULT '',
  email           varchar(190)  NOT NULL DEFAULT '',
  link            varchar(300)  NOT NULL DEFAULT '',
  teaches_chess   boolean       NOT NULL DEFAULT false,
  teaches_draughts boolean      NOT NULL DEFAULT false,
  visible         boolean       NOT NULL DEFAULT false,
  sort_order      integer       NOT NULL DEFAULT 0,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

-- Нийтэд харагдах жагсаалтын асуулга: `visible` шүүж, `sort_order`-оор эрэмбэлнэ.
CREATE INDEX IF NOT EXISTS training_centers_visible_idx
  ON training_centers (visible, sort_order);
