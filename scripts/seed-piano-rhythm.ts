/**
 * "Хэмнэл, хэмжээ, темп" НЭГЖИЙГ төгөлдөр хуурын курст нэмэх CLI.
 *
 * Ажиллуулах:
 *   npm run seed:piano:rhythm -- <багшийн-эсвэл-админы-имэйл>
 *
 * ⚠ ДАХИН АЖИЛЛУУЛЖ БОЛНО (idempotent): ижил нэртэй нэгж аль хэдийн байвал
 * ЮУ Ч ХӨНДӨХГҮЙ гарна — багшийн гараар засварласан агуулгыг дарж бичихгүй.
 *
 * ⚠ `seed-piano-course.ts`-ээс ТУСДАА файл байгаа шалтгаан: тэр скрипт нь
 * курс аль хэдийн байвал бүхэлдээ гардаг. Хэрэв энэ агуулгыг тэнд нэмбэл
 * курсээ аль хэдийн үүсгэсэн хүн (жишээ нь энэ хичээлийг нэмэхээс өмнө
 * ажиллуулсан) хэмнэлийн хичээлийг ХЭЗЭЭ Ч авахгүй.
 *
 * Шаардлагатай env (.env.local): DATABASE_URL
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq } from "drizzle-orm";

import { createDbPool, resolveDatabaseUrl } from "../src/lib/db/createPool";
import { courses, exercises, lessons, units, users } from "../src/lib/db/schema";
import { formatMelody, parseMelody } from "../src/lib/music/notes";

const [emailArg] = process.argv.slice(2);

if (!emailArg) {
  console.error("Хэрэглээ: npm run seed:piano:rhythm -- <email>");
  process.exit(1);
}

const connectionString = resolveDatabaseUrl();
if (!connectionString) {
  console.error("DATABASE_URL (эсвэл POSTGRES_URL) тохируулаагүй байна.");
  process.exit(1);
}

const COURSE_SLUG = "piano";
const UNIT_TITLE = "Хэмнэл, хэмжээ, темп";

type SeedExercise = {
  prompt: string;
  type: "choice" | "piano-play" | "rhythm-tap";
  melody?: string;
  tempoBpm?: number;
  meter?: string;
  options?: { id: string; label: string }[];
  correctOptionId?: string;
  explanation?: string;
};

/**
 * Дараалал нь ЗОРИУДААР "ойлголт → сонсох → хийх" гэсэн гурван шаттай:
 * эхлээд сонголтоор нэр томьёог таниулж, дараа нь "Сонсох"-той дасгалаар
 * чихээр мэдрүүлж, эцэст нь өөрөө тогшуулна. Шууд тогшуулж эхэлбэл хүүхэд
 * юуг давтаж байгаагаа мэдэхгүй.
 */
const LESSONS: { title: string; xp: number; exercises: SeedExercise[] }[] = [
  {
    title: "Цохилт гэж юу вэ",
    xp: 10,
    exercises: [
      {
        type: "choice",
        prompt: "Хөгжмийн «цохилт» (beat) гэж юу вэ?",
        options: [
          { id: "a", label: "Тогтмол давтагдах жигд цохилт — хөгжмийн зүрхний цохилт" },
          { id: "b", label: "Хамгийн чанга сонсогдох нот" },
          { id: "c", label: "Хамгийн өндөр нот" },
        ],
        correctOptionId: "a",
        explanation:
          "Цохилт бол жигд давтагдах хэмнэл. Хөл тогших, алхах шиг — үргэлж " +
          "тэнцүү зайтай.",
      },
      {
        type: "rhythm-tap",
        prompt: "Тоолуурыг сонсоод, дөрвөн жигд цохилт тогшино уу.",
        melody: "C4:1 C4:1 C4:1 C4:1",
        tempoBpm: 80,
        meter: "4/4",
        explanation: "Цохилт бүр ижил урттай — хурдасгах ч, удаашруулах ч хэрэггүй.",
      },
      {
        type: "rhythm-tap",
        prompt: "Одоо урт нот: хоёр цохилт тутамд нэг удаа тогшино уу.",
        melody: "C4:2 C4:2",
        tempoBpm: 80,
        meter: "4/4",
        explanation: "Урт нот = хоёр цохилт хүлээнэ гэсэн үг.",
      },
    ],
  },
  {
    title: "Хэмжээ: 2/4, 3/4, 4/4",
    xp: 15,
    exercises: [
      {
        type: "choice",
        prompt: "«3/4» хэмжээ юу гэсэн үг вэ?",
        options: [
          { id: "a", label: "Нэг тактад гурван цохилт" },
          { id: "b", label: "Гурван нот дараалан тоглоно" },
          { id: "c", label: "Гурав дахин хурдан тоглоно" },
        ],
        correctOptionId: "a",
        explanation:
          "Дээд тоо нь нэг тактад хэдэн цохилт байхыг хэлнэ. 3/4 = гурав, " +
          "4/4 = дөрөв.",
      },
      {
        type: "choice",
        prompt: "Вальс ямар хэмжээтэй вэ? (НЭГ-хоёр-гурав, НЭГ-хоёр-гурав)",
        options: [
          { id: "a", label: "3/4" },
          { id: "b", label: "2/4" },
          { id: "c", label: "4/4" },
        ],
        correctOptionId: "a",
        explanation: "Вальс бол 3/4 — эхний цохилт нь хамгийн хүчтэй.",
      },
      {
        type: "rhythm-tap",
        prompt:
          "3/4 хэмжээ. Тоолуурын эхний цохилт өндөр сонсогдоно — гурван удаа тогш.",
        melody: "C4:1 C4:1 C4:1",
        tempoBpm: 90,
        meter: "3/4",
        explanation: "Гурван цохилт = нэг такт. Дараа нь дахин НЭГ-ээс эхэлнэ.",
      },
      {
        type: "rhythm-tap",
        prompt: "2/4 хэмжээ — марш шиг. Хоёр цохилт тогш.",
        melody: "C4:1 C4:1",
        tempoBpm: 100,
        meter: "2/4",
        explanation: "2/4 бол алхаа: ЗҮҮН-баруун, ЗҮҮН-баруун.",
      },
    ],
  },
  {
    title: "Хэмнэл барих",
    xp: 15,
    exercises: [
      {
        type: "choice",
        prompt: "Урт нь ялгаатай нотууд юу үүсгэдэг вэ?",
        options: [
          { id: "a", label: "Хэмнэл (ритм)" },
          { id: "b", label: "Аялгуу" },
          { id: "c", label: "Темп" },
        ],
        correctOptionId: "a",
        explanation:
          "Нотын УРТ нь хэмнэл, нотын ӨНДӨР нь аялгуу үүсгэдэг. Хоёулаа " +
          "хамтдаа дуу болно.",
      },
      {
        type: "rhythm-tap",
        prompt: "Урт-богино-богино: нэг цохилт, дараа нь хоёр хагас цохилт.",
        // 1 + 0.5 + 0.5 = 2 цохилт — 2/4 хэмжээний ЯГ НЭГ такт. Хэмжээг
        // заадаг нэгжид бүтэн бус такт үзүүлэх нь өөрөө буруу жишээ болно.
        melody: "C4:1 C4:0.5 C4:0.5",
        tempoBpm: 80,
        meter: "2/4",
        explanation: "Хагас цохилтууд хоёулаа нэг цохилтод багтана.",
      },
      {
        type: "rhythm-tap",
        prompt: "«Анивчих одод»-ын хэмнэл: дөрвөн цохилт, сүүлд нь урт нот.",
        // 1×4 + 4 = 8 цохилт = 4/4-ийн ЯГ ХОЁР такт.
        melody: "C4:1 C4:1 C4:1 C4:1 C4:4",
        tempoBpm: 90,
        meter: "4/4",
        explanation: "Ая бүр өөрийн хэмнэлтэй — түүнийг таньж чадвал дуу нь танигдана.",
      },
      {
        type: "piano-play",
        prompt: "Одоо хэмнэлээ нотонд буулгая: «Сонсох» дараад давтаж тогло.",
        melody: "C4:1 C4:1 G4:1 G4:1 A4:1 A4:1 G4:2",
        tempoBpm: 90,
        explanation: "Ижил нотууд ч урт нь өөр болохоор өөр сонсогдоно.",
      },
    ],
  },
  {
    title: "Темп: удаан ба хурдан",
    xp: 15,
    exercises: [
      {
        type: "choice",
        prompt: "«Темп» гэж юу вэ?",
        options: [
          { id: "a", label: "Хөгжмийн хурд — минутад хэдэн цохилт байх" },
          { id: "b", label: "Хөгжмийн чанга байдал" },
          { id: "c", label: "Нэг тактад хэдэн цохилт байх" },
        ],
        correctOptionId: "a",
        explanation:
          "Темпийг BPM-ээр хэмждэг: 60 BPM = секундэд нэг цохилт. Нэг тактад " +
          "хэдэн цохилт байхыг ХЭМЖЭЭ хэлнэ — хоёр өөр зүйл.",
      },
      {
        type: "piano-play",
        prompt: "УДААН темп (60 BPM). «Сонсох» дараад дараа нь тогло.",
        melody: "C4:1 D4:1 E4:1 F4:1 G4:2",
        tempoBpm: 60,
        explanation: "60 BPM — секунд тутамд нэг цохилт. Тоолоход амар.",
      },
      {
        type: "piano-play",
        prompt: "ЯГ ИЖИЛ ая, харин ХУРДАН темп (140 BPM). Ялгааг сонс.",
        melody: "C4:1 D4:1 E4:1 F4:1 G4:2",
        tempoBpm: 140,
        explanation:
          "Нот нь өөрчлөгдөөгүй — зөвхөн хурд өөрчлөгдсөн. Темп нь дууны " +
          "сэтгэгдлийг бүхэлд нь өөрчилдөг.",
      },
      {
        type: "rhythm-tap",
        prompt: "Хурдан темпэд хэмнэл барих: 120 BPM, дөрвөн цохилт.",
        melody: "C4:1 C4:1 C4:1 C4:1",
        tempoBpm: 120,
        meter: "4/4",
        explanation: "Темп хурдан ч цохилтууд ХООРОНДОО жигд хэвээр байна.",
      },
    ],
  },
];

async function main() {
  const pool = createDbPool(connectionString!, 1);
  const db = drizzle(pool);

  try {
    const [owner] = await db
      .select({ uid: users.uid })
      .from(users)
      .where(eq(users.email, emailArg.trim().toLowerCase()))
      .limit(1);

    if (!owner) {
      console.error(`"${emailArg}" имэйлтэй хэрэглэгч олдсонгүй.`);
      process.exitCode = 1;
      return;
    }

    const [course] = await db
      .select({ slug: courses.slug })
      .from(courses)
      .where(eq(courses.slug, COURSE_SLUG))
      .limit(1);

    if (!course) {
      console.error(
        `"${COURSE_SLUG}" курс байхгүй байна. Эхлээд: npm run seed:piano -- ${emailArg}`
      );
      process.exitCode = 1;
      return;
    }

    const [duplicate] = await db
      .select({ id: units.id })
      .from(units)
      .where(and(eq(units.courseSlug, COURSE_SLUG), eq(units.title, UNIT_TITLE)))
      .limit(1);

    if (duplicate) {
      console.log(`"${UNIT_TITLE}" нэгж аль хэдийн байна — юу ч өөрчлөөгүй.`);
      return;
    }

    // Байгаа нэгжүүдийн ард нэмнэ — хичээлийн зам нь дарааллаар нээгддэг тул
    // дунд нь оруулбал сурагчдын аль хэдийн дуусгасан замыг эвдэнэ.
    const existingUnits = await db
      .select({ sortOrder: units.sortOrder })
      .from(units)
      .where(eq(units.courseSlug, COURSE_SLUG));
    const nextOrder = existingUnits.reduce((max, row) => Math.max(max, row.sortOrder + 1), 0);

    const [unitRow] = await db
      .insert(units)
      .values({
        courseSlug: COURSE_SLUG,
        title: UNIT_TITLE,
        color: "emerald",
        sortOrder: nextOrder,
        createdBy: owner.uid,
      })
      .returning({ id: units.id });

    let lessonOrder = 0;
    let exerciseCount = 0;

    for (const lesson of LESSONS) {
      const lessonId = crypto.randomUUID();

      await db.insert(lessons).values({
        id: lessonId,
        unitId: unitRow.id,
        title: lesson.title,
        xpReward: lesson.xp,
        sortOrder: lessonOrder++,
        createdBy: owner.uid,
      });

      let exerciseOrder = 0;

      for (const exercise of lesson.exercises) {
        let melody: string | null = null;

        if (exercise.melody) {
          // Хөгжмийн дасгалын аяыг ЭНД дахин задалж шалгана — үсгийн алдаатай
          // нот санд ороод сурагч дээр "дуусашгүй дасгал" болж илрэхээс
          // сэргийлнэ.
          const notes = parseMelody(exercise.melody);
          if (!notes) {
            throw new Error(`Ая буруу: "${exercise.melody}" (${lesson.title})`);
          }
          melody = formatMelody(notes);
        }

        await db.insert(exercises).values({
          lessonId,
          type: exercise.type,
          prompt: exercise.prompt,
          options: exercise.options ?? null,
          correctOptionId: exercise.correctOptionId ?? null,
          melody,
          tempoBpm: exercise.tempoBpm ?? null,
          meter: exercise.meter ?? null,
          explanation: exercise.explanation ?? "",
          sortOrder: exerciseOrder++,
          createdBy: owner.uid,
        });
        exerciseCount += 1;
      }
    }

    console.log(
      `✅ "${UNIT_TITLE}" нэгж нэмэгдлээ — ${LESSONS.length} хичээл, ` +
        `${exerciseCount} дасгал.\nЗасах: /admin/courses/piano`
    );
  } finally {
    await pool.end();
  }
}

void main();
