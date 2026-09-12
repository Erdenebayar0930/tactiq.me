/**
 * Хуанлийн өдөр — дараалал (streak) болон өдөр тутмын зорилтын СУУРЬ.
 *
 * ЯАГААД ТУСДАА ФАЙЛ ВЭ: өгөгдлийн сан бүх мөчийг UTC-гээр хадгалдаг
 * (`createPool.ts` дээр `time_zone = '+00:00'`). Гэтэл сурагчийн хувьд
 * "өнөөдөр" гэдэг нь Улаанбаатарын өдөр — UTC+8. Оройн 21:00-д хичээл хийвэл
 * UTC-гээр аль хэдийн МАРГААШ болсон байна. Хэрэв дарааллыг UTC өдрөөр
 * тоолбол оройдоо хичээллэдэг хүүхдийн дараалал өдөр бүр "хоёр өдөр үсэрч"
 * тасарна.
 *
 * Тиймээс өдрийг `YYYY-MM-DD` МӨР болгож, апп-ын цагийн бүсээр нэг л газраас
 * гаргана. Мөр байх нь харьцуулалтыг ч хялбар болгоно: `"2026-08-25" <
 * "2026-08-26"` нь лексикографаар зөв ажиллана.
 */

/**
 * Апп-ын цагийн бүс. Env-ээр дарж болно — олон улсын хувилбарт хэрэглэгч
 * бүрийн бүсээр тооцох бол энэ функцүүдэд бүсийг параметрээр дамжуулна.
 *
 * ⚠ `APP_TIMEZONE` нь `NEXT_PUBLIC_` угтваргүй тул ЗӨВХӨН сервер дээр
 * уншигдана; клиент дээр анхдагч утга руу унана. Энэ нь асуудалгүй, учир нь
 * өдөр тооцох бүх шийдвэр (дараалал, өдрийн зорилт) сервер дээр гардаг —
 * клиент нь зөвхөн `WEEKDAY_LABELS` зэрэг тогтмолуудыг хэрэглэнэ. Хэрэв
 * хожим клиент дээр өдөр тооцох шаардлага гарвал утгыг API-аар дамжуулна,
 * энд `NEXT_PUBLIC_` болгож БОЛОХГҮЙ (бүсийг бүх хэрэглэгчид нийтлэх нь
 * буруу загвар).
 */
export const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Ulaanbaatar";

/**
 * `Intl.DateTimeFormat`-ыг дахин ашиглана — үүсгэх нь харьцангуй үнэтэй
 * бөгөөд энэ функц хүсэлт бүрд хэд хэдэн удаа дуудагдана.
 *
 * `en-CA` локаль нь яг `YYYY-MM-DD` хэлбэрээр форматлдаг — гараар угсрах
 * шаардлагагүй болно.
 */
const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Өгөгдсөн мөчийг апп-ын бүсийн `YYYY-MM-DD` болгоно. */
export function toDay(date: Date = new Date()): string {
  return dayFormatter.format(date);
}

/** Өнөөдөр (апп-ын бүсээр). */
export const today = (): string => toDay();

/**
 * `YYYY-MM-DD` дээр өдөр нэмнэ / хасна.
 *
 * Мөрийг `Date` болгохдоо `T00:00:00Z` залгана — эс бөгөөс хөтөч заримдаа
 * локал бүсээр уншиж, бүсийн зөрүүнээс болж нэг өдөр хойш/урагш гулсдаг.
 * UTC-гээр уншаад UTC-гээр нэмбэл бүсийн нөлөө огт орохгүй.
 */
export function addDays(day: string, delta: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

/** Хоёр өдрийн хоорондох зөрүү (a - b), өдрөөр. */
export function daysBetween(a: string, b: string): number {
  const ms =
    new Date(`${a}T00:00:00Z`).getTime() - new Date(`${b}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * Сүүлийн `count` өдрийн жагсаалт (эртнээс хойш), өнөөдрөөр төгсөнө.
 * Долоо хоногийн дараалал зурахад (#8 дэлгэц) хэрэглэнэ.
 */
export function lastDays(count: number, from: string = today()): string[] {
  return Array.from({ length: count }, (_, i) => addDays(from, i - count + 1));
}

/**
 * Долоо хоногийн эхлэл (Даваа) — тухайн өдөр багтах 7 хоногийн эхний өдөр.
 *
 * `getUTCDay()` нь Ням = 0 гэж тоолдог. Монголд долоо хоног Даваагаар эхэлдэг
 * тул Нямыг 7 болгож шилжүүлнэ — эс бөгөөс Ням гарагт долоо хоног нь дараагийн
 * долоо хоног руу үсэрнэ.
 */
export function startOfWeek(day: string = today()): string {
  const date = new Date(`${day}T00:00:00Z`);
  const weekday = date.getUTCDay() || 7;
  return addDays(day, 1 - weekday);
}

/** Даваагаас Ням хүртэлх 7 өдөр. */
export function weekDays(day: string = today()): string[] {
  const monday = startOfWeek(day);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Долоо хоногийн товч нэр — календарын толгойд */
export const WEEKDAY_LABELS = ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"];

/**
 * Дарааллын шинэ утгыг тооцно.
 *
 * Дөрвөн тохиолдол:
 *   • өнөөдөр аль хэдийн бүртгэгдсэн → өөрчлөгдөхгүй (өдөрт нэг л удаа нэмнэ)
 *   • сүүлийн идэвх ӨЧИГДӨР → үргэлжилж байна, нэгээр нэмнэ
 *   • дундуур нь БҮТЭН идэвхгүй өдрүүд байгаа ч тэдгээрийг ХАМГААЛАХ
 *     хангалттай "мөс" (`streakFreezes`) байгаа → дараалал ТАСРАХГҮЙ,
 *     хэрэглэсэн мөсний тоог буцаана (дуудагч тал `users.streakFreezes`-ээс
 *     хасна)
 *   • эс бөгөөс → тасарсан, 1-ээс эхэлнэ
 *
 * Нэг мөс яг НЭГ бүтэн идэвхгүй өдрийг хамгаална: 2 өдөр алгассан (`gap
 * === 3`) бол 2 мөс шаардана. Ингэснээр "хэдэн өдөр алгассан бэ" гэдэгтэй
 * шууд шугаман хамааралтай, ойлгомжтой зардал болно.
 */
export function nextStreak(
  lastActiveDay: string,
  currentStreak: number,
  day: string = today(),
  freezesAvailable: number = 0
): { streak: number; freezesUsed: number } {
  if (lastActiveDay === day) {
    return { streak: Math.max(currentStreak, 1), freezesUsed: 0 };
  }

  const gap = lastActiveDay ? daysBetween(day, lastActiveDay) : Infinity;
  if (gap === 1) return { streak: currentStreak + 1, freezesUsed: 0 };

  const missedDays = gap - 1;
  if (lastActiveDay && missedDays > 0 && freezesAvailable >= missedDays) {
    return { streak: currentStreak + 1, freezesUsed: missedDays };
  }

  return { streak: 1, freezesUsed: 0 };
}

/**
 * Дараалал ХАРАГДАХ утга — хадгалагдсан утга хуучирсан байж болно.
 *
 * Хэрэглэгч 3 өдрийн дараалалтай байгаад 5 хоног ирээгүй бол сангийн мөр
 * 3 хэвээр байна. Толгой хэсэгт 3 гэж харуулбал ХУДАЛ. Бичилт хийхгүйгээр
 * уншилтын үед тасалдлыг илрүүлж 0 болгоно.
 *
 * `freezesAvailable` тооцоонд ордог: одоо байгаа мөс дундах ЗАЙг бүхэлд нь
 * хамгаалж чадах хэвээр байвал дараалал "амьд" гэж харуулна — `nextStreak`
 * ЯГ ЛУГА адил дүрмээр (жинхэнэ хасалт зөвхөн дараагийн хичээл дуусгахад
 * л явагдана).
 */
export function displayStreak(
  lastActiveDay: string,
  streakDays: number,
  day: string = today(),
  freezesAvailable: number = 0
): number {
  if (!lastActiveDay) return 0;
  const gap = daysBetween(day, lastActiveDay);
  const missedDays = gap - 1;
  return missedDays <= freezesAvailable ? streakDays : 0;
}

/**
 * Дараалал одоо "мөсөөр хамгаалагдсан" эсэх — өнөөдөр/өчигдрөөс цааш нэг ч
 * бүтэн өдөр алгассан ч хараахан тасраагүй байгааг илэрхийлнэ. UI дээр
 * дөл (🔥) орондоо цасан ширхэг харуулахад ашиглана.
 */
export function isStreakProtectedByFreeze(
  lastActiveDay: string,
  day: string = today(),
  freezesAvailable: number = 0
): boolean {
  if (!lastActiveDay) return false;
  const missedDays = daysBetween(day, lastActiveDay) - 1;
  return missedDays > 0 && missedDays <= freezesAvailable;
}
