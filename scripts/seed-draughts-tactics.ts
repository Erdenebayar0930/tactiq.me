/**
 * Даамын «Нэг нүүдлийн идэлт» сэдвийг үүсгэх CLI.
 *
 * Ажиллуулах:
 *   npm run seed:draughts -- <багшийн-эсвэл-админы-имэйл>
 *
 * ⚠ ДАХИН АЖИЛЛУУЛЖ БОЛНО: хичээл байвал давхардуулахгүй (гарчгаар нь
 * шалгана) — бусад seed-үүдтэй ижил зарчим.
 *
 * ⚠ БАЙРЛАЛУУД ГАРААР БИЧИГДЭХГҮЙ, санамсаргүйгээр ҮҮСГЭГДЭЖ, дараа нь
 * `Draughts` хөдөлгүүрээр ШАЛГАГДАНА. Хүлээн авах болзол ХАТУУ:
 *
 *   • нүүх талд (цагаан) хууль ёсны нүүдэл ЯГ НЭГ байх — даамд идэлт
 *     ЗААВАЛ бөгөөд хамгийн урт идэлт л хууль ёсны тул энэ нь «зөв хариулт
 *     ЦОРЫН ГАНЦ» гэсэн үг. Хоёр өөр идэлт байвал сурагч ЯГ ИЖИЛ САЙН
 *     нүүдэл хийгээд «буруу» гэсэн хариу авах байсан.
 *   • тэр нүүдэл нь ЦОХИЛТ (идэлттэй) байх,
 *   • хоёр тал хоёулаа хангалттай дүрстэй — «хоосон» хөлөг сургалтын
 *     утгагүй.
 *
 * Шаардлагатай env (.env.local): DATABASE_URL
 */
import { randomUUID } from "node:crypto";

import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq } from "drizzle-orm";

import { createDbPool, resolveDatabaseUrl } from "../src/lib/db/createPool";
import { courses, exercises, lessons, units, users } from "../src/lib/db/schema";
import { Draughts } from "../src/lib/draughts/engine";
import { serializePosition, squareFromNumber, squareNumber } from "../src/lib/draughts/notation";
import { makeRng } from "../src/lib/net/puzzle";

import type { Board, Piece } from "../src/lib/draughts/engine";

const [emailArg] = process.argv.slice(2);

if (!emailArg) {
  console.error("Хэрэглээ: npm run seed:draughts -- <email>");
  process.exit(1);
}

const connectionString = resolveDatabaseUrl();
if (!connectionString) {
  console.error("DATABASE_URL (эсвэл POSTGRES_URL) тохируулаагүй байна.");
  process.exit(1);
}

/** ⚠ slug нь ЗААВАЛ "checkers" — `courseNav.ts` энэ курст л "draughts-move"-ыг зөвшөөрнө. */
const COURSE_SLUG = "checkers";
const UNIT_TITLE = "Нэг нүүдлийн идэлт";
const SIZE = 10;
const TOTAL = 20;

type Task = {
  /** `deserializePosition` уншдаг байрлалын мөр */
  fen: string;
  /** 1-50 дугаараар — `draughts-move` дасгалын хадгалагдах хэлбэр */
  from: string;
  to: string;
  /** Хэдэн дүрс идэгдэх вэ — хичээлийн эрэмбэлэлт, тайлбарт */
  captures: number;
};

const emptyBoard = (): Board =>
  Array.from({ length: SIZE }, () => Array<Piece | null>(SIZE).fill(null));

/**
 * Санамсаргүй байрлал үүсгэнэ.
 *
 * ⚠ Цагаан хүү 0-р мөрөнд, хар хүү 9-р мөрөнд ТАВИГДАХГҮЙ: тэнд хүрсэн хүү
 * бодит тоглолтод аль хэдийн хаан болсон байх ёстой тул тийм байрлал
 * «боломжгүй» харагдана.
 */
function randomPosition(rng: () => number, whites: number, blacks: number): Board | null {
  const board = emptyBoard();
  const used = new Set<number>();

  const place = (color: "w" | "b", count: number): boolean => {
    for (let placed = 0; placed < count; placed++) {
      let attempts = 0;
      for (;;) {
        if (attempts++ > 200) return false;
        const n = 1 + Math.floor(rng() * 50);
        if (used.has(n)) continue;

        const { row, col } = squareFromNumber(n);
        if (color === "w" && row === 0) continue;
        if (color === "b" && row === SIZE - 1) continue;

        used.add(n);
        board[row][col] = { color, king: false };
        break;
      }
    }
    return true;
  };

  return place("w", whites) && place("b", blacks) ? board : null;
}

/**
 * Байрлалыг даалгавар болгож болох эсэх.
 *
 * Хөдөлгүүрийн `legalMoves()` нь идэлтийн ЗААВАЛ БАЙХ, МАКСИМАЛЬ идэх
 * дүрмийг аль хэдийн шүүсэн байдаг тул энд зөвхөн «ганц хувилбар үлдсэн
 * үү» гэдгийг шалгахад хангалттай.
 */
function toTask(board: Board): Task | null {
  const game = new Draughts({ board, turn: "w" });
  const moves = game.legalMoves();

  if (moves.length !== 1) return null;

  const [move] = moves;
  if (move.captures.length === 0) return null;

  // Хар тал ямар ч дүрсгүй үлдэх байрлал (идэлт нь тоглоомыг дуусгах)
  // сургалтын хувьд эргэлзээтэй: «идэлт ол» гэхээс илүү «сүүлчийн дүрсийг
  // ид» болно. Дор хаяж нэг хар дүрс үлдэхийг шаардана.
  const blacksLeft = board
    .flat()
    .filter((cell): cell is Piece => cell !== null && cell.color === "b").length;
  if (blacksLeft - move.captures.length < 1) return null;

  return {
    fen: serializePosition(board, "w"),
    from: String(squareNumber(move.from.row, move.from.col)),
    to: String(squareNumber(move.to.row, move.to.col)),
    captures: move.captures.length,
  };
}

/**
 * `TOTAL` ширхэг даалгавар үүсгэнэ.
 *
 * Үр нь ТОГТМОЛ (`makeRng(20260910)`) — script-ийг дахин ажиллуулахад ЯГ
 * ижил даалгаврууд гарна. Ингэснээр өөр орчинд (dev/prod) ижил агуулга
 * үүсэх бөгөөд алдаа гарвал давтаж шалгах боломжтой.
 */
function generateTasks(): Task[] {
  const rng = makeRng(20260910);
  const tasks: Task[] = [];
  const seen = new Set<string>();

  for (let attempt = 0; attempt < 200000 && tasks.length < TOTAL; attempt++) {
    // Дүрсийн тоо аажим өснө — эхний даалгаврууд цөөн дүрстэй, нүдэнд
    // ойлгомжтой; сүүлийнх нь бодит тоглолтын дүр төрхтэй болно.
    const stage = Math.floor(tasks.length / 5);
    const whites = 2 + stage;
    const blacks = 3 + stage;

    const board = randomPosition(rng, whites, blacks);
    if (!board) continue;

    const task = toTask(board);
    if (!task || seen.has(task.fen)) continue;

    seen.add(task.fen);
    tasks.push(task);
  }

  if (tasks.length < TOTAL) {
    throw new Error(`Зөвхөн ${tasks.length} даалгавар үүслээ — үрээ өөрчилнө үү.`);
  }

  // Хялбараас хүнд рүү: эхлээд нэг дүрс идэх, дараа нь олон дүрсийн цуваа.
  return tasks.sort((a, b) => a.captures - b.captures);
}

const explanationFor = (captures: number) =>
  captures === 1
    ? "Даамд идэлт ЗААВАЛ хийгдэнэ — идэх боломж гарвал өөр нүүдэл хууль бус болно."
    : `Нэг нүүдэлд ${captures} дүрс идэгдэнэ: дүрс идсэн газраа зогсохгүй, ` +
      "цааш идэх боломж байвал ҮРГЭЛЖЛҮҮЛЭН үсэрнэ.";

async function main() {
  const tasks = generateTasks();
  const summary = tasks.reduce<Record<number, number>>((acc, task) => {
    acc[task.captures] = (acc[task.captures] ?? 0) + 1;
    return acc;
  }, {});
  console.log(
    `✓ ${tasks.length} идэлтийн даалгавар шалгалтад тэнцлээ ` +
      `(идэлтийн тоогоор: ${Object.entries(summary)
        .map(([count, total]) => `${count}×${total}`)
        .join(", ")}).`
  );

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
      console.error(`"${COURSE_SLUG}" курс олдсонгүй — эхлээд даамын курсээ үүсгэнэ үү.`);
      process.exitCode = 1;
      return;
    }

    const [existingUnit] = await db
      .select({ id: units.id })
      .from(units)
      .where(and(eq(units.courseSlug, COURSE_SLUG), eq(units.title, UNIT_TITLE)))
      .limit(1);

    let unitId: string;

    if (existingUnit) {
      unitId = existingUnit.id;
    } else {
      // Сэдвийг ХАМГИЙН СҮҮЛД байрлуулна: идэлтийн тактик нь дүрэм заасны
      // дараах алхам тул шинэ сурагчид эхний сэдэв болж харагдах ёсгүй.
      const existingUnits = await db
        .select({ sortOrder: units.sortOrder })
        .from(units)
        .where(eq(units.courseSlug, COURSE_SLUG));
      const sortOrder = existingUnits.reduce((max, row) => Math.max(max, row.sortOrder + 1), 0);

      const [created] = await db
        .insert(units)
        .values({
          courseSlug: COURSE_SLUG,
          title: UNIT_TITLE,
          color: "amber",
          sortOrder,
          createdBy: owner.uid,
        })
        .returning({ id: units.id });
      unitId = created.id;
    }

    const existingLessons = await db
      .select({ title: lessons.title, sortOrder: lessons.sortOrder })
      .from(lessons)
      .where(eq(lessons.unitId, unitId));
    const existingTitles = new Set(existingLessons.map((row) => row.title));
    let lessonOrder = existingLessons.reduce((max, row) => Math.max(max, row.sortOrder + 1), 0);

    let added = 0;
    let exerciseCount = 0;

    // 20 даалгавар → 5 дасгалтай 4 хичээл. Нэг хичээлд 20 дасгал байвал
    // хүүхэд дундаа гарах газаргүй, зүрх нь дуусахад бүгдийг эхнээс нь
    // дахин хийх болно.
    for (let index = 0; index < tasks.length; index += 5) {
      const chunk = tasks.slice(index, index + 5);
      const title = `Идэлт ${index / 5 + 1}`;
      if (existingTitles.has(title)) continue;

      const lessonId = randomUUID();
      await db.insert(lessons).values({
        id: lessonId,
        unitId,
        title,
        xpReward: 150,
        sortOrder: lessonOrder++,
        createdBy: owner.uid,
      });
      added += 1;

      let exerciseOrder = 0;
      for (const task of chunk) {
        await db.insert(exercises).values({
          lessonId,
          type: "draughts-move",
          prompt:
            task.captures === 1
              ? "Цагаанаар тоглож байна. Идэлтээ олж, хар дүрсийг ид."
              : `Цагаанаар тоглож байна. Нэг нүүдлээр ${task.captures} дүрс ид.`,
          fen: task.fen,
          correctFrom: task.from,
          correctTo: task.to,
          explanation: explanationFor(task.captures),
          sortOrder: exerciseOrder++,
          createdBy: owner.uid,
        });
        exerciseCount += 1;
      }
    }

    console.log(
      added === 0
        ? "Бүх хичээл аль хэдийн байна — юу ч өөрчлөөгүй."
        : `✅ "${UNIT_TITLE}" — ${added} хичээл, ${exerciseCount} дасгал нэмэгдлээ.\n` +
            "Засах: /admin/courses/checkers"
    );
  } finally {
    await pool.end();
  }
}

void main();
