/**
 * ТЭМЦЭЭНИЙ СИСТЕМ — ТУСДАА СЕРВЕР.
 *
 * Тэмцээн нь ачаалал өндөртэй (олон зуун хүн НЭГ агшинд хос сугалж,
 * цаг тоолж, үр дүн илгээнэ) тул үндсэн сургалтын аппаас ТУСАД нь,
 * өөрийн домэйн/серверт (`chess.daamal.org`) ажиллана. Тэмцээн унасан ч
 * хичээл үргэлжилнэ; эсрэгээрээ ч мөн адил.
 *
 * ⚠ БҮРТГЭЛ НЬ НЭГ: тэмцээний сайт өөрийн гэсэн бүртгэл, нууц үг
 * ЭРХЛЭХГҮЙ. Хэрэглэгч энд нэвтэрсэн бол тэнд ч нэвтэрсэн байна —
 * `/api/tournament/session` нь богино хугацааны тасалбар (ticket) өгч,
 * тэмцээний сервер түүнийг `/api/tournament/exchange` дээр сольж
 * Firebase custom token авна. Ингэснээр хоёр талд ЯГ ижил Firebase uid
 * ашиглагдана.
 *
 * ⚠ Энэ файлыг клиент ч уншина — НУУЦ утга (shared secret) ЭНД БАЙХГҮЙ.
 * Гарын үсэг зурах логик нь `lib/api/tournamentTicket.ts` дотор,
 * `server-only` тэмдэглэгээтэй.
 */

/**
 * ТЭМЦЭЭНИЙ АНГИЛАЛ — ТОГЛООМЫН ТӨРЛӨӨР.
 *
 * ⚠ Урьд нь сургуулиар (Mind Game / Kids 4–6 / Kids 7–10 / Codely) байсан
 * нь буруу тэнхлэг байв: тэмцээнд оролцогч «би ямар НАСНЫ багцад байна
 * вэ» гэхээсээ «би ШАТАР уу, ДААМ уу тоглох вэ» гэдгээ л сонгодог.
 * Мөн насны багц тус бүрд тусдаа тэмцээн зарлавал нэг тэмцээнд хүн
 * хүрэлцэхгүй, хос сугалалт хоосон явна.
 *
 * ⚠ `key` нь тэмцээний серверийн `game` баганатай ЯГ ИЖИЛ утгатай
 * (`chess` | `checkers`) — хоёр талд нэг үг хэрэглэснээр «ангилал» ба
 * «тоглоом» хоёр зөрөх боломжгүй болно.
 *
 * Танигдаагүй утга «Бусад»-д орно (`OTHER_TOURNAMENT_CATEGORY`) —
 * тэмцээн алга болохгүй.
 */
export const TOURNAMENT_CATEGORIES = [
  { key: "chess", label: "Шатар", description: "Сонгодог шатрын тэмцээн" },
  { key: "checkers", label: "Даам", description: "Даамын тэмцээн" },
] as const;

export type TournamentCategoryKey = (typeof TOURNAMENT_CATEGORIES)[number]["key"];

export const OTHER_TOURNAMENT_CATEGORY = "other";

export type TournamentCategory = TournamentCategoryKey | typeof OTHER_TOURNAMENT_CATEGORY;

export function isTournamentCategory(value: unknown): value is TournamentCategoryKey {
  return TOURNAMENT_CATEGORIES.some((category) => category.key === value);
}

export function tournamentCategoryLabel(key: string): string {
  return TOURNAMENT_CATEGORIES.find((category) => category.key === key)?.label ?? "Бусад";
}

/** Тэмцээний сайтын үндсэн хаяг (төгсгөлийн ташуу зураасгүй). */
export function tournamentBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_TOURNAMENT_URL?.trim();
  if (!raw) return "";

  return raw.replace(/\/+$/, "");
}

/**
 * Цэсэнд «Тэмцээн» харуулах эсэх.
 *
 * ⚠ Хаяг тохируулаагүй бол цэс ОГТ гарахгүй. Гарвал хэрэглэгч дарж
 * хоосон хуудсанд унана — «холбоос эвдэрсэн» гэсэн сэтгэгдэл нь тэр
 * цэс огт байхгүйгээс дор.
 */
export function tournamentEnabled(): boolean {
  return tournamentBaseUrl().length > 0;
}

// ---------------------------------------------------------------------------
// ОРОЛЦОХ ЭРХ
// ---------------------------------------------------------------------------

/**
 * ТЭМЦЭЭНД ХЭН ОРОЛЦОХ ВЭ.
 *
 *   open    — хүн бүр. Төлбөртэй байж болно; гишүүнд сарын квотоор
 *             үнэгүй болдог (`membership.freeEntriesPerMonth`).
 *   members — ЗӨВХӨН гишүүнчлэлтэй хүн, тэдэнд ҮРГЭЛЖ ҮНЭГҮЙ. Квот
 *             хамаарахгүй: энэ нь гишүүнчлэлийн ҮНЭ ЦЭНЭ өөрөө.
 *   mind    — Mind хөтөлбөрийн сурагчид (чансаа тогтоох тэмцээн). Чансаа
 *             нь хөтөлбөрийн дотоод зэрэглэл тул гадны хүн орвол
 *             зэрэглэл нь утгаа алдана.
 *
 * ⚠ ЭРХ нь tactiq ТАЛД шалгагдана: гишүүнчлэл, хөтөлбөрийн өгөгдөл энд
 * байдаг. Тэмцээний сервер нь хэрэглэгчийн хүснэгтгүй тул зөвхөн тугийг
 * хадгална.
 */
export const TOURNAMENT_ACCESS = ["open", "members", "mind"] as const;

export type TournamentAccess = (typeof TOURNAMENT_ACCESS)[number];

/**
 * ⚠ Танихгүй утга → "open". Шинэ түвшин нэмэхэд хуучин апп тэмцээнийг
 * НУУХГҮЙ, харин илүү нээлттэй харуулна — админ «яагаад хэн ч
 * бүртгэгдэхгүй байна» гэж хайхаас дээр. Бүртгэлийн үеийн ЖИНХЭНЭ
 * шалгалт нь сервер талд тул нээлттэй харуулах нь эрх зөрчихгүй.
 */
export function parseTournamentAccess(value: unknown): TournamentAccess {
  return TOURNAMENT_ACCESS.includes(value as TournamentAccess)
    ? (value as TournamentAccess)
    : "open";
}

/** Шошгоны бичвэр — жагсаалт, хуваарь дээр. */
export function tournamentAccessLabel(access: TournamentAccess): string | null {
  if (access === "members") return "Гишүүнд үнэгүй";
  if (access === "mind") return "Mind · чансаа";
  return null;
}
