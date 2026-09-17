/**
 * ХОЁР ХҮНИЙ ОНЛАЙН ТОГЛООМЫН ТӨРӨЛ — шатар ба даам.
 *
 * ⚠ Урилга, дараалал, өрөө, WebRTC сигналын систем нь ХОЁУЛАНД НЬ НЭГ
 * (`chess_rooms`, `chess_invites`, `chess_queue` хүснэгтүүд + `game`
 * багана). Хуулбарлавал зургаан route хоёр дахин болж, нэг талд гарсан
 * засвар нөгөөд хоцордог.
 *
 * ⚠ ХҮСНЭГТИЙН НЭР нь `chess_*` ХЭВЭЭР: нэр солих нь бүх индекс,
 * миграцийг хөндөх бөгөөд ажлын үнэ цэнэ нь зөвхөн гоо сайхан.
 *
 * ⚠ `server-only` БИШ: өрөөний хуудас, лобби (клиент) ба route (сервер)
 * хоёулаа эндээс уншина.
 */

export const PLAY_GAMES = ["chess", "draughts"] as const;

export type PlayGame = (typeof PLAY_GAMES)[number];

export const DEFAULT_PLAY_GAME: PlayGame = "chess";

/**
 * Хүсэлтээс ирсэн утгыг шалгана.
 *
 * ⚠ Танихгүй утгыг ХАЯХГҮЙ, шатар гэж үзнэ: сангийн анхдагч ч `'chess'`
 * бөгөөд хуучин клиент (кэшлэгдсэн JS) `game` огт илгээхгүй байж мэднэ.
 * 400 буцаавал тэр хэрэглэгч огт тоглож чадахгүй болно.
 */
export function parsePlayGame(value: unknown): PlayGame {
  return PLAY_GAMES.includes(value as PlayGame) ? (value as PlayGame) : DEFAULT_PLAY_GAME;
}

/**
 * Өрөөний хуудасны хаяг.
 *
 * ⚠ ХОЁР ӨӨР ХУУДАС: шатрын хөлөг ба даамын хөлөг нь өөр компонент, өөр
 * дүрэмтэй (`chess.js` vs `lib/draughts`). Нэг хуудсанд хоёуланг нь
 * нөхцөлөөр зурвал хоёр тоглоомын логик нэг файлд хутгалдана.
 */
export function roomPath(game: PlayGame, roomId: string): string {
  return game === "draughts" ? `/play/draughts/${roomId}` : `/play/${roomId}`;
}

/** Хэрэглэгчид харуулах нэр. */
export function playGameLabel(game: PlayGame): string {
  return game === "draughts" ? "Даам" : "Шатар";
}
