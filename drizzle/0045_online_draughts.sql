-- ОНЛАЙН ТОГЛОЛТЫГ ДААМД Ч НЭЭНЭ.
--
-- Хоёр тоглогчийн систем (урилга, дараалал, өрөө, WebRTC сигнал) нь
-- ЗӨВХӨН шатарт зориулж бичигдсэн байв. Даамд ХУУЛБАРЛАХ нь дөрвөн
-- хүснэгт, зургаан route хоёр дахин болгоно — оронд нь `game` багана
-- нэмж, нэг системийг ХОЁР тоглоомд үйлчлүүлнэ.
--
-- ⚠ ХҮСНЭГТИЙН НЭР нь `chess_*` ХЭВЭЭР: нэр солих нь бүх индекс, код,
-- миграцийг хөндөх бөгөөд ажлын үнэ цэнэ нь зөвхөн гоо сайхан. Кодын
-- тайлбарт «шатар ба даам» гэж бичсэн.
--
-- ⚠ Анхдагч нь 'chess': аль хэдийн байгаа мөрүүд бүгд шатрын тоглолт.

ALTER TABLE chess_rooms ADD COLUMN IF NOT EXISTS game varchar(16) NOT NULL DEFAULT 'chess';
ALTER TABLE chess_invites ADD COLUMN IF NOT EXISTS game varchar(16) NOT NULL DEFAULT 'chess';
ALTER TABLE chess_queue ADD COLUMN IF NOT EXISTS game varchar(16) NOT NULL DEFAULT 'chess';

-- Хос сугалалт нь ИЖИЛ тоглоомын дараалалаас л хос барина.
--
-- ⚠ `uid` нь PRIMARY KEY хэвээр — нэг тоглогч НЭГ л тоглоом хайна.
-- (uid, game) болговол хүн шатар, даам хоёрыг зэрэг хайж, хоёр өрөөнд
-- зэрэг оногдоно.
CREATE INDEX IF NOT EXISTS chess_queue_game_joined_idx ON chess_queue (game, joined_at);
