/**
 * ТЭМЦЭЭНИЙ ТӨРӨЛ — ХОЁР ӨӨР ТЭНХЛЭГ.
 *
 * ⚠ «Arena, Bullet, Blitz, Rapid, Classical, Swiss, Team, Knockout»
 * гэдэг нь НЭГ жагсаалт МЭТ харагддаг ч үнэндээ ХОЁР өөр зүйл:
 *
 *   ХЭЛБЭР (format) — хос хэрхэн сугалагдаж, ялагч хэрхэн тодорхойлогдох:
 *     Arena, Swiss, Knockout, Team.
 *   ХУРД (speed) — цагийн хяналт хэр хурдан: Bullet, Blitz, Rapid,
 *     Classical.
 *
 * Тэднийг нэг жагсаалт болговол «Blitz Swiss» гэсэн бодит тэмцээнийг
 * илэрхийлэх аргагүй болно — сонголт нь хоёулангаас ХАМААРНА.
 *
 * ⚠ ХУРД нь ХАДГАЛАГДАХГҮЙ, ЦАГИЙН ХЯНАЛТААС тооцогдоно
 * (`speedFromTimeControl`). Админ «Bullet» гэж сонгоод «30+0» гэж
 * бичвэл хоёр нь зөрнө — тэр зөрүү нь дараа нь «яагаад bullet тэмцээн
 * хагас цаг үргэлжлэв» гэсэн асуулт болно. Цагийн хяналт нь ЦОРЫН
 * ГАНЦ үнэн.
 *
 * ⚠ `server-only` БИШ: админы форм, сурагчийн жагсаалт, тэмцээний
 * серверийн шалгалт гурвуулаа ижил дүрмээр ажиллах ёстой.
 */

// ---------------------------------------------------------------------------
// ХЭЛБЭР
// ---------------------------------------------------------------------------

export const TOURNAMENT_FORMATS = ["arena", "swiss", "knockout", "team"] as const;

export type TournamentFormat = (typeof TOURNAMENT_FORMATS)[number];

export type FormatInfo = {
  emoji: string;
  label: string;
  /** Оролцогчид ЮУГ хүлээхээ мэдэх ёстой — нэг мөр тайлбар. */
  hint: string;
};

export const FORMAT_INFO: Record<TournamentFormat, FormatInfo> = {
  arena: {
    emoji: "🏟️",
    label: "Арена",
    hint: "Тогтоосон хугацаанд аль болох олон тоглолт. Ялалт 2, тэнцээ 1 оноо; цуваа давхарлана.",
  },
  swiss: {
    emoji: "🏆",
    label: "Швейцар",
    hint: "Тогтоосон тоглолтын тоо. Хүн бүр ижил тоогоор тоглож, ижил онооныхонтой хосолно.",
  },
  knockout: {
    emoji: "🎯",
    label: "Хасагдах",
    hint: "Хожигдвол гарна. Шат дараалан багасаж, хоёр хүн финалд хүрнэ.",
  },
  team: {
    emoji: "👥",
    label: "Багийн",
    hint: "Багийн нийт оноогоор өрсөлдөнө. Хувь хүний ялалт багийнхаа санд нэмэгдэнэ.",
  },
};

export function parseTournamentFormat(value: unknown): TournamentFormat {
  /*
   * ⚠ Танихгүй утга → `arena`: тэмцээнийг НУУХГҮЙ. Арена нь хамгийн
   * түгээмэл бөгөөд хамгийн зөөлөн буулт — хэлбэр нь буруу харагдах нь
   * тэмцээн огт харагдахаас дээр.
   */
  return TOURNAMENT_FORMATS.includes(value as TournamentFormat)
    ? (value as TournamentFormat)
    : "arena";
}

// ---------------------------------------------------------------------------
// ХУРД
// ---------------------------------------------------------------------------

export const TOURNAMENT_SPEEDS = ["bullet", "blitz", "rapid", "classical"] as const;

export type TournamentSpeed = (typeof TOURNAMENT_SPEEDS)[number];

export const SPEED_INFO: Record<TournamentSpeed, { emoji: string; label: string }> = {
  bullet: { emoji: "⚡", label: "Bullet" },
  blitz: { emoji: "🔥", label: "Blitz" },
  rapid: { emoji: "⏱️", label: "Rapid" },
  classical: { emoji: "♟️", label: "Classical" },
};

/**
 * ЦАГИЙН ХЯНАЛТ → ХУРД.
 *
 * ⚠ Lichess-ийн дүрмийг баримталлаа: «тооцоолсон нийт хугацаа» =
 * үндсэн + нэмэлт × 40 (дундаж тоглолтын нүүдлийн тоо). Зөвхөн үндсэн
 * хугацаагаар хуваавал «0+3» (нэмэлт өндөр, үндсэн 0) нь bullet гэж
 * тооцогдох ч үнэндээ blitz-ийн хугацаа шаарддаг.
 *
 *   < 3 мин   → Bullet
 *   < 10 мин  → Blitz
 *   < 30 мин  → Rapid
 *   ≥ 30 мин  → Classical
 *
 * ⚠ ТАНИГДАХГҮЙ мөр («асинхрон», хоосон) → `blitz`: хамгийн түгээмэл
 * бөгөөд «мэдэхгүй» гэж хоосон үлдээвэл жагсаалтад шошгогүй мөр гарч
 * эвдрэл шиг харагдана.
 */
export function speedFromTimeControl(timeControl: string): TournamentSpeed {
  const match = /^\s*(\d+)\s*(?:\+\s*(\d+))?\s*$/.exec(timeControl);
  if (!match) return "blitz";

  const base = Number(match[1]);
  const increment = Number(match[2] ?? 0);
  const estimate = base + (increment * 40) / 60;

  if (estimate < 3) return "bullet";
  if (estimate < 10) return "blitz";
  if (estimate < 30) return "rapid";
  return "classical";
}

/** Шошгоны бичвэр: «🔥 Blitz · 🏟️ Арена». */
export function tournamentTypeLabel(format: TournamentFormat, timeControl: string): string {
  const speed = SPEED_INFO[speedFromTimeControl(timeControl)];
  const info = FORMAT_INFO[format];
  return `${speed.emoji} ${speed.label} · ${info.emoji} ${info.label}`;
}
