import "server-only";

import {
  parseTournamentAccess,
  isTournamentCategory,
  OTHER_TOURNAMENT_CATEGORY,
  tournamentBaseUrl,
} from "@/lib/tactiq/tournament";

import type { TournamentAccess, TournamentCategory } from "@/lib/tactiq/tournament";

/**
 * ТЭМЦЭЭНИЙ СЕРВЕРТЭЙ ярих клиент (server-to-server).
 *
 * Хөтөч тэмцээний сервер рүү ШУУД хандахгүй — энэ апп дамжуулна:
 *   • нууц түлхүүр (`TOURNAMENT_SHARED_SECRET`) хөтчид хэзээ ч гарахгүй
 *   • uid-г хэрэглэгч биш, МАНАЙ сервер тодорхойлно (хуурамчаар илгээх боломжгүй)
 *   • CORS тохируулах шаардлагагүй
 *
 * Тэмцээний сервер хэрэгжүүлэх гэрээ (бүгд `x-tournament-secret` толгойтой):
 *   GET  /api/tournaments?status=upcoming  → { tournaments: Tournament[] }
 *   GET  /api/tournaments/:id              → { tournament: Tournament } | 404
 *   POST /api/tournaments/:id/registrations  { uid, displayName, source } → 200/201
 *        (ИДЕМПОТЕНТ байх ёстой — ижил uid дахин ирвэл 200)
 *
 *   Tournament = { id, name, category, startsAt (ISO), timeControl,
 *                  seats (null = хязгааргүй), registered, entryFeeMnt,
 *                  status: "upcoming" | "live" | "finished" }
 *
 *   category = "chess" | "checkers"  (тоглоомын төрөл)
 *              (`TOURNAMENT_CATEGORIES`, `lib/tactiq/tournament.ts`)
 */

export type RemoteTournament = {
  id: string;
  name: string;
  category: TournamentCategory;
  startsAt: string;
  timeControl: string;
  /**
   * Үргэлжлэх хугацаа (минут) — ЦАГИЙН ХУВААРЬ дээрх туузны урт.
   *
   * ⚠ Танигдахгүй/байхгүй бол 60: тэмцээнийг ХАЯХГҮЙ. Хугацаа нь
   * зөвхөн харагдацын мэдээлэл — түүнээс болж бүртгэл хаагдах нь
   * хэрэглэгчийн хувьд хамаагүй дор.
   */
  durationMin: number;
  /** "chess" | "checkers" — хуваарь дээрх дүрс. */
  game: string;
  /**
   * ХЭН ОРОЛЦОХ ВЭ: "open" | "members" | "mind".
   *
   * ⚠ Танихгүй утга нь "open": шинэ түвшин нэмэхэд хуучин апп тэмцээнийг
   * НУУХГҮЙ, харин илүү нээлттэй харуулна. Эсрэгээр (хаах) бол админ
   * яагаад хэн ч бүртгэгдэхгүй байгааг олоход хэцүү. Эрхийн ЖИНХЭНЭ
   * шалгалт нь бүртгэлийн route дээр (`/api/tournament/register`).
   */
  access: TournamentAccess;
  seats: number | null;
  registered: number;
  entryFeeMnt: number;
  status: "upcoming" | "live" | "finished";
};

export class TournamentServerError extends Error {}

const TIMEOUT_MS = 5000;
/** Жагсаалтын кэш — Тоглох хуудас бүрийн ачаалалт тэмцээний серверийг цохихгүй. */
const LIST_TTL_MS = 30_000;
/**
 * ⚠ Оролцох төлбөрийн ДЭЭД хязгаар. Төлөх дүн өөр серверээс ирж байгаа тул
 * тэр сервер алдаатай/халдлагад өртсөн үед хэрэглэгчээс утгагүй дүн
 * нэхэхээс хамгаална.
 */
const MAX_ENTRY_FEE_MNT = 1_000_000;

let listCache: { at: number; data: RemoteTournament[] } | null = null;

const isInt = (value: unknown, min: number): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= min;

/** Гадны өгөгдлийг ИТГЭХГҮЙ — хэлбэр буруу бол тэр тэмцээнийг алгасна. */
function parseTournament(raw: unknown): RemoteTournament | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (typeof r.id !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(r.id)) return null;
  if (typeof r.name !== "string" || typeof r.startsAt !== "string") return null;
  if (Number.isNaN(new Date(r.startsAt).getTime())) return null;
  if (!isInt(r.registered, 0) || !isInt(r.entryFeeMnt, 0)) return null;
  if (r.entryFeeMnt > MAX_ENTRY_FEE_MNT) return null;
  if (r.seats !== null && !isInt(r.seats, 1)) return null;
  if (r.status !== "upcoming" && r.status !== "live" && r.status !== "finished") return null;

  return {
    id: r.id,
    name: r.name.slice(0, 120),
    // Танигдаагүй ангилал — тэмцээнийг хаяхгүй, «Бусад»-д харуулна.
    category: isTournamentCategory(r.category) ? r.category : OTHER_TOURNAMENT_CATEGORY,
    startsAt: r.startsAt,
    timeControl: typeof r.timeControl === "string" ? r.timeControl.slice(0, 32) : "",
    durationMin: isInt(r.durationMin, 1) ? Math.min(r.durationMin, 24 * 60) : 60,
    game: r.game === "checkers" || r.game === "draughts" ? "checkers" : "chess",
    access: parseTournamentAccess(r.access),
    seats: r.seats as number | null,
    registered: r.registered,
    entryFeeMnt: r.entryFeeMnt,
    status: r.status,
  };
}

/** 404 бол `null`, бусад алдаа бол `TournamentServerError`. */
async function call(path: string, init: { method?: string; body?: unknown } = {}) {
  const base = tournamentBaseUrl();
  const secret = process.env.TOURNAMENT_SHARED_SECRET?.trim();
  if (!base || !secret) throw new TournamentServerError("Тэмцээний холболт тохируулагдаагүй.");

  const response = await fetch(`${base}/api${path}`, {
    method: init.method ?? "GET",
    headers: { "content-type": "application/json", "x-tournament-secret": secret },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new TournamentServerError(`Тэмцээний сервер: HTTP ${response.status}`);

  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

export async function listUpcomingTournaments(): Promise<RemoteTournament[]> {
  if (listCache && Date.now() - listCache.at < LIST_TTL_MS) return listCache.data;

  const raw = await call("/tournaments?status=upcoming");
  const list = Array.isArray(raw?.tournaments) ? raw.tournaments : [];
  const data = list
    .map(parseTournament)
    .filter((item): item is RemoteTournament => item !== null);

  listCache = { at: Date.now(), data };
  return data;
}

/**
 * НЭГ тэмцээн — КЭШГҮЙ. Бүртгэл/төлбөрийн шийдвэр (үнэ, суудал, төлөв)
 * хуучирсан өгөгдөл дээр гарах ёсгүй.
 */
export async function getTournament(id: string): Promise<RemoteTournament | null> {
  const raw = await call(`/tournaments/${encodeURIComponent(id)}`);
  return raw ? parseTournament(raw.tournament) : null;
}

export async function pushRegistration(input: {
  tournamentId: string;
  uid: string;
  displayName: string;
  source: string;
}): Promise<void> {
  const result = await call(
    `/tournaments/${encodeURIComponent(input.tournamentId)}/registrations`,
    {
      method: "POST",
      body: { uid: input.uid, displayName: input.displayName, source: input.source },
    }
  );
  if (result === null) throw new TournamentServerError("Тэмцээн олдсонгүй.");

  // Бүртгэгдсэн тоо өөрчлөгдсөн — дараагийн жагсаалт шинэ тоо харуулна.
  listCache = null;
}
