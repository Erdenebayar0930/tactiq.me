/**
 * LEVEL 4-ӨӨС ӨМНӨХ АГУУЛГЫГ ЦАРЦААНА.
 *
 * ЭЗНИЙ ЗААВАР: «level4-өөс өмнөх зүйлд өөрчлөлт оруулахгүй».
 *
 * ⚠ ЯАГААД КОДООР ХАМГААЛЖ БАЙНА ВЭ: даамын курсийн засварын скриптүүд
 * (`repair-draughts-moves.ts`, `fix-*-lesson*.ts`) нь хичээлийг НЭРЭЭР
 * нь олж дахин үүсгэдэг. Нэг удаа дахин ажиллуулахад Level 1–3-ын
 * агуулга чимээгүй солигдох эрсдэлтэй. Санах ойд найдахын оронд
 * скрипт өөрөө татгалзана.
 *
 * ⚠ ХЯЗГААРЫГ ДАВАХ: зориуд өөрчлөх шаардлага гарвал `--force` тугтай
 * ажиллуулна. Ингэснээр «санамсаргүй» ба «зориуд» хоёр ялгагдана.
 */

/** Үүнээс доош түвшний агуулгыг хөндөхгүй. */
export const LOCKED_BELOW_LEVEL = 4;

/**
 * Бүлгийн нэрнээс түвшнийг гаргана.
 *
 * ⚠ Нэрс нь «Level 3 — Тактикийн аргууд», «Level 6–8 — Байрлалын
 * сэтгэлгээ» гэх мэт; эхний тоог л авна («6–8» → 6).
 */
export function unitLevel(unitTitle: string): number | null {
  const match = /Level\s+(\d+)/i.exec(unitTitle);
  return match ? Number(match[1]) : null;
}

/**
 * Түвшний ДУГААРГҮЙ ч өөрчлөхөөр НЭЭЛТТЭЙ бүлгүүд.
 *
 * ⚠ «Level N» гэсэн дугааргүй бүлгийг доорх `isEditableUnit` нь
 * анхдагчаар ЦАРЦСАН гэж үзнэ (эргэлзээтэй үед аюулгүй тал руу).
 * Шинээр уг бичигдсэн бүлгийг зориуд энд бүртгэнэ — эс бөгөөс аудит,
 * засвар хоёулаа түүнийг чимээгүй алгасна.
 */
export const EDITABLE_UNLEVELLED = new Set(["Дадлага — Идэлт ба цохилт"]);

/** Энэ бүлгийг өөрчилж болох уу. */
export function isEditableUnit(unitTitle: string): boolean {
  if (EDITABLE_UNLEVELLED.has(unitTitle)) return true;
  const level = unitLevel(unitTitle);
  // ⚠ Танигдахгүй нэрийг ХӨНДӨХГҮЙ: эргэлзээтэй үед аюулгүй тал руу.
  return level !== null && level >= LOCKED_BELOW_LEVEL;
}

/**
 * Level ≤3-ын хичээлд чиглэсэн скриптийг зогсооно.
 *
 * @returns `true` бол цааш үргэлжлүүлж БОЛОХГҮЙ.
 */
export function refuseLockedLesson(lessonTitles: string[]): boolean {
  if (process.argv.includes("--force")) return false;

  console.error(
    `⛔ Энэ скрипт Level ${LOCKED_BELOW_LEVEL}-өөс ӨМНӨХ хичээлийг засдаг: ${lessonTitles.join(", ")}`
  );
  console.error("   Эзний заавраар тэр агуулга царцсан. Зориуд засах бол: --force");
  return true;
}
