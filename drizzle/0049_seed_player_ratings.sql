-- `users.rating` → `player_ratings` (§0.1, §12.3).
--
-- ⚠ +300: одоогийн анхдагч 1200 байсныг 1500 болгож шилжүүлнэ. Тэглэхгүй
-- шалтгаан: тоглосон хүмүүсийн харьцангуй зөрүү нь бодит мэдээлэл;
-- тэглэвэл тэднийг дахин 10 тоглолт placement-д оруулна.
--
-- ⚠ ДААМЫН rating нь 1500-аас ШИНЭЭР: `users.rating` нь хоёр тоглоомын
-- ХОЛЬЦ тул даамд шилжүүлэх нь худал тоо үүсгэнэ. Ялалт/хожигдлын тоог
-- харин хадгална (тэр нь түүх).

INSERT INTO player_ratings
  (user_id, game_type, rating_type, rating, peak_rating, games_played, wins, draws, losses)
SELECT
  uid, 'chess', 'all',
  CASE WHEN rating_games > 0 THEN rating + 300 ELSE 1500 END,
  CASE WHEN rating_games > 0 THEN rating + 300 ELSE 1500 END,
  rating_games, chess_wins, chess_draws, chess_losses
FROM users
ON CONFLICT (user_id, game_type, rating_type) DO NOTHING;

INSERT INTO player_ratings
  (user_id, game_type, rating_type, rating, peak_rating, games_played, wins, draws, losses)
SELECT uid, 'checkers', 'all', 1500, 1500, 0, draughts_wins, draughts_draws, draughts_losses
FROM users
ON CONFLICT (user_id, game_type, rating_type) DO NOTHING;
