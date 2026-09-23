import "server-only";

import {
  parseTournamentAccess,
  isTournamentCategory,
  OTHER_TOURNAMENT_CATEGORY,
  tournamentBaseUrl,
} from "@/lib/tactiq/tournament";

import { parseTournamentFormat } from "@/lib/tactiq/tournamentFormat";

import type { TournamentFormat } from "@/lib/tactiq/tournamentFormat";
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
   * ХЭЛБЭР: "arena" | "swiss" | "knockout" | "team".
   *
   * ⚠ ХУРД (bullet/blitz/rapid/classical) нь ЭНД БАЙХГҮЙ — цагийн
   * хяналтаас тооцогдоно (`lib/tactiq/tournamentFormat.ts`). Хоёуланг
   * дамжуулбал тэд зөрөх боломжтой болно.
   */
  format: TournamentFormat;
  /**
   * ХЭН ОРОЛЦОХ ВЭ: "open" | "members" | "mind".
   *
   * ⚠ Танихгүй утга нь "open": шинэ түвшин нэмэхэд хуучин апп тэмцээнийг
   * НУУХГҮЙ, харин илүү нээлттэй харуулна. Эсрэгээр (хаах) бол админ
   * яагаад хэн ч бүртгэгдэхгүй байгааг олоход хэцүү. Эрхийн ЖИНХЭНЭ
   * шалгалт нь бүртгэлийн route дээр (`/api/tournament/register`).
   */
  access: TournamentAccess;
  /**
   * ДАВТАМЖТАЙ (сериас автоматаар үүссэн) эсэх.
   *
   * ⚠ ХАРАГДАХ ДҮРЭМ нь ЭНДЭЭС хамаарна: давтамжтай тэмцээн нь 14
   * хоногийг урьдчилж үүсгэдэг тул бүгдийг харуулбал жагсаалт ижил
   * нэртэй 14 мөрөөр дүүрч, зорилтот тэмцээн тэдний дунд живнэ.
   * Тиймээс давтамжтайг ЗӨВХӨН тухайн өдрөөр шүүнэ
   * (`/api/tournament/list`).
   */
  recurring: boolean;
  /**
   * ЧАНСАА ТОГТООХ эсэх.
   *
   * ⚠ ЧАНСАА ЗӨВХӨН ЭНЭ ТУГТАЙ тэмцээнээр өрнөнө: ердийн онлайн
   * тоглолт, ботын дадлага, хөгжөөнт тэмцээн нь чансааг хөндөхгүй.
   * Тиймээс жагсаалт дээр ИЛ шошго харуулах ёстой — оролцогч чансаагаа
   * хөдөлгөх эсэхээ бүртгэхээсээ ӨМНӨ мэдэх ёстой.
   *
   * ⚠ `=== true` гэж шалгана: туг байхгүй бол ЧАНСААГҮЙ. Анхдагч нь
   * ямагт хамгийн хөнөөлгүй тал.
   */
  rated: boolean;
  /**
   * ИВЭЭН ТЭТГЭГЧ — хоосон бол ивээн тэтгэгчгүй тэмцээн.
   *
   * ⚠ ЛОГОНЫ ХАЯГ нь ЭНД ДАХИН шалгагдана: тэмцээний сервер нь
   * Firebase Storage / аппын зам гэж хязгаарладаг ч энэ нь ГАДНЫ
   * сервер. Хэн нэгэн түүнийг гүйцэтгэвэл (эсвэл тохиргоо алдаатай
   * бол) дурын домэйны зураг хөтөч рүү очно — CSP хааж, лого хоосон
   * хайрцаг болно. Тиймээс танихгүй хаягийг ЭНД хоосон болгоно.
   */
  sponsorName: string;
  sponsorLogo: string;
  sponsorUrl: string;
  /** Шагналын чөлөөт тайлбар — «Шагналын сан: 500,000₮». */
  prize: string;
  /**
   * БАЙР ТУС БҮРИЙН ШАГНАЛ — «Дэлгэрэнгүй» дарахад гарна.
   *
   * ⚠ ЗУРГИЙН ХАЯГ нь ЭНД ДАХИН шалгагдана (`safeLogo`): тэмцээний
   * сервер хязгаарладаг ч тэр нь ГАДНЫ сервер. Танихгүй домэйны зургийг
   * CSP чимээгүй хааж, хоосон хайрцаг үлдэнэ.
   */
  prizes: TournamentPrize[] | null;
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

/** Гадны текст — төрөл, урт хоёуланг барина. */
const text = (value: unknown, max: number): string =>
  typeof value === "string" ? value.slice(0, max) : "";

/**
 * ⚠ ЛОГОНЫ ХАЯГ — CSP-д зөвшөөрөгдсөн эх сурвалж эсэхийг ДАХИН шалгана.
 *
 * Тэмцээний сервер нь ижил хязгаарлалттай ч тэр нь ГАДНЫ сервер: түүнийг
 * гүйцэтгэсэн, эсвэл тохиргоог сольсон тохиолдолд дурын домэйны зураг
 * хөтөч рүү хүрнэ. CSP түүнийг ЧИМЭЭГҮЙ хааж, хэрэглэгч хоосон хайрцаг
 * харна — тиймээс танихгүйг ХООСОН болгоод логог огт зурахгүй.
 */
function safeLogo(url: string): string {
  if (url.startsWith("/")) return url;
  if (url.startsWith("https://firebasestorage.googleapis.com/")) return url;
  if (url.startsWith("https://storage.googleapis.com/")) return url;
  return "";
}

/**
 * ⚠ ИВЭЭН ТЭТГЭГЧИЙН ХОЛБООС — зөвхөн `https:`.
 *
 * `javascript:` схем нь хэрэглэгч дарахад код гүйцэтгэдэг (XSS). Гадны
 * серверээс ирсэн мөрийг шууд `href`-д тавивал тэр эрсдэл бодит болно.
 */
function safeLink(url: string): string {
  return url.startsWith("https://") ? url : "";
}

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
    format: parseTournamentFormat(r.format),
    recurring: r.recurring === true,
    rated: r.rated === true,
    sponsorName: text(r.sponsorName, 80),
    sponsorLogo: safeLogo(text(r.sponsorLogo, 400)),
    sponsorUrl: safeLink(text(r.sponsorUrl, 400)),
    prize: text(r.prize, 300),
    prizes: parsePrizes(r.prizes),
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

// ---------------------------------------------------------------------------
// АДМИН — тов, давтамжтай сери
// ---------------------------------------------------------------------------

/**
 * ⚠ АДМИНЫ БҮХ ХҮСЭЛТ ЭНД ДАМЖИНА. Хөтөч тэмцээний сервер рүү ХЭЗЭЭ Ч
 * шууд хандахгүй: нууц түлхүүр хөтчид гарвал хэн ч тэмцээн үүсгэж,
 * устгаж чадна. Админ эрхийг `/api/admin/tournament/*` route шалгана.
 *
 * ⚠ АЛДААНЫ БИЧВЭРИЙГ ДАМЖУУЛНА: тэмцээний сервер «Нэр: 120 тэмдэгтээс
 * урт байж болохгүй» гэж хэлдэг бөгөөд админ түүнийг харах ёстой.
 * «HTTP 400» гэж хувиргавал юу буруу болсныг таамаглах болно.
 */
async function adminCall(
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<Record<string, unknown>> {
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

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    const message = typeof data.error === "string" ? data.error : `HTTP ${response.status}`;
    throw new TournamentServerError(message);
  }

  return data;
}

export type RemoteSeries = {
  id: string;
  name: string;
  category: string;
  game: string;
  access: string;
  durationMin: number;
  timeControl: string;
  seats: number | null;
  entryFeeMnt: number;
  startTime: string;
  weekdays: number;
  active: boolean;
};

export async function listSeries(): Promise<RemoteSeries[]> {
  const raw = await adminCall("/admin/series");
  return Array.isArray(raw.series) ? (raw.series as RemoteSeries[]) : [];
}

export async function saveSeries(body: unknown): Promise<void> {
  await adminCall("/admin/series", { method: "POST", body });
}

export async function setSeriesActive(id: string, active: boolean): Promise<void> {
  await adminCall(`/admin/series/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: { active },
  });
}

export async function deleteSeries(id: string): Promise<void> {
  await adminCall(`/admin/series/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function saveTournament(body: unknown): Promise<void> {
  await adminCall("/admin/tournaments", { method: "POST", body });
}

export async function deleteTournament(id: string): Promise<void> {
  await adminCall(`/admin/tournaments/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/**
 * ⚠ ЖАГСААЛТЫН КЭШИЙГ ЦЭВЭРЛЭНЭ: админ тов оруулаад жагсаалтаа ТЭР
 * ДАРУЙ харах ёстой. 30 секунд хүлээвэл «хадгалагдсангүй» гэж бодож
 * дахин дарна.
 */
export function clearTournamentListCache(): void {
  listCache = null;
}

/** Админд БҮХ төлөвийн тэмцээн — ноорхой, цуцлагдсаныг ч харуулна. */
export async function listAllTournaments(): Promise<RemoteTournament[]> {
  const raw = await adminCall("/tournaments?status=upcoming");
  const list = Array.isArray(raw.tournaments) ? raw.tournaments : [];
  return list.map(parseTournament).filter((item): item is RemoteTournament => item !== null);
}

export type TournamentPrize = {
  /** 1, 2, 3 … */
  place: number;
  title: string;
  /** Хоосон мөр = зураггүй. */
  image: string;
  note: string;
};

/**
 * Шагналын жагсаалтыг ЦЭВЭРЛЭЖ уншина.
 *
 * ⚠ ГАДНЫ СЕРВЕРЭЭС ирсэн jsonb — бүтэц нь ямар ч байж болно. Шалгахгүй
 * бол `prizes.map` нь `undefined.map` болж хуудсыг унагана (тэмцээний
 * хуудсанд ЯГ ТЭР эвдрэл нэгэнт тохиолдсон — ивээн тэтгэгчийн талбар).
 *
 * ⚠ БАЙРААР ЭРЭМБЭЛНЭ: сервер эрэмбэлсэн ч энэ нь бидний хариуцлага.
 */
function parsePrizes(value: unknown): TournamentPrize[] | null {
  if (!Array.isArray(value)) return null;

  const items = value
    .filter((raw): raw is Record<string, unknown> => typeof raw === "object" && raw !== null)
    .map((raw) => ({
      place: isInt(raw.place, 1) ? Math.min(raw.place as number, 99) : 0,
      title: text(raw.title, 80),
      image: safeLogo(text(raw.image, 400)),
      note: text(raw.note, 120),
    }))
    /* ⚠ Нэргүй шагнал ХАЯГДАНА: зөвхөн зурагтай мөр нь ойлгомжгүй. */
    .filter((item) => item.place > 0 && item.title.length > 0)
    .sort((a, b) => a.place - b.place);

  return items.length > 0 ? items : null;
}
