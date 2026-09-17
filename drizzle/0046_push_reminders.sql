-- ТЭМЦЭЭН ЭХЛЭХИЙН 10 МИНУТЫН ӨМНӨХ МЭДЭГДЭЛ.
--
-- ⚠ ХОЁР зүйл нэмнэ:
--   1. `push_tokens` — хэрэглэгчийн төхөөрөмжийн FCM токен. Нэг хүн олон
--      төхөөрөмжтэй (утас, ком) байж болно тул `uid` нь түлхүүр БИШ.
--   2. `tournament_entries.reminder_sent_at` — мэдэгдэл илгээсэн мөч.
--
-- ⚠ ЯАГААД `reminder_sent_at` бүртгэл ДЭЭР байх вэ: илгээгч нь минут
-- тутам ажиллана. Тэмдэглэхгүй бол 10 минутын цонхонд сурагч 10 удаа
-- мэдэгдэл авна — тэр нь мэдэгдлийг бүрмөсөн унтраах хамгийн хурдан
-- шалтгаан.

CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uid varchar(128) NOT NULL,
  /*
   * FCM токен нь урт (150+ тэмдэгт) бөгөөд Google урт баталгаа гаргаагүй
   * тул `text`. Давхардахгүй: ижил токен хоёр хэрэглэгчид оногдвол
   * хуучин хэрэглэгч нөгөөгийн мэдэгдлийг авна.
   */
  token text NOT NULL UNIQUE,
  /** Аль төхөөрөмж вэ — хэрэглэгчид «ком дээрх мэдэгдлийг унтраа» гэж хэлэхэд. */
  label varchar(64) NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_tokens_uid_idx ON push_tokens (uid);

ALTER TABLE tournament_entries ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;
