-- АППУУДЫН ХӨӨРГҮҮР — «Апп» цэсэнд харагдах жагсаалт.
--
-- «Тэмцээн» цэс нь энэ платформын ЦОРЫН ГАНЦ гадаад апп руу хөтөлдөг
-- байв. Эзний шийдвэрээр тэр нь «Апп» болж, олон апп руу орох
-- хөөргүүр болов.
--
-- ⚠ АДМИН БҮРТГЭНЭ: шинэ апп нэмэхэд код засаж, дахин deploy хийх
-- шаардлагагүй (`/admin/apps`).
--
-- ⚠ `kind` НЬ НЭВТРЭЛТИЙГ ШИЙДНЭ:
--   • 'link'       — энгийн холбоос, апп өөрөө нэвтрүүлнэ;
--   • 'tournament' — тасалбартай дамжуулалт (`/api/tournament/session`).
-- Хоёр дахь нь ХОЁР ТАЛЫН НУУЦ ТҮЛХҮҮР ба тухайн апп дээр `exchange`
-- эцсийн цэг байхыг шаардана — тиймээс дурын аппд сонгож болохгүй.
--
-- ⚠ `visible` анхдагчаар false: дутуу бөглөсөн апп хүүхдийн нүдэнд
-- тусах ёсгүй.

CREATE TABLE IF NOT EXISTS apps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        varchar(80)  NOT NULL,
  description varchar(300) NOT NULL DEFAULT '',
  logo_url    varchar(500) NOT NULL DEFAULT '',
  url         varchar(500) NOT NULL DEFAULT '',
  kind        varchar(16)  NOT NULL DEFAULT 'link',
  color       varchar(16)  NOT NULL DEFAULT 'violet',
  visible     boolean      NOT NULL DEFAULT false,
  sort_order  integer      NOT NULL DEFAULT 0,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS apps_visible_idx ON apps (visible, sort_order);
