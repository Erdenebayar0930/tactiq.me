-- ТӨЛБӨРИЙН СУВАГ БА ВАЛЮТ — гадаад картын бэлтгэл.
--
-- ⚠ Гурвуулаа ANHДАГЧ УТГАТАЙ тул хуучин мөрүүд зөв утга авна: тэдгээр нь
-- бүгд QPay-ээр, төгрөгөөр төлөгдсөн.
--
-- ⚠ `amount_mnt` ХЭВЭЭР: тайлан, шимтгэл, урамшуулал бүгд түүн дээр
-- тооцогддог. `charged_amount` нь ЗӨВХӨН хэрэглэгчийн картаас яг хэдэн
-- нэгж хасагдсаныг хэлнэ (USD → цент).

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS provider varchar(16) NOT NULL DEFAULT 'qpay',
  ADD COLUMN IF NOT EXISTS currency varchar(3) NOT NULL DEFAULT 'MNT',
  ADD COLUMN IF NOT EXISTS charged_amount integer NOT NULL DEFAULT 0;

-- ⚠ Хуучин мөрүүдэд `charged_amount` нь 0 хэвээр үлдэхгүй: тэд төгрөгөөр
-- төлөгдсөн тул цэнэглэсэн дүн нь `amount_mnt`-тэй тэнцүү. Ингэснээр
-- «хэдэн нэгж хасагдсан бэ» гэсэн асуулт бүх мөрд нэг замаар хариулагдана.
UPDATE payments SET charged_amount = amount_mnt WHERE charged_amount = 0;

-- Суваг тус бүрийн тайланд.
CREATE INDEX IF NOT EXISTS payments_provider_idx ON payments (provider, status);
