-- СУРГАЛТЫН ТӨВИЙН ЛОГО.
--
-- ⚠ `photo_url`-ААС ӨӨР ЗОРИЛГОТОЙ: зураг нь байр, анги танхимыг
-- үзүүлдэг ӨРГӨН зураг; лого нь байгууллагын ЖИЖИГ таних тэмдэг
-- бөгөөд нэрийн хажууд гарна. Нэг талбар болговол хоёулан нь муу
-- харагдана — лого сунаж, эсвэл гэрэл зураг таних аргагүй болно.
--
-- ⚠ Файл нь Firebase Storage-ийн `training_centers/<id>/` замд очно;
-- бичих эрх ЗӨВХӨН идэвхтэй админд (`storage.rules`). Тэр дүрмийг
-- САНД биш, Firebase рүү тусад нь deploy хийнэ:
--     firebase deploy --only storage

ALTER TABLE training_centers
  ADD COLUMN IF NOT EXISTS logo_url varchar(500) NOT NULL DEFAULT '';
