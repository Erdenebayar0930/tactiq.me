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
 * ТЭМЦЭЭНИЙ АНГИЛАЛ — сурагчид ӨӨРИЙН багцынхантайгаа өрсөлдөнө.
 *
 * ⚠ `key` нь тэмцээний сервертэй ХУВААЛЦАХ гэрээ: тэр сервер тэмцээн бүрт
 * `category`-г энэ түлхүүрүүдийн нэгээр өгнө. Танигдаагүй утга «Бусад»-д
 * орно (`OTHER_TOURNAMENT_CATEGORY`) — тэмцээн алга болохгүй.
 *
 * Шинэ ангилал нэмэхэд ЭНД нэмээд, тэмцээний сервер дээр мөн ижил
 * түлхүүрээр тэмцээн үүсгэнэ. Дараалал нь Тоглох цэсний табын дараалал.
 */
export const TOURNAMENT_CATEGORIES = [
  { key: "mind-game", label: "Mind Game", description: "Шатар · Даам · Го · Логик" },
  { key: "kids-4-6", label: "Kids 4–6", description: "4–6 насны хүүхдүүд" },
  { key: "kids-7-10", label: "Kids 7–10", description: "7–10 насны хүүхдүүд" },
  { key: "codely", label: "Codely", description: "Код ба технологи" },
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
