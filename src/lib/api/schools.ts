import "server-only";

import { cacheGetOrSet, SCHOOLS_TEXT_CACHE_KEY } from "@/lib/api/cache";
import { listSchoolTexts } from "@/lib/db/schools";
import { mergeSchoolTexts, SCHOOLS } from "@/lib/tactiq/schools";

import type { School, SchoolText, TopicGroup } from "@/lib/tactiq/schools";

/**
 * Сургуулийн текстийг уншиж кодын жагсаалттай нийлүүлэх СЕРВЕРИЙН давхарга.
 *
 * Кэш ҮНДЭСЛЭЛ: сургуулийн текст нь хэрэглэгчээс ХАМААРАХГҮЙ, бараг
 * өөрчлөгддөггүй өгөгдөл. Гэвч нүүр хуудас, цэс, /courses, лигийн нэр
 * бүгд түүнийг уншина — кэшгүй бол хүсэлт бүрд нэмэлт асуулга болно.
 * Админ засмагц `SCHOOLS_TEXT_CACHE_KEY`-г устгадаг тул хугацаа дуусахыг
 * хүлээхгүй.
 */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Сангаас уншихад алдвал ХАЯХГҮЙ, кодын анхдагчаар үргэлжлүүлнэ.
 *
 * ⚠ Зориуд: сургуулийн НЭР нь нүүр хуудас, цэсний бүтцийг барьдаг. Сан
 * хэсэг зуур унасан үед бүх дэлгэц 500 болгохын оронд засваргүй (анхдагч)
 * текст харуулах нь хамаагүй дээр — хэрэглэгч ялгааг мэдэхгүй.
 */
export async function getSchoolTexts(): Promise<SchoolText[]> {
  try {
    return await cacheGetOrSet(SCHOOLS_TEXT_CACHE_KEY, CACHE_TTL_MS, listSchoolTexts);
  } catch (error) {
    console.warn("[schools] текстийн засвар уншиж чадсангүй, анхдагчаар үргэлжилнэ:", error);
    return [];
  }
}

/** Нийлүүлсэн сургуулиуд — сервер компонент, API давхаргад. */
export async function getSchools(): Promise<School[]> {
  return mergeSchoolTexts(await getSchoolTexts());
}

const MAX_LENGTHS = {
  title: 40,
  subtitle: 80,
  tagline: 200,
  description: 2000,
} as const;

/** Сэдвийн бүлэг бүрийн хязгаар — админ гараар бөглөх тул зохистой дээд хэмжээ. */
const MAX_GROUPS = 8;
const MAX_TOPICS_PER_GROUP = 40;
const MAX_TOPIC_LENGTH = 80;
const MAX_GROUP_TITLE_LENGTH = 60;

export const SCHOOL_TEXT_LIMITS = { ...MAX_LENGTHS, MAX_GROUPS, MAX_TOPICS_PER_GROUP };

/**
 * Текстийн талбарыг цэвэрлэнэ.
 *
 * Хоосон (эсвэл зөвхөн зайтай) утга нь `null` болно — энэ нь «засварыг
 * АВ, кодын анхдагчийг хэрэглэ» гэсэн үг. Тиймээс админ талбарыг хоослоод
 * хадгалахад нэр хоосон болохын оронд анхдагч руугаа буцна.
 */
export function cleanSchoolField(
  value: unknown,
  field: keyof typeof MAX_LENGTHS
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_LENGTHS[field]);
}

/**
 * Сэдвийн бүлгүүдийг шалгана.
 *
 * Буцах `null` = «засваргүй, кодын бүлгүүдийг хэрэглэ». Хоосон МАССИВ нь
 * түүнээс ӨӨР — «сэдэв огт байхгүй» гэсэн хүчинтэй засвар.
 */
export function cleanTopicGroups(value: unknown): TopicGroup[] | null {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) return null;

  const groups: TopicGroup[] = [];

  for (const entry of value.slice(0, MAX_GROUPS)) {
    if (!entry || typeof entry !== "object") continue;

    const raw = entry as { title?: unknown; topics?: unknown };
    const title =
      typeof raw.title === "string" && raw.title.trim()
        ? raw.title.trim().slice(0, MAX_GROUP_TITLE_LENGTH)
        : null;

    const topics = Array.isArray(raw.topics)
      ? raw.topics
          .filter((topic): topic is string => typeof topic === "string")
          .map((topic) => topic.trim())
          .filter((topic) => topic.length > 0)
          .map((topic) => topic.slice(0, MAX_TOPIC_LENGTH))
          .slice(0, MAX_TOPICS_PER_GROUP)
      : [];

    // Гарчиг ч, сэдэв ч үгүй бүлэг нь дэлгэцэнд хоосон хүрээ л зурна.
    if (!title && topics.length === 0) continue;

    groups.push({ title, topics });
  }

  return groups;
}

/** Кодод байгаа сургууль эсэх — танихгүй slug-д мөр үүсгэхийг хориглоно. */
export function isKnownSchool(slug: unknown): slug is string {
  return typeof slug === "string" && SCHOOLS.some((school) => school.slug === slug);
}
