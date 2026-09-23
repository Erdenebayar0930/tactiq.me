-- ДАСГАЛЖУУЛАГЧИЙН (БАГШИЙН) АНКЕТ — холбоо барих мэдээлэлтэй.
--
-- ⚠ ЯАГААД ТУСДАА ХҮСНЭГТ ВЭ: `users` дээр багана нэмбэл холбоо барих
-- мэдээлэл (утас, хаяг) БҮХ хэрэглэгчийн мөрөнд байрлана — 99% нь
-- сурагч, тэдний утсыг ийм баганад хадгалах шаардлага ХЭЗЭЭ Ч гарахгүй.
-- Мөн энэ анкет нь НИЙТЭД харагддаг тул нэвтрэлтийн мөр (`users`)-той
-- нэг бүтцэд хольж, санамсаргүй `SELECT *`-аар хувийн өгөгдөл гоождог
-- цоорхой болох эрсдэлтэй.
--
-- ⚠ `visible` нь ӨӨРИЙН СОНГОЛТ, анхдагчаар `false`: багш өөрөө
-- «нийтэд харуул» гэж дарах хүртэл түүний утасны дугаар хэн нэгэнд
-- харагдаж болохгүй. Нийтэд өгөгдөл нээх шийдвэрийг ЭЗЭН нь гаргана.
--
-- ⚠ Хоёр тоглоомын туг (`teaches_chess`, `teaches_draughts`) нь ХОЁУЛАА
-- `false` байж болно: зарим багш зөвхөн Mind хөтөлбөр заадаг.

CREATE TABLE IF NOT EXISTS coach_profiles (
  /* ⚠ ЭЗЭН нь uid — нэг хүнд НЭГ анкет. */
  user_id          varchar(128) PRIMARY KEY,

  /* Нийтэд харагдах нэр — `users.display_name`-аас ӨӨР байж болно
     (жишээ нь «Б. Батаа, МУИС-ийн багш»). Хоосон бол профайлын нэр. */
  title            varchar(80),
  /* Танилцуулга — «10 жил хүүхдэд шатар заасан…» */
  bio              text,

  /* Холбоо барих — БҮГД NULLABLE: багш зөвхөн өөрийн хүссэнээ бичнэ. */
  phone            varchar(32),
  email            varchar(190),
  /* Facebook/Instagram/веб — нэг л холбоос, эхнийхийг л харуулна. */
  link             varchar(300),
  /* Хаяг, дүүрэг — «Сүхбаатар дүүрэг, 1-р хороо». */
  address          varchar(200),

  teaches_chess    boolean NOT NULL DEFAULT false,
  teaches_draughts boolean NOT NULL DEFAULT false,
  /* Хичээлийн үнэ (₮/цаг). NULL = «тохиролцоно». */
  price_mnt        integer,

  visible          boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

/* Нийтэд харагдах жагсаалт — зөвхөн `visible` мөрүүд. */
CREATE INDEX IF NOT EXISTS coach_profiles_visible_idx
  ON coach_profiles (visible, updated_at DESC);
