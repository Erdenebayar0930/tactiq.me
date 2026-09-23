/**
 * Даамын «Тулгууртай 2 нүүдлийн идэлт» сэдвийг үүсгэх CLI.
 *
 * Ажиллуулах:
 *   npm run seed:draughts:combo -- <багшийн-эсвэл-админы-имэйл>
 *
 * ⚠ ТУСДАА СЭДЭВ (unit) болгож үүсгэнэ. Хичээлийн түгжээ нь СЭДЭВ дотор л
 * ажилладаг (`lib/tactiq/courses.ts`-ийн `isLessonUnlocked`) тул энэ сэдвийн
 * эхний хичээл нь «Нэг нүүдлийн идэлт»-ыг дуусгаагүй сурагчид ч НЭЭЛТТЭЙ
 * байна — өөрөөр хэлбэл бие даан эхэлнэ.
 *
 * ТУЛГУУР гэж юу вэ: идэлтийн өмнөх БЭЛТГЭХ нүүдэл — ихэвчлэн дүрсээ
 * зориуд өгч, өрсөлдөгчийг албадан идүүлж, идсэн дүрс нь идэлтийн «гүүр»
 * болдог. Тиймээс энд байрлал бүрд ХАТУУ шалгалт:
 *
 *   1. цагааны эхний нүүдэл ИДЭЛТГҮЙ байх (даамд идэлт заавал тул энэ нь
 *      «идэх юм огт байхгүй» гэсэн үг — жинхэнэ тулгуур),
 *   2. хар талд дараа нь хууль ёсны нүүдэл ЯГ НЭГ (албадмал) бөгөөд тэр нь
 *      ИДЭЛТ байх — өөрөөр хэлбэл тулгуурыг АВАХААС өөр аргагүй,
 *   3. цагаан дараа нь ЯГ НЭГ нүүдэлтэй, тэр нь ИДЭЛТ байх,
 *   4. цагаан нийтдээ ӨГСӨНӨӨСӨӨ ИЛҮҮ дүрс идсэн байх (цэвэр ашигтай).
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
import { parseDraughtsPuzzle } from "../src/lib/draughts/puzzle";
import { makeRng } from "../src/lib/net/puzzle";

import type { Board, DraughtsMove, Piece } from "../src/lib/draughts/engine";

const [emailArg] = process.argv.slice(2);

if (!emailArg) {
  console.error("Хэрэглээ: npm run seed:draughts:combo -- <email>");
  process.exit(1);
}

const connectionString = resolveDatabaseUrl();
if (!connectionString) {
  console.error("DATABASE_URL (эсвэл POSTGRES_URL) тохируулаагүй байна.");
  process.exit(1);
}

const COURSE_SLUG = "checkers";
const UNIT_TITLE = "Тулгууртай 2 нүүдлийн идэлт";
const SIZE = 10;
const TOTAL = 12;
/** Нэг хичээлд хэдэн дасгал вэ (4 хичээл × 3 дасгал) */
const PER_LESSON = 3;

type Combo = {
  fen: string;
  /** "32-28 19-30 25-34" */
  solution: string;
  /** Сурагчийн идсэн дүрс */
  gained: number;
  /** Сурагчийн өгсөн дүрс (тулгуур) */
  given: number;
};

const emptyBoard = (): Board =>
  Array.from({ length: SIZE }, () => Array<Piece | null>(SIZE).fill(null));

const token = (move: DraughtsMove) =>
  `${squareNumber(move.from.row, move.from.col)}-${squareNumber(move.to.row, move.to.col)}`;

/**
 * Санамсаргүй байрлал. Цагаан хүү 0-р мөрөнд, хар хүү 9-р мөрөнд
 * ТАВИГДАХГҮЙ — бодит тоглолтод тэдгээр нь аль хэдийн хаан болсон байна.
 */
function randomBoard(rng: () => number, whites: number, blacks: number): Board | null {
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
 * Байрлалаас «тулгууртай 2 нүүдлийн идэлт» хайна.
 *
 * ⚠ Цагааны ЭХНИЙ нүүдлийг бүх боломжоор туршина, гэхдээ шийдэл нь ЦОРЫН
 * ГАНЦ байх ёстой: хоёр өөр тулгуур ажиллавал сурагч нөгөөг нь хийгээд
 * «буруу» гэсэн хариу авах байсан тул тийм байрлалыг ХАЯНА.
 */
function findCombo(board: Board): Combo | null {
  const probe = new Draughts({ board, turn: "w" });
  const firstMoves = probe.legalMoves();

  // (1) Эхний нүүдэл идэлтгүй байх — даамын дүрмээр идэлт байвал бүх хууль
  // ёсны нүүдэл идэлт болно, тиймээс нэгийг нь шалгахад хангалттай.
  if (firstMoves.length === 0 || firstMoves[0].captures.length > 0) return null;

  let found: Combo | null = null;

  for (const first of firstMoves) {
    const game = new Draughts({ board, turn: "w" });
    game.applyMove(first);

    // (2) Хар талд ганц хууль ёсны нүүдэл, тэр нь идэлт
    const replies = game.legalMoves();
    if (replies.length !== 1 || replies[0].captures.length === 0) continue;
    const reply = replies[0];
    game.applyMove(reply);

    // (3) Цагаан ганц нүүдэлтэй, тэр нь идэлт
    const finals = game.legalMoves();
    if (finals.length !== 1 || finals[0].captures.length === 0) continue;
    const final = finals[0];

    const gained = final.captures.length;
    const given = reply.captures.length;
    // (4) Цэвэр ашигтай байх
    if (gained <= given) continue;

    // Хоёр дахь ажиллах тулгуур олдвол шийдэл ганц биш — байрлалыг хаяна.
    if (found) return null;

    found = {
      fen: serializePosition(board, "w"),
      solution: [token(first), token(reply), token(final)].join(" "),
      gained,
      given,
    };
  }

  return found;
}

/**
 * Даалгавруудыг үүсгэнэ. Үр нь ТОГТМОЛ тул script-ийг дахин ажиллуулахад
 * ижил агуулга гарна (dev/prod ижил байна).
 */
function generateCombos(): Combo[] {
  const rng = makeRng(20260911);
  const combos: Combo[] = [];
  const seen = new Set<string>();

  for (let attempt = 0; attempt < 400000 && combos.length < TOTAL; attempt++) {
    const stage = Math.floor(combos.length / PER_LESSON);
    const board = randomBoard(rng, 3 + stage, 3 + stage);
    if (!board) continue;

    const combo = findCombo(board);
    if (!combo || seen.has(combo.fen)) continue;

    // Задлагчаар ДАХИН шалгана: сурагчийн тоглуулагч, админы шалгалт
    // хоёулаа ЯГ ЭНЭ функцийг ашигладаг тул энэ нь «санд орсон бүхэн
    // тоглогдоно» гэсэн баталгаа.
    const parsed = parseDraughtsPuzzle(combo.fen, combo.solution);
    if (!parsed || parsed.playerMoves !== 2) continue;

    seen.add(combo.fen);
    combos.push(combo);
  }

  if (combos.length < TOTAL) {
    throw new Error(`Зөвхөн ${combos.length} идэлт олдлоо — үрээ эсвэл нөхцөлөө өөрчилнө үү.`);
  }

  // Хялбараас хүнд рүү: цэвэр ашиг бага байхаас их рүү.
  return combos.sort((a, b) => a.gained - b.gained || a.given - b.given);
}

async function main() {
  const combos = generateCombos();
  console.log(
    `✓ ${combos.length} тулгууртай идэлт шалгалтад тэнцлээ ` +
      `(${combos.map((combo) => `+${combo.gained}/-${combo.given}`).join(", ")}).`
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
          color: "rose",
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

    for (let index = 0; index < combos.length; index += PER_LESSON) {
      const chunk = combos.slice(index, index + PER_LESSON);
      const title = `Тулгуур ${index / PER_LESSON + 1}`;
      if (existingTitles.has(title)) continue;

      const lessonId = randomUUID();
      await db.insert(lessons).values({
        id: lessonId,
        unitId,
        title,
        xpReward: 200,
        sortOrder: lessonOrder++,
        createdBy: owner.uid,
      });
      added += 1;

      let exerciseOrder = 0;
      for (const combo of chunk) {
        await db.insert(exercises).values({
          lessonId,
          type: "draughts-puzzle",
          prompt:
            "Цагаанаар тоглож байна. Тулгуур нүүдлээ хийж, хариуг нь албадаад ид.",
          fen: combo.fen,
          solution: combo.solution,
          explanation:
            `Эхний нүүдэл нь ТУЛГУУР — ${combo.given} дүрсээ зориуд өгнө. Хар тал ` +
            `өөр сонголтгүй тул идэх ёстой бөгөөс дараа нь цагаан ${combo.gained} дүрс ` +
            "идэж, цэвэр ашигтай гарна.",
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
