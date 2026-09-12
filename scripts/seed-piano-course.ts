/**
 * Төгөлдөр хуурын курсийг САНД ҮҮСГЭХ CLI.
 *
 * Ажиллуулах:
 *   npm run seed:piano -- <багшийн-эсвэл-админы-имэйл>
 *   npm run seed:piano -- erdenebayar0930@gmail.com
 *
 * ЯАГААД СКРИПТ ВЭ: хичээлийн агуулга нь код БИШ, САНД амьдардаг
 * (`admin/courses` дэлгэцээс нэмдэг). Гэвч "piano-play" төрөл шинэ учир
 * түүнийг ашигласан АЖИЛЛАЖ БУЙ жишээ агуулга байхгүй бол багш нар юу
 * оруулахаа мэдэхгүй, туршиж ч чадахгүй. Энэ скрипт эхний 4 хичээлийг
 * тавьж өгнө — цаашид админ дэлгэцээс засна.
 *
 * ⚠ ДАХИН АЖИЛЛУУЛЖ БОЛНО (idempotent). Курс аль хэдийн байвал ЮУ Ч
 * ХӨНДӨХГҮЙ гарна — багшийн гараар оруулсан хичээлийг дарж бичихгүй.
 *
 * Шаардлагатай env (.env.local): DATABASE_URL
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";

import { createDbPool, resolveDatabaseUrl } from "../src/lib/db/createPool";
import { courses, exercises, lessons, units, users } from "../src/lib/db/schema";
import { parseMelody } from "../src/lib/music/notes";

const [emailArg] = process.argv.slice(2);

if (!emailArg) {
  console.error("Хэрэглээ: npm run seed:piano -- <email>");
  process.exit(1);
}

const connectionString = resolveDatabaseUrl();
if (!connectionString) {
  console.error("DATABASE_URL (эсвэл POSTGRES_URL) тохируулаагүй байна.");
  process.exit(1);
}

const COURSE_SLUG = "piano";

/**
 * ⚠ Курсын slug нь ЗААВАЛ "piano" байх ёстой — `lib/tactiq/courseNav.ts`-ийн
 * `COURSE_INSTRUMENT` энэ нэрээр л "piano-play" дасгалыг зөвшөөрдөг. Өөр
 * нэрээр үүсгэвэл админ дээр төгөлдөр хуурын дасгал сонгох товч гарахгүй.
 */
const CONTENT = [
  {
    unit: "Эхний нотууд",
    color: "amber",
    lessons: [
      {
        title: "До Ре Ми",
        xp: 10,
        exercises: [
          { prompt: "До нотыг дар.", melody: "C4" },
          { prompt: "До Ре хоёрыг дараалуулан дар.", melody: "C4 D4" },
          { prompt: "До Ре Ми — эхний гурван нот.", melody: "C4 D4 E4" },
          { prompt: "Буцаад: Ми Ре До.", melody: "E4 D4 C4" },
        ],
      },
      {
        title: "Фа Соль хүртэл",
        xp: 10,
        exercises: [
          { prompt: "Фа Соль хоёрыг дар.", melody: "F4 G4" },
          { prompt: "До-гоос Соль хүртэл өгсөж тогло.", melody: "C4 D4 E4 F4 G4" },
          { prompt: "Соль-оос До хүртэл уруудаж тогло.", melody: "G4 F4 E4 D4 C4" },
        ],
      },
    ],
  },
  {
    unit: "Анхны ая",
    color: "violet",
    lessons: [
      {
        /**
         * "Twinkle Twinkle Little Star" (Ах Дүү Моцартын хувилбар) — олон
         * улсад анхны хичээлийн стандарт ая. Зохиогчийн эрх дууссан ардын ая
         * тул чөлөөтэй ашиглана.
         */
        title: "Анивчих одод",
        xp: 15,
        exercises: [
          { prompt: "Аяны эхлэл: До До Соль Соль.", melody: "C4 C4 G4 G4" },
          { prompt: "Үргэлжлэл: Ля Ля Соль.", melody: "A4 A4 G4" },
          { prompt: "Бүтэн эхний мөрийг тогло.", melody: "C4 C4 G4 G4 A4 A4 G4" },
        ],
      },
      {
        title: "Бяцхан гар",
        xp: 15,
        exercises: [
          { prompt: "Ми Ре До — уруудах гурав.", melody: "E4 D4 C4" },
          { prompt: "Фа Ми Ре До.", melody: "F4 E4 D4 C4" },
          {
            prompt: "Дуусгах хэсэг: Соль Фа Ми Ре До.",
            melody: "G4 F4 E4 D4 C4",
          },
        ],
      },
    ],
  },
];

async function main() {
  const pool = createDbPool(connectionString!, 1);
  const db = drizzle(pool);

  try {
    const [owner] = await db
      .select({ uid: users.uid, role: users.role })
      .from(users)
      .where(eq(users.email, emailArg.trim().toLowerCase()))
      .limit(1);

    if (!owner) {
      console.error(`"${emailArg}" имэйлтэй хэрэглэгч олдсонгүй.`);
      process.exitCode = 1;
      return;
    }

    /**
     * ⚠ Эзэн нь ЧУХАЛ: `lib/api/contentAccess.ts` нь багшийг ЗӨВХӨН өөрийн
     * оруулсан агуулгыг засахыг зөвшөөрдөг. Эзэнгүй (`null`) үлдээвэл зөвхөн
     * админ хөндөх боломжтой болно.
     */
    const createdBy = owner.uid;

    const [existing] = await db
      .select({ slug: courses.slug })
      .from(courses)
      .where(eq(courses.slug, COURSE_SLUG))
      .limit(1);

    if (existing) {
      console.log(
        `"${COURSE_SLUG}" курс аль хэдийн байна — юу ч өөрчлөөгүй.\n` +
          "Агуулгыг засах бол: /admin/courses/piano"
      );
      return;
    }

    await db.insert(courses).values({
      slug: COURSE_SLUG,
      title: "Төгөлдөр хуур",
      description:
        "Нот таних, ая тоглох — дэлгэц дээрх товчлуур дээр До Ре Ми-гээс " +
        "эхлээд анхны бүтэн аягаа тоглоно.",
      icon: "music",
      color: "violet",
      status: "active",
      // `lib/tactiq/schools.ts` → "create" сургуулийн "Хөгжим" сэдэв
      school: "create",
    });

    let unitOrder = 0;
    let lessonCount = 0;
    let exerciseCount = 0;

    for (const unit of CONTENT) {
      const [unitRow] = await db
        .insert(units)
        .values({
          courseSlug: COURSE_SLUG,
          title: unit.unit,
          color: unit.color,
          sortOrder: unitOrder++,
          createdBy,
        })
        .returning({ id: units.id });

      let lessonOrder = 0;

      for (const lesson of unit.lessons) {
        // Хичээлийн ID нь БҮХ курст даяар өвөрмөц байх ёстой
        // (`lessonProgress.lessonId`) тул санамсаргүй UUID.
        const lessonId = crypto.randomUUID();

        await db.insert(lessons).values({
          id: lessonId,
          unitId: unitRow.id,
          title: lesson.title,
          xpReward: lesson.xp,
          sortOrder: lessonOrder++,
          createdBy,
        });
        lessonCount += 1;

        let exerciseOrder = 0;

        for (const exercise of lesson.exercises) {
          /**
           * Аяыг ЭНД дахин задалж шалгана — үсгийн алдаатай нот санд ороод
           * сурагч дээр "дуусашгүй дасгал" болж илрэхээс сэргийлнэ (гар дээр
           * байхгүй нотыг хэзээ ч дарж чадахгүй).
           */
          const notes = parseMelody(exercise.melody);
          if (!notes) {
            throw new Error(
              `Ая буруу байна: "${exercise.melody}" (хичээл: ${lesson.title})`
            );
          }

          await db.insert(exercises).values({
            lessonId,
            type: "piano-play",
            prompt: exercise.prompt,
            melody: notes.join(" "),
            sortOrder: exerciseOrder++,
            createdBy,
          });
          exerciseCount += 1;
        }
      }
    }

    console.log(
      `✅ "Төгөлдөр хуур" курс үүслээ — ${CONTENT.length} нэгж, ` +
        `${lessonCount} хичээл, ${exerciseCount} дасгал.\n` +
        "Засах: /admin/courses/piano"
    );
  } finally {
    await pool.end();
  }
}

void main();
