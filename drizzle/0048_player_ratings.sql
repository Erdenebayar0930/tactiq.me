-- ЧАНСААНЫ ЦӨМ — тоглоом тус бүрийн rating ба түүх.
--
-- Зохиомж: `docs/rating-system.md` (§12).
--
-- ⚠ ЯАГААД ШИНЭ ХҮСНЭГТ: `users.rating` нь НЭГ багана бөгөөд шатар,
-- даамын тоглолтын ХОЛЬЦООС бүрддэг. Шатарт хүчтэй хүн даамд шинэхэн
-- байж мэднэ — тэр үед тоо нь аль алинд зөв биш.
--
-- ⚠ `users.rating` -ыг ЭНЭ МИГРАЦААР ХАСАХГҮЙ: түүнийг уншдаг 20 гаруй
-- газрыг нэг өдөрт засах нь эвдрэл дагуулна. Кодыг шилжүүлсний дараа
-- тусдаа миграцаар хасна.

CREATE TABLE IF NOT EXISTS player_ratings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       varchar(128) NOT NULL,
  -- "chess" | "checkers"
  game_type     varchar(16)  NOT NULL,
  /*
   * ОДОО зөвхөн 'all'. Хожим 'classical' | 'rapid' | 'blitz' | 'bullet'.
   *
   * ⚠ ОДОО ХУРДААР САЛГАХГҮЙ: 2 тоглоом × 4 хурд = 8 rating болговол
   * сурагч бүр 8 хэсэгт хуваагдаж, тус бүр нь ҮҮРД provisional байна
   * (`docs/rating-system.md` §0.4). Салгах нөхцөл: тухайн хосд 3000
   * тоглолт ба 200 тоглогч 10+ тоглолттой болох.
   */
  rating_type   varchar(16)  NOT NULL DEFAULT 'all',

  rating        integer NOT NULL DEFAULT 1500,
  peak_rating   integer NOT NULL DEFAULT 1500,
  games_played  integer NOT NULL DEFAULT 0,
  wins          integer NOT NULL DEFAULT 0,
  draws         integer NOT NULL DEFAULT 0,
  losses        integer NOT NULL DEFAULT 0,
  /*
   * Хууль бус байдал шалгах хугацаанд бичилтийг зогсооно
   * (`docs/rating-system.md` §13).
   */
  frozen        boolean NOT NULL DEFAULT false,
  last_game_at  timestamptz,
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT player_ratings_uq UNIQUE (user_id, game_type, rating_type)
);

-- ⚠ Жагсаалт нь PROVISIONAL-ийг ХАРДАГГҮЙ тул индекс ч тэднийг агуулахгүй.
CREATE INDEX IF NOT EXISTS player_ratings_board_idx
  ON player_ratings (game_type, rating_type, rating DESC)
  WHERE games_played >= 10;

CREATE INDEX IF NOT EXISTS player_ratings_user_idx ON player_ratings (user_id);

CREATE TABLE IF NOT EXISTS rating_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         varchar(128) NOT NULL,
  game_type       varchar(16)  NOT NULL,
  rating_type     varchar(16)  NOT NULL DEFAULT 'all',

  -- Өрөөний id, эсвэл тэмцээний тоглолтын id
  game_id         varchar(64),
  tournament_id   varchar(64),

  opponent_uid    varchar(128),
  opponent_rating integer,
  -- 1 | 0.5 | 0
  result          numeric(2,1),
  /*
   * ⚠ ЭДГЭЭРИЙГ ХАДГАЛНА: «яагаад би 12 оноо авав?» гэсэн асуултад
   * тооцоог ДАХИН хийхгүйгээр хариулах ёстой. K-ийн дүрэм хожим
   * өөрчлөгдвөл хуучин бичилт нь тухайн үеийн дүрмээр тайлбарлагдана.
   */
  expected_score  numeric(6,5) NOT NULL,
  k_factor        integer NOT NULL,
  weight          numeric(3,2) NOT NULL DEFAULT 1.0,

  old_rating      integer NOT NULL,
  rating_change   integer NOT NULL,
  new_rating      integer NOT NULL,

  -- "game" | "tournament" | "decay" | "admin"
  reason          varchar(16) NOT NULL DEFAULT 'game',
  created_at      timestamptz NOT NULL DEFAULT now()
);

/*
 * ⚠ ДАВХАР БИЧИЛТИЙГ ТАСЛАНА: тоглолт хоёр удаа мэдэгдэж болно (хоёр тал
 * зэрэг илгээх, сүлжээ тасарч дахин оролдох). Индекс байхгүй бол rating
 * ХОЁР ДАХИН хөдөлнө.
 */
CREATE UNIQUE INDEX IF NOT EXISTS rating_history_game_user_uq
  ON rating_history (game_id, user_id)
  WHERE game_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS rating_history_user_created_idx
  ON rating_history (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS rating_history_tournament_idx
  ON rating_history (tournament_id);
