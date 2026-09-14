/**
 * «Kids 7-10» сургуулийн ЗУРГААН КУРС — тус бүр 3 бүлэг × 4 хичээл.
 *
 * Ажиллуулах:
 *   npm run seed:kids710 -- <багшийн-эсвэл-админы-имэйл> [--force]
 *
 * КУРСУУД:
 *   1. Математикийн суурь   — Тоо · Үйлдэл · Тооцоолол
 *   2. Математик бодлого    — Өгүүлбэртэй бодлого · Амьдралын математик · Сэтгэж бодох
 *   3. IQ хөгжүүлэх         — Хэв маяг · Ажиглалт · Ой тогтоолт
 *   4. Шүүмжлэлт сэтгэлгээ  — Учир шалтгаан · Мэдээлэл · Шийдвэр
 *   5. Орон зайн сэтгэлгээ  — Дүрс · Байрлал · Орон зайн төсөөлөл
 *   6. Сэтгэхүйн сорил      — Хурдан сэтгэлгээ · Санах + бодох · Challenge
 *
 * ⚠ БҮХ ДАСГАЛ `choice` ТӨРЛИЙН. Энэ нас УНШИЖ ЧАДДАГ тул даалгаврыг
 * бичвэрээр өгч болно — 4-7 насныхны зурагт дасгалаас ялгаатай. `choice` нь
 * шинэ төрөл БҮРТГЭХ шаардлагагүй (`lib/db/courses.ts`-ийн `toExerciseData`
 * цагаан жагсаалт, дасгалын редактор, `learn/[lessonId]` — дөрвөн газарт
 * нэмэлт хийхгүй), тиймээс 576 дасгалыг эрсдэлгүй бичиж байна.
 *
 * ⚠ Бүлэг тутам 4 хичээл: `CHEST_EVERY` нь 3 тул бүлэг бүрд НЭГ хайрцаг
 * гарч, 4 дэх хичээл хайрцаггүй төгсөнө. `buildPath` үүнийг зориуд
 * зөвшөөрдөг (`lib/tactiq/path.ts`-ийн тайлбар).
 *
 * ⚠ ХАРИУЛТ БҮР НЭГ Л ЗӨВ байх ёстой: сонголтуудыг бичихдээ буруу хувилбар
 * нь санамсаргүйгээр зөв болж хувираагүй эсэхийг `choice` туслах шалгана
 * (давхардсан шошго → алдаа).
 *
 * ⚠ ХИЧЭЭЛ БҮР ӨВӨРМӨЦ дасгалтай: `uniqueItems` нь асуултын бичвэрээр
 * давхардлыг барьж, хүрэлцэхгүй бол ЧАНГА уначина.
 *
 * Шаардлагатай env (.env.local): DATABASE_URL
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq } from "drizzle-orm";

import { createDbPool, resolveDatabaseUrl } from "../src/lib/db/createPool";
import { courses, exercises, lessons, units, users } from "../src/lib/db/schema";

const args = process.argv.slice(2);
const force = args.includes("--force");
const [emailArg] = args.filter((arg) => !arg.startsWith("--"));

if (!emailArg) {
  console.error("Хэрэглээ: npm run seed:kids710 -- <email> [--force]");
  process.exit(1);
}

const connectionString = resolveDatabaseUrl();
if (!connectionString) {
  console.error("DATABASE_URL (эсвэл POSTGRES_URL) тохируулаагүй байна.");
  process.exit(1);
}

/** Хичээл тутмын дасгалын тоо. */
const PER_LESSON = 8;
/** Курс бүр харьяалагдах сургууль (`lib/tactiq/schools.ts`). */
const SCHOOL = "kids-7-10";

type Option = { id: string; label: string };
type Built = { prompt: string; options: Option[]; correctId: string };
type LessonSpec = { title: string; xp: number; explanation: string; items: Built[] };
type UnitSpec = { title: string; lessons: LessonSpec[] };
type CourseSpec = {
  slug: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  icon: string;
  color: string;
  units: UnitSpec[];
};

/** Тогтвортой (санамсаргүй биш) дараалал — дахин ажиллуулахад ижил үр дүн. */
function makeRng(seed: number) {
  let state = seed >>> 0;
  return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Нэг сонголтот дасгал.
 *
 * ⚠ Буруу хувилбарууд нь зөвтэйгөө ДАВХЦАХГҮЙ байх ёстой: давхцвал хоёр
 * зөв хариу үүсч, сурагч зөв дарсан ч алдаа гэж тооцогдоно. Тиймээс энд
 * чанга шалгана — үүсгэгчийн алдаа санд хүрэхээс өмнө илэрнэ.
 */
function choice(prompt: string, correct: string, wrong: string[], rng: () => number): Built {
  const labels = [correct, ...wrong];
  if (new Set(labels).size !== labels.length) {
    throw new Error(`Сонголт давхцав: «${prompt}» → ${labels.join(" / ")}`);
  }

  const ordered = shuffle(labels, rng);
  const options = ordered.map((label, index) => ({ id: `o${index + 1}`, label }));
  const correctOption = options.find((option) => option.label === correct);
  if (!correctOption) throw new Error(`Зөв хариу алдагдав: ${prompt}`);

  return { prompt, options, correctId: correctOption.id };
}

/**
 * ӨВӨРМӨЦ дасгалуудыг цуглуулна.
 *
 * ⚠ Үүсгэгч нь ижил асуултыг чимээгүй давтаж мэднэ (жишээ нь бага
 * мужийн үржвэрийн хүснэгт). Давхардвал дахин оролдож, хүрэлцэхгүй бол
 * уначина — дутууг нь өнгөрөөвөл сурагч дээр л илэрнэ.
 */
function uniqueItems(count: number, make: (attempt: number) => Built, label: string): Built[] {
  const byPrompt = new Map<string, Built>();

  for (let attempt = 0; byPrompt.size < count && attempt < count * 60; attempt += 1) {
    const item = make(attempt);
    if (!byPrompt.has(item.prompt)) byPrompt.set(item.prompt, item);
  }

  if (byPrompt.size < count) {
    throw new Error(`«${label}» — ${count} өвөрмөц дасгал гарсангүй (${byPrompt.size}).`);
  }

  return [...byPrompt.values()];
}

/**
 * Гараар бичсэн САНГААС дасгал бүтээнэ: [асуулт, зөв, буруу1, буруу2, буруу3].
 *
 * ⚠ Сан нь `PER_LESSON`-оос багагүй байх ёстой — багадвал `uniqueItems`
 * уначина, чимээгүй дутуу хичээл үүсэхгүй.
 */
type Bank = readonly (readonly [string, string, string, string, string])[];

function fromBank(bank: Bank, rng: () => number, label: string): Built[] {
  /*
   * ⚠ Энд `uniqueItems` хэрэглэхгүй: тэр нь АСУУЛТЫН БИЧВЭРЭЭР давхардлыг
   * барьдаг бөгөөд «Аль нь ҮНЭН вэ?» шиг асуултууд сонголтоороо л
   * ялгаатай тул бүгд давхардсан мэт харагдана. Сан нь гараар бичигдсэн
   * учир мөрүүд нь аль хэдийн өвөрмөц — зөвхөн ХҮРЭЛЦЭЭГ шалгана.
   */
  if (bank.length < PER_LESSON) {
    throw new Error(`«${label}» — санд ${PER_LESSON} мөр байх ёстой (${bank.length}).`);
  }

  const seen = new Set(bank.map((row) => row.join("|")));
  if (seen.size !== bank.length) throw new Error(`«${label}» — санд давхардсан мөр байна.`);

  return bank
    .slice(0, PER_LESSON)
    .map(([prompt, correct, ...wrong]) => choice(prompt, correct, [...wrong], rng));
}

/**
 * Нэр дэвшсэн хувилбаруудаас ГУРВАН ӨӨР буруу хариу сонгоно.
 *
 * ⚠ Үүсгэсэн хувилбарууд хоорондоо эсвэл зөв хариутай ДАВХЦАЖ мэднэ
 * (жишээ нь аль хэдийн эрэмбэлэгдсэн дараалалд «эрэмбэл» ба «хэвээр»
 * хоёр ижил болно). Тиймээс шүүж, дутвал ЧАНГА уначина — дуугүй
 * гурваас цөөн сонголттой дасгал үүсгэхгүй.
 */
function pickWrong(correct: string, candidates: string[], label: string): string[] {
  const out: string[] = [];
  for (const candidate of candidates) {
    if (out.length === 3) break;
    if (candidate !== correct && !out.includes(candidate)) out.push(candidate);
  }
  if (out.length < 3) throw new Error(`«${label}» — буруу хувилбар хүрэлцэхгүй: ${correct}`);
  return out;
}

/** Тоон хариултын буруу хувилбарууд — зөвтэй давхцахгүй. */
function numberDistractors(correct: number, rng: () => number, spread = 10): string[] {
  const used = new Set([correct]);
  const out: string[] = [];

  // ⚠ Ойрын алдаа (±1, ±10) нь хамгийн СУРГАМЖТАЙ буруу хариу: яг тэр
  // алдааг хүүхэд бодохдоо гаргадаг. Тиймээс эхлээд тэднийг санал болгоно.
  const candidates = [correct + 1, correct - 1, correct + 10, correct - 10, correct + 2];
  for (const value of candidates) {
    if (out.length === 3) break;
    if (value > 0 && !used.has(value)) {
      used.add(value);
      out.push(String(value));
    }
  }

  while (out.length < 3) {
    const value = correct + 1 + Math.floor(rng() * spread);
    if (!used.has(value)) {
      used.add(value);
      out.push(String(value));
    }
  }

  return out;
}

const SHAPES = ["▲", "■", "●", "◆", "★"];
const COLOR_WORDS = ["улаан", "цэнхэр", "ногоон", "шар", "ягаан"];
const NAMES = ["Бат", "Сараа", "Тэмүүлэн", "Номин", "Ану", "Дорж", "Тунга", "Эрдэнэ"];

// ---------------------------------------------------------------------------
// 1. Математикийн суурь
// ---------------------------------------------------------------------------

function mathFoundations(): UnitSpec[] {
  const rng = makeRng(710_001);

  const places = uniqueItems(
    PER_LESSON,
    (i) => {
      const n = 123 + i * 87 + Math.floor(rng() * 40);
      const digits = [
        { name: "нэгжийн", value: n % 10 },
        { name: "аравтын", value: Math.floor(n / 10) % 10 },
        { name: "зуутын", value: Math.floor(n / 100) % 10 },
      ];
      const asked = digits[i % 3];
      /*
       * ⚠ Бусад орны цифрүүд ХООРОНДОО ч давхцаж мэднэ (665 → 6 ба 6).
       * Тиймээс цуглуулаад ДАВХАРДЛЫГ нь цэвэрлэж, дутсаныг нөхнө —
       * `choice` нь давхцсан сонголтыг татгалздаг.
       */
      const wrong = [
        ...new Set(
          digits.filter((digit) => digit.value !== asked.value).map((digit) => String(digit.value))
        ),
      ];

      let extra = 0;
      while (wrong.length < 3) {
        if (extra !== asked.value && !wrong.includes(String(extra))) wrong.push(String(extra));
        extra += 1;
      }

      return choice(
        `${n} тооны ${asked.name} орны цифр хэд вэ?`,
        String(asked.value),
        wrong.slice(0, 3),
        rng
      );
    },
    "Тооны орон"
  );

  const bigger = uniqueItems(
    PER_LESSON,
    (i) => {
      const base = 200 + i * 61;
      const values = [base, base + 3, base - 30 + (i % 7), base + 41];
      const max = Math.max(...values);
      return choice(
        `Хамгийн ИХ тоо аль нь вэ? ${shuffle(values, rng).join(", ")}`,
        String(max),
        values.filter((value) => value !== max).map(String),
        rng
      );
    },
    "Их, бага тоо"
  );

  const ordering = uniqueItems(
    PER_LESSON,
    (i) => {
      /*
       * ⚠ ДӨРВҮҮЛЭЭ ӨӨР байх ёстой: давхардвал «хэддэх нь» гэсэн асуулт
       * хоёр зөв хариутай болно. Тиймээс өсөх алхмаар барина.
       */
      const base = 110 + i * 13;
      const values = [base, base + 9 + (i % 5), base + 23 + (i % 7), base + 41 + (i % 11)];
      const sorted = [...values].sort((a, b) => a - b);
      const nth = 1 + (i % 3); // 2, 3 эсвэл 4 дэх
      const words = ["", "хоёр", "гурав", "дөрөв"];
      return choice(
        `${values.join(", ")} — жижигээс том руу эрэмбэлбэл ${words[nth]} дахь нь аль нь вэ?`,
        String(sorted[nth]),
        sorted.filter((value) => value !== sorted[nth]).map(String),
        rng
      );
    },
    "Тоог эрэмбэлэх"
  );

  const parity = uniqueItems(
    PER_LESSON,
    (i) => {
      const wantEven = i % 2 === 0;
      const values: number[] = [];
      let seed = 21 + i * 13;
      while (values.length < 4) {
        const fits = seed % 2 === 0 === wantEven;
        // Зөв хариу НЭГ Л байх ёстой — тиймээс нэг л тааруулна.
        if (fits && values.some((value) => (value % 2 === 0) === wantEven)) {
          seed += 1;
          continue;
        }
        values.push(seed);
        seed += 1;
      }
      const answer = values.find((value) => (value % 2 === 0) === wantEven)!;
      return choice(
        `${shuffle(values, rng).join(", ")} — эдгээрээс ${wantEven ? "ТЭГШ" : "СОНДГОЙ"} тоо аль нь вэ?`,
        String(answer),
        values.filter((value) => value !== answer).map(String),
        rng
      );
    },
    "Тэгш ба сондгой"
  );

  const add = uniqueItems(
    PER_LESSON,
    (i) => {
      const a = 23 + i * 9;
      const b = 14 + ((i * 7) % 40);
      return choice(`${a} + ${b} = ?`, String(a + b), numberDistractors(a + b, rng), rng);
    },
    "Нэмэх"
  );

  const subtract = uniqueItems(
    PER_LESSON,
    (i) => {
      const a = 62 + i * 11;
      const b = 17 + ((i * 5) % 35);
      return choice(`${a} − ${b} = ?`, String(a - b), numberDistractors(a - b, rng), rng);
    },
    "Хасах"
  );

  const multiply = uniqueItems(
    PER_LESSON,
    (i) => {
      const a = 2 + (i % 8);
      const b = 3 + ((i * 3) % 7);
      return choice(`${a} × ${b} = ?`, String(a * b), numberDistractors(a * b, rng, 6), rng);
    },
    "Үржих"
  );

  const divide = uniqueItems(
    PER_LESSON,
    (i) => {
      const b = 2 + (i % 7);
      const answer = 3 + ((i * 2) % 8);
      return choice(
        `${b * answer} ÷ ${b} = ?`,
        String(answer),
        numberDistractors(answer, rng, 5),
        rng
      );
    },
    "Хуваах"
  );

  /*
   * «Толгойгоор бодох» — 9, 19, 99 нэмэх заль: бүтэн аравт нэмээд нэгийг
   * хасна. Тиймээс тоонууд нь ЗОРИУД ийм хэлбэртэй.
   */
  const mental = uniqueItems(
    PER_LESSON,
    (i) => {
      const a = 34 + i * 12;
      const b = [9, 19, 29, 99][i % 4];
      return choice(`${a} + ${b} = ?`, String(a + b), numberDistractors(a + b, rng), rng);
    },
    "Толгойгоор бодох"
  );

  const speed = uniqueItems(
    PER_LESSON,
    (i) => {
      const a = 6 + (i % 9);
      const b = 7 + ((i * 4) % 6);
      const useSum = i % 2 === 0;
      const answer = useSum ? a + b : a * b;
      return choice(
        `Хурдан бод: ${a} ${useSum ? "+" : "×"} ${b} = ?`,
        String(answer),
        numberDistractors(answer, rng, 8),
        rng
      );
    },
    "Тооцооллын хурд"
  );

  const estimate = uniqueItems(
    PER_LESSON,
    (i) => {
      const a = 38 + i * 13;
      const b = 21 + ((i * 9) % 50);
      const rounded = Math.round(a / 10) * 10 + Math.round(b / 10) * 10;
      return choice(
        `${a} + ${b} — ойролцоогоор хэд вэ? (тус бүрийг аравт руу дугуйрга)`,
        String(rounded),
        [rounded + 10, rounded - 10, rounded + 20].map(String),
        rng
      );
    },
    "Ойролцоолох"
  );

  /*
   * «Тооцоогоо шалгах» — нэмэхийг ХАСАХААР шалгана. Асуулт нь «зөв үү»
   * биш, «шалгах үйлдэл юу вэ»: хариуг нь харснаар шалгах АРГА сурна.
   */
  const verify = uniqueItems(
    PER_LESSON,
    (i) => {
      const a = 27 + i * 14;
      const b = 15 + ((i * 6) % 40);
      const sum = a + b;
      return choice(
        `${a} + ${b} = ${sum} гэж бодов. Хариу зөв эсэхийг шалгахын тулд юу бодох вэ?`,
        `${sum} − ${b}`,
        [`${sum} + ${b}`, `${a} − ${b}`, `${sum} × ${b}`],
        rng
      );
    },
    "Тооцоогоо шалгах"
  );

  return [
    {
      title: "Бүлэг 1: Тоо",
      lessons: [
        { title: "Тооны орон", xp: 10, explanation: "Баруун талаас нь эхэлж тоол: нэгж, аравт, зуут.", items: places },
        { title: "Их, бага тоо", xp: 10, explanation: "Эхлээд орны тоог харьцуул — олон оронтой нь үргэлж их.", items: bigger },
        { title: "Тоог эрэмбэлэх", xp: 10, explanation: "Хамгийн жижгийг нь ол, дараа нь үлдсэнээс дахин.", items: ordering },
        { title: "Тэгш ба сондгой", xp: 10, explanation: "Сүүлийн цифр нь 0, 2, 4, 6, 8 бол тэгш.", items: parity },
      ],
    },
    {
      title: "Бүлэг 2: Үйлдэл",
      lessons: [
        { title: "Нэмэх", xp: 10, explanation: "Нэгжээ нэмээд, аравт үүсвэл дараагийн орон руу шилжүүл.", items: add },
        { title: "Хасах", xp: 10, explanation: "Нэгж хүрэхгүй бол аравтаас зээлнэ.", items: subtract },
        { title: "Үржих", xp: 12, explanation: "Үржих нь ижил тоог олон удаа нэмэхтэй адил.", items: multiply },
        { title: "Хуваах", xp: 12, explanation: "Хуваах нь үржихийн эсрэг — «хэдийг үржүүлбэл энэ болох вэ?»", items: divide },
      ],
    },
    {
      title: "Бүлэг 3: Тооцоолол",
      lessons: [
        { title: "Толгойгоор бодох", xp: 12, explanation: "9 нэмэх нь 10 нэмээд 1 хасахтай адил.", items: mental },
        { title: "Тооцооллын хурд", xp: 12, explanation: "Цээжилсэн баримт нь хурдны үндэс — бодохгүй, санана.", items: speed },
        { title: "Ойролцоолох", xp: 12, explanation: "Дугуйрсан тоо нь бодит хариунд ойр байх ёстой.", items: estimate },
        { title: "Тооцоогоо шалгах", xp: 14, explanation: "Эсрэг үйлдлээр буцаж шалгана.", items: verify },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// 2. Математик бодлого
// ---------------------------------------------------------------------------

function mathProblems(): UnitSpec[] {
  const rng = makeRng(710_002);
  const name = (i: number) => NAMES[i % NAMES.length];

  const understand = uniqueItems(
    PER_LESSON,
    (i) => {
      const who = name(i);
      const had = 12 + i * 3;
      const gave = 3 + (i % 6);
      return choice(
        `${who} ${had} дэвтэртэй байв. ${gave}-ыг нь дүүдээ өгөв. Энэ бодлогод ЮУГ мэдэж байна вэ?`,
        `${who} ${had} дэвтэртэй байсан`,
        [
          `${who}-д ${had} дэвтэр үлдсэн`,
          `Дүү нь ${had} дэвтэртэй`,
          `${who} ${gave} дэвтэр авсан`,
        ],
        rng
      );
    },
    "Нөхцөл ойлгох"
  );

  const givenAsked = uniqueItems(
    PER_LESSON,
    (i) => {
      const who = name(i + 2);
      const boxes = 4 + (i % 5);
      const each = 6 + (i % 4);
      return choice(
        `${who} ${boxes} хайрцагт ${each}-аар алим хийв. Аль нь АСУУЛТ нь байж болох вэ?`,
        "Нийт хэдэн алим байна вэ?",
        [
          `${who} хэдэн хайрцагтай вэ?`,
          `Нэг хайрцагт хэдэн алим байна вэ?`,
          `${who}-г хэн гэдэг вэ?`,
        ],
        rng
      );
    },
    "Өгөгдөл ба асуулт"
  );

  const pickOperation = uniqueItems(
    PER_LESSON,
    (i) => {
      const cases = [
        ["нийт хэд болохыг", "Нэмэх"],
        ["хэд үлдсэнийг", "Хасах"],
        ["тэнцүү хувааж нэгд хэд ногдохыг", "Хуваах"],
        ["ижил хэсэг олон дахин давтагдвал нийт хэдийг", "Үржих"],
      ] as const;
      const [what, answer] = cases[i % cases.length];
      const who = name(i + 4);
      const n = 12 + i * 4;
      return choice(
        `${who}-д ${n} ширхэг байна. ${what} олох гэж байна — ямар үйлдэл хэрэгтэй вэ?`,
        answer,
        ["Нэмэх", "Хасах", "Үржих", "Хуваах"].filter((op) => op !== answer).slice(0, 3),
        rng
      );
    },
    "Зөв үйлдэл сонгох"
  );

  const multiStep = uniqueItems(
    PER_LESSON,
    (i) => {
      const who = name(i + 1);
      const packs = 3 + (i % 5);
      const each = 4 + (i % 6);
      const used = 2 + (i % 4);
      const answer = packs * each - used;
      return choice(
        `${who} ${packs} багц харандаа авав. Багц бүрт ${each} харандаа байна. ${used}-ыг нь ашиглав. Хэд үлдэв?`,
        String(answer),
        numberDistractors(answer, rng, 7),
        rng
      );
    },
    "Олон алхамт бодлого"
  );

  const money = uniqueItems(
    PER_LESSON,
    (i) => {
      const price = 500 + (i % 6) * 250;
      const count = 2 + (i % 5);
      const answer = price * count;
      return choice(
        `Нэг харандаа ${price}₮. ${count} харандаа авахад хэд төлөх вэ?`,
        `${answer}₮`,
        [`${answer + price}₮`, `${answer - price}₮`, `${price + count}₮`],
        rng
      );
    },
    "Мөнгө тооцох"
  );

  const time = uniqueItems(
    PER_LESSON,
    (i) => {
      const hour = 8 + (i % 5);
      const minute = (i % 4) * 15;
      const duration = 30 + (i % 4) * 15;
      const total = hour * 60 + minute + duration;
      const fmt = (value: number) =>
        `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
      return choice(
        `Хичээл ${fmt(hour * 60 + minute)}-д эхэлж ${duration} минут үргэлжилнэ. Хэдэд дуусах вэ?`,
        fmt(total),
        [fmt(total + 15), fmt(total - 15), fmt(total + 60)],
        rng
      );
    },
    "Цаг тооцох"
  );

  const length = uniqueItems(
    PER_LESSON,
    (i) => {
      const metres = 2 + (i % 7);
      const cm = 10 + (i % 9) * 5;
      const answer = metres * 100 + cm;
      return choice(
        `${metres} м ${cm} см нь хэдэн см вэ?`,
        `${answer} см`,
        [`${answer + 100} см`, `${metres * 10 + cm} см`, `${answer - 10} см`],
        rng
      );
    },
    "Урт ба зай"
  );

  const weight = uniqueItems(
    PER_LESSON,
    (i) => {
      const kg = 1 + (i % 6);
      const g = 50 + (i % 8) * 50;
      const answer = kg * 1000 + g;
      return choice(
        `${kg} кг ${g} г нь хэдэн грамм вэ?`,
        `${answer} г`,
        [`${answer + 1000} г`, `${kg * 100 + g} г`, `${answer - 100} г`],
        rng
      );
    },
    "Жин ба хэмжээс"
  );

  const compare = uniqueItems(
    PER_LESSON,
    (i) => {
      const a = name(i);
      const b = name(i + 3);
      const tall = 132 + i * 3;
      const short = tall - (4 + (i % 9));
      return choice(
        `${a} ${tall} см, ${b} ${short} см өндөр. ${a} хэдэн см-ээр өндөр вэ?`,
        `${tall - short} см`,
        [`${tall + short} см`, `${tall - short + 10} см`, `${tall - short - 1} см`],
        rng
      );
    },
    "Харьцуулалт"
  );

  const table = uniqueItems(
    PER_LESSON,
    (i) => {
      const days = ["Даваа", "Мягмар", "Лхагва"];
      const values = [3 + (i % 6), 5 + (i % 4), 2 + (i % 7)];
      const total = values[0] + values[1] + values[2];
      const rows = days.map((day, index) => `${day} ${values[index]}`).join(", ");
      return choice(
        `Хүснэгт: ${rows}. Гурван өдөрт нийт хэдэн ном уншсан бэ?`,
        String(total),
        numberDistractors(total, rng, 6),
        rng
      );
    },
    "Хүснэгтээс мэдээлэл унших"
  );

  const missing = uniqueItems(
    PER_LESSON,
    (i) => {
      const who = name(i + 5);
      const count = 3 + (i % 6);
      return choice(
        `${who} ${count} дэвтэр авав. Нийт хэд төлсөн бэ? — Энэ бодлогыг бодож болох уу?`,
        "Болохгүй — нэг дэвтрийн ҮНЭ дутуу байна",
        [
          "Болно — хариу нь " + count,
          "Болно — хариу нь " + count * 10,
          "Болохгүй — дэвтрийн ТОО дутуу байна",
        ],
        rng
      );
    },
    "Дутуу мэдээлэл"
  );

  const conditional = uniqueItems(
    PER_LESSON,
    (i) => {
      const price = 1000 + (i % 5) * 500;
      const money_ = price * (2 + (i % 4)) + 300;
      const answer = Math.floor(money_ / price);
      return choice(
        `Нэг дэвтэр ${price}₮. ${money_}₮ байвал ХАМГИЙН ОЛОН хэдэн дэвтэр авч чадах вэ?`,
        String(answer),
        [String(answer + 1), String(answer - 1), String(answer + 2)],
        rng
      );
    },
    "Нөхцөлтэй бодлого"
  );

  return [
    {
      title: "Бүлэг 1: Өгүүлбэртэй бодлого",
      lessons: [
        { title: "Нөхцөл ойлгох", xp: 10, explanation: "Эхлээд МЭДЭЖ БАЙГАА зүйлээ ялга.", items: understand },
        { title: "Өгөгдөл ба асуулт", xp: 10, explanation: "Өгөгдөл нь мэдэгдэж байгаа, асуулт нь олох ёстой зүйл.", items: givenAsked },
        { title: "Зөв үйлдэл сонгох", xp: 12, explanation: "«Нийт» гэвэл нэмэх/үржих, «үлдэх» гэвэл хасах.", items: pickOperation },
        { title: "Олон алхамт бодлого", xp: 14, explanation: "Нэг алхмыг бодоод хариуг нь дараагийн алхамд хэрэглэ.", items: multiStep },
      ],
    },
    {
      title: "Бүлэг 2: Амьдралын математик",
      lessons: [
        { title: "Мөнгө тооцох", xp: 12, explanation: "Нэгийнх нь үнэ × тоо = нийт үнэ.", items: money },
        { title: "Цаг тооцох", xp: 12, explanation: "60 минут = 1 цаг. Минут 60 давбал цаг нэмэгдэнэ.", items: time },
        { title: "Урт ба зай", xp: 12, explanation: "1 м = 100 см.", items: length },
        { title: "Жин ба хэмжээс", xp: 12, explanation: "1 кг = 1000 г.", items: weight },
      ],
    },
    {
      title: "Бүлэг 3: Сэтгэж бодох",
      lessons: [
        { title: "Харьцуулалт", xp: 12, explanation: "«Хэдээр их вэ» гэвэл хасна.", items: compare },
        { title: "Хүснэгтээс мэдээлэл унших", xp: 12, explanation: "Хэрэгтэй мөрүүдээ олоод дараа нь бод.", items: table },
        { title: "Дутуу мэдээлэл", xp: 14, explanation: "Хариулахад юу дутаж байгааг нэрлэж сур.", items: missing },
        { title: "Нөхцөлтэй бодлого", xp: 14, explanation: "«Хамгийн олон» гэвэл үлдэгдэл гарсан ч тоог нь бүхлээр авна.", items: conditional },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// 3. IQ хөгжүүлэх
// ---------------------------------------------------------------------------

/*
 * Давтамжит дарааллын (offset, урт) БҮХ ХОСЛОЛ.
 *
 * ⚠ Хоёуланг нь `i % 3` гэж тооцвол тэд ХАМТ өөрчлөгдөж, гурванхан
 * өвөрмөц дараалал гардаг байв. Тиймээс хослолыг ил тоочно.
 */
const SEQ_COMBOS: { offset: number; period: number }[] = [];
for (let offset = 0; offset <= 3; offset += 1) {
  for (let period = 2; period <= 4; period += 1) {
    if (offset + period <= 5) SEQ_COMBOS.push({ offset, period });
  }
}

function iqTraining(): UnitSpec[] {
  const rng = makeRng(710_003);

  const shapeSeq = uniqueItems(
    PER_LESSON,
    (i) => {
      const { offset, period } = SEQ_COMBOS[i % SEQ_COMBOS.length];
      const pool = SHAPES.slice(offset, offset + period);
      const items = Array.from({ length: 6 }, (_, index) => pool[index % pool.length]);
      const next = pool[6 % pool.length];
      return choice(
        `${items.join(" ")} → дараа нь юу ирэх вэ?`,
        next,
        SHAPES.filter((shape) => shape !== next).slice(0, 3),
        rng
      );
    },
    "Дүрсний дараалал"
  );

  const numberSeq = uniqueItems(
    PER_LESSON,
    (i) => {
      const start = 2 + i;
      const step = 2 + (i % 6);
      const doubling = i % 4 === 3;
      const items = doubling
        ? Array.from({ length: 4 }, (_, index) => start * 2 ** index)
        : Array.from({ length: 5 }, (_, index) => start + index * step);
      const next = doubling
        ? items[items.length - 1] * 2
        : items[items.length - 1] + step;
      return choice(
        `${items.join(", ")}, ? — дараагийн тоо хэд вэ?`,
        String(next),
        numberDistractors(next, rng, 9),
        rng
      );
    },
    "Тоон дараалал"
  );

  const colorSeq = uniqueItems(
    PER_LESSON,
    (i) => {
      const { offset, period } = SEQ_COMBOS[i % SEQ_COMBOS.length];
      const pool = COLOR_WORDS.slice(offset, offset + period);
      const items = Array.from({ length: 5 }, (_, index) => pool[index % pool.length]);
      const next = pool[5 % pool.length];
      return choice(
        `${items.join(" – ")} – ? Дараагийн өнгө юу вэ?`,
        next,
        COLOR_WORDS.filter((color) => color !== next).slice(0, 3),
        rng
      );
    },
    "Өнгөний дараалал"
  );

  const ruleFind = uniqueItems(
    PER_LESSON,
    (i) => {
      const start = 3 + i * 2;
      const step = 2 + (i % 7);
      const items = Array.from({ length: 4 }, (_, index) => start + index * step);
      return choice(
        `${items.join(", ")} — энэ дарааллын ДҮРЭМ юу вэ?`,
        `Тус бүр ${step}-аар нэмэгдэнэ`,
        [
          `Тус бүр ${step + 1}-ээр нэмэгдэнэ`,
          `Тус бүр ${step}-аар хорогдоно`,
          "Тус бүр хоёр дахин нэмэгдэнэ",
        ],
        rng
      );
    },
    "Хээний дүрэм олох"
  );

  const spotDiff = uniqueItems(
    PER_LESSON,
    (i) => {
      /*
       * ⚠ Эгнээний ЭХЛЭЛ ба ялгааны БАЙРЛАЛ хоёр нь `i % 5` гэж хамт
       * эргэлдвэл таван л хувилбар гардаг. Тиймээс тэднийг тусад нь
       * эргүүлнэ (5 × 5 = 25 боломж).
       */
      const length = 5;
      const at = Math.floor(i / 5) % length;
      const base = Array.from({ length }, (_, index) => SHAPES[(i + index) % SHAPES.length]);
      const changed = [...base];
      changed[at] = SHAPES[(i + at + 2) % SHAPES.length];
      const words = ["нэг", "хоёр", "гурав", "дөрөв", "тав"];
      return choice(
        `Дээд: ${base.join(" ")} / Доод: ${changed.join(" ")} — ХЭДДЭХ байрлалд ялгаа байна вэ?`,
        `${words[at]} дахь`,
        words.filter((_, index) => index !== at).slice(0, 3).map((word) => `${word} дахь`),
        rng
      );
    },
    "Ялгааг олох"
  );

  const oddOne = uniqueItems(
    PER_LESSON,
    (i) => {
      const groups = [
        [["нохой", "муур", "морь"], "ширээ"],
        [["алим", "гүзээлзгэнэ", "усан үзэм"], "сандал"],
        [["улаан", "цэнхэр", "ногоон"], "дугуй"],
        [["гурвалжин", "дөрвөлжин", "тойрог"], "ном"],
        [["бороо", "цас", "мөндөр"], "харандаа"],
        [["нэг", "хоёр", "гурав"], "хана"],
        [["нүд", "чих", "хамар"], "цонх"],
        [["автобус", "галт тэрэг", "онгоц"], "талх"],
      ] as const;
      const [same, odd] = groups[i % groups.length];
      return choice(
        `${shuffle([...same, odd], rng).join(", ")} — аль нь ИЛҮҮ вэ?`,
        odd,
        [...same],
        rng
      );
    },
    "Илүү дүрсийг олох"
  );

  const hidden = uniqueItems(
    PER_LESSON,
    (i) => {
      const target = SHAPES[i % SHAPES.length];
      const count = 2 + (i % 4);
      const row: string[] = Array.from({ length: 9 }, (_, index) => SHAPES[(index + i) % SHAPES.length]);
      // Яг `count` ширхэг болгож тохируулна.
      let placed = 0;
      for (let index = 0; index < row.length; index += 1) {
        if (row[index] !== target) continue;
        placed += 1;
        if (placed > count) row[index] = SHAPES[(i + index + 1) % SHAPES.length];
      }
      while (placed < count) {
        const at = (i * 3 + placed * 2) % row.length;
        if (row[at] !== target) {
          row[at] = target;
          placed += 1;
        } else break;
      }
      const actual = row.filter((shape) => shape === target).length;
      return choice(
        `${row.join(" ")} — ${target} дүрс хэдэн удаа орсон бэ?`,
        String(actual),
        [actual + 1, actual + 2, Math.max(0, actual - 1)]
          .filter((value) => value !== actual)
          .slice(0, 3)
          .map(String),
        rng
      );
    },
    "Далд дүрс"
  );

  const quickEye = uniqueItems(
    PER_LESSON,
    (i) => {
      const digits = Array.from({ length: 10 }, (_, index) => (i * 7 + index * 3) % 10);
      const target = digits[i % digits.length];
      const actual = digits.filter((digit) => digit === target).length;
      return choice(
        `${digits.join(" ")} — ${target} цифр хэдэн удаа байна вэ?`,
        String(actual),
        [actual + 1, actual + 2, actual + 3].map(String),
        rng
      );
    },
    "Хурдан ажиглалт"
  );

  const recallShapes = uniqueItems(
    PER_LESSON,
    (i) => {
      const row = Array.from({ length: 4 }, (_, index) => SHAPES[(i + index * 2) % SHAPES.length]);
      const at = i % 4;
      const words = ["нэг", "хоёр", "гурав", "дөрөв"];
      return choice(
        `Дараалал: ${row.join(" ")} — ${words[at]} дахь дүрс юу байсан бэ?`,
        row[at],
        SHAPES.filter((shape) => shape !== row[at]).slice(0, 3),
        rng
      );
    },
    "Дүрс цээжлэх"
  );

  const recallNumbers = uniqueItems(
    PER_LESSON,
    (i) => {
      const digits = Array.from({ length: 5 }, (_, index) => (i * 3 + index * 4) % 10);
      const at = i % 5;
      const words = ["нэг", "хоёр", "гурав", "дөрөв", "тав"];
      const wrong = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
        .filter((digit) => digit !== digits[at])
        .slice(i % 4, (i % 4) + 3);
      return choice(
        `Тоо: ${digits.join(" ")} — ${words[at]} дахь цифр юу байсан бэ?`,
        String(digits[at]),
        wrong.map(String),
        rng
      );
    },
    "Тоо цээжлэх"
  );

  const positions = uniqueItems(
    PER_LESSON,
    (i) => {
      const spots = ["зүүн дээд", "баруун дээд", "зүүн доод", "баруун доод"];
      const at = i % 4;
      const shape = SHAPES[i % SHAPES.length];
      return choice(
        `${shape} дүрс ${spots[at]} буланд байв. Дараа нь хаана байсныг санаж байна уу?`,
        spots[at],
        spots.filter((_, index) => index !== at),
        rng
      );
    },
    "Байрлал тогтоох"
  );

  const reverse = uniqueItems(
    PER_LESSON,
    (i) => {
      /*
       * ⚠ `i * 2 % 10` нь ТАВАН алхмаар давтагддаг тул эгнээ тав л
       * хувилбартай болдог байв. `i * 3` (арван алхам) дээр уртыг нь
       * ээлжлүүлж 20 хувилбар гаргана.
       */
      const size = 4 + (i % 2);
      const row = Array.from({ length: size }, (_, index) => (i * 3 + index * 4) % 10);
      const reversed = [...row].reverse();
      return choice(
        `${row.join(" ")} — энэ дарааллыг УРВУУГААР нь хэл.`,
        reversed.join(" "),
        pickWrong(
          reversed.join(" "),
          [
            row.join(" "),
            [...row].sort((a, b) => a - b).join(" "),
            [...row].sort((a, b) => b - a).join(" "),
            [...reversed.slice(1), reversed[0]].join(" "),
            [reversed[1], reversed[0], ...reversed.slice(2)].join(" "),
          ],
          "Дараалал санах"
        ),
        rng
      );
    },
    "Дараалал санах"
  );

  return [
    {
      title: "Бүлэг 1: Хэв маяг",
      lessons: [
        { title: "Дүрсний дараалал", xp: 10, explanation: "Хэдэн дүрсийн дараа эхнээсээ давтагдаж байгааг ол.", items: shapeSeq },
        { title: "Тоон дараалал", xp: 12, explanation: "Хоёр хөрш тооны ЗӨРҮҮГ хар.", items: numberSeq },
        { title: "Өнгөний дараалал", xp: 10, explanation: "Өнгөний давтамж нь дүрсийнхтэй ижил дүрэмтэй.", items: colorSeq },
        { title: "Хээний дүрэм олох", xp: 12, explanation: "Дүрмийг үгээр хэлж чадвал дараагийнхыг үргэлж олно.", items: ruleFind },
      ],
    },
    {
      title: "Бүлэг 2: Ажиглалт",
      lessons: [
        { title: "Ялгааг олох", xp: 10, explanation: "Хоёр эгнээг байрлал БҮРЭЭР нь тулгаж хар.", items: spotDiff },
        { title: "Илүү дүрсийг олох", xp: 10, explanation: "Бусад нь ямар нэг зүйлээр НЭГ БҮЛЭГ болдог.", items: oddOne },
        { title: "Далд дүрс", xp: 12, explanation: "Тоолохдоо хуруугаараа дага — алгасахаас сэргийлнэ.", items: hidden },
        { title: "Хурдан ажиглалт", xp: 12, explanation: "Нэг зорилтот тэмдэгт л анхаар, бусдыг үл тоо.", items: quickEye },
      ],
    },
    {
      title: "Бүлэг 3: Ой тогтоолт",
      lessons: [
        { title: "Дүрс цээжлэх", xp: 12, explanation: "Дарааллыг чангаар давт — сонсох нь санахад тусална.", items: recallShapes },
        { title: "Тоо цээжлэх", xp: 12, explanation: "Урт тоог 2-3 цифрээр бүлэглэж сан.", items: recallNumbers },
        { title: "Байрлал тогтоох", xp: 12, explanation: "Дүрсийг байрлалтай нь хамт зурагт төсөөл.", items: positions },
        { title: "Дараалал санах", xp: 14, explanation: "Урвуугаар хэлэхийн тулд сүүлээс нь эхэл.", items: reverse },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// 4. Шүүмжлэлт сэтгэлгээ
// ---------------------------------------------------------------------------

/*
 * ⚠ ЭНЭ КУРС ҮҮСГЭГЧГҮЙ, ГАРААР БИЧСЭН САНТАЙ. Учир шалтгаан, баримт-таамаг
 * зэрэг нь тоон загвараас гардаггүй: «зөв» хариу нь утга агуулгаас
 * шалтгаалдаг тул автоматаар үүсгэвэл утгагүй асуулт төрнө.
 */
function criticalThinking(): UnitSpec[] {
  const rng = makeRng(710_004);

  const causeEffect: Bank = [
    ["Бороо орлоо. Тиймээс газар нойтон боллоо. Энд ҮР ДАГАВАР нь юу вэ?", "Газар нойтон болсон", "Бороо орсон", "Үүл гарсан", "Салхи салхилсан"],
    ["Бат оройтож унтсан тул өглөө сэрж чадсангүй. ШАЛТГААН нь юу вэ?", "Оройтож унтсан", "Өглөө сэрээгүй", "Хичээлдээ хоцорсон", "Цаг эвдэрсэн"],
    ["Цонх онгорхой байсан тул өрөө хүйтэн болов. ҮР ДАГАВАР нь юу вэ?", "Өрөө хүйтэн болсон", "Цонх онгорхой байсан", "Гадаа цас орсон", "Хаалга хаалттай байсан"],
    ["Ургамлыг усалсангүй. Тиймээс хатав. ШАЛТГААН нь юу вэ?", "Усалсангүй", "Ургамал хатсан", "Нар тусав", "Хөрс чийглэг байв"],
    ["Сараа өдөр бүр дасгал хийсэн тул гүйлтэндээ түрүүлэв. ШАЛТГААН нь юу вэ?", "Өдөр бүр дасгал хийсэн", "Гүйлтэнд түрүүлсэн", "Шинэ пүүз авсан", "Найзууд нь дэмжсэн"],
    ["Мөс хайлж ус болов. Үүнд юу нөлөөлсөн бэ?", "Дулаан", "Хүйтэн", "Харанхуй", "Чимээгүй байдал"],
    ["Утас цэнэглээгүй тул унтрав. ҮР ДАГАВАР нь юу вэ?", "Утас унтарсан", "Цэнэглээгүй", "Дэлгэц хагарсан", "Дуу чимээ гарсан"],
    ["Хичээлдээ анхаарсан тул шалгалтаа сайн өгөв. ШАЛТГААН нь юу вэ?", "Хичээлдээ анхаарсан", "Шалгалтаа сайн өгсөн", "Багш нь сайн", "Найз нь тусалсан"],
  ];

  const why: Bank = [
    ["Өвлийн улиралд бид зузаан хувцас өмсдөг. Яагаад?", "Биеийн дулааныг хадгалахын тулд", "Хувцас үзэсгэлэнтэй учраас", "Хямд учраас", "Бүгд өмсдөг учраас"],
    ["Хоол идэхийн өмнө гараа угаадаг. Яагаад?", "Бичил биет хоолтой хамт орохоос сэргийлэхийн тулд", "Гар нойтон байх ёстой учраас", "Ус хэмнэхийн тулд", "Хурдан идэхийн тулд"],
    ["Замын гэрэл улаан байхад зогсдог. Яагаад?", "Мөргөлдөхөөс сэргийлэхийн тулд", "Улаан өнгө сайхан учраас", "Хүлээх дуртай учраас", "Гэрэл халуун учраас"],
    ["Ном уншихад гэрэлтэй газар суудаг. Яагаад?", "Нүд ядрахаас сэргийлэхийн тулд", "Ном гэрэлд дуртай учраас", "Дулаан учраас", "Чимээгүй учраас"],
    ["Өглөө өглөөний хоол иддэг. Яагаад?", "Өдрийн турш эрч хүчтэй байхын тулд", "Өглөө цаг их учраас", "Хоол хямд учраас", "Зуршил учраас"],
    ["Дугуй унахдаа малгай өмсдөг. Яагаад?", "Унавал толгойгоо гэмтээхээс сэргийлэхийн тулд", "Хурдан явахын тулд", "Нар халуун учраас", "Малгай хөнгөн учраас"],
    ["Шүдээ өдөрт хоёр удаа угаадаг. Яагаад?", "Шүд цоорооход хүргэдэг үлдэгдлийг арилгахын тулд", "Оо амттай учраас", "Сойз шинэ учраас", "Ам хүйтэн байхын тулд"],
    ["Гараа даравтар алчуураар хатаадаг. Яагаад?", "Нойтон гар хурдан хөрж, бохир наалддаг учраас", "Алчуур зөөлөн учраас", "Ус дутагдалтай учраас", "Хурдан гүйхийн тулд"],
  ];

  const trueFalse: Bank = [
    ["Аль нь ҮНЭН вэ?", "Долоо хоног 7 өдөртэй", "Долоо хоног 5 өдөртэй", "Жил 10 сартай", "Цаг 100 минуттай"],
    ["Аль нь ҮНЭН вэ?", "Ус 0°C-т хөлддөг", "Ус 50°C-т хөлддөг", "Ус хэзээ ч хөлддөггүй", "Мөс усаас халуун"],
    ["Аль нь ХУДАЛ вэ?", "Нар баруунаас мандана", "Нар зүүнээс мандана", "Шөнө харанхуй байдаг", "Сар шөнө харагддаг"],
    ["Аль нь ҮНЭН вэ?", "Гурвалжин 3 талтай", "Гурвалжин 4 талтай", "Дөрвөлжин 3 талтай", "Тойрог 5 талтай"],
    ["Аль нь ХУДАЛ вэ?", "Загас агаараар амьсгалдаг", "Загас усанд амьдардаг", "Шувуу нисдэг", "Муур мяулдаг"],
    ["Аль нь ҮНЭН вэ?", "1 кг = 1000 г", "1 кг = 100 г", "1 м = 10 см", "1 цаг = 100 минут"],
    ["Аль нь ХУДАЛ вэ?", "Бүх шувуу нисдэг", "Зарим шувуу нисдэггүй", "Оцон шувуу сэлдэг", "Тэмээ цөлд амьдардаг"],
    ["Аль нь ҮНЭН вэ?", "Жил 12 сартай", "Жил 7 сартай", "Сар 50 хоногтой", "Долоо хоног 10 өдөртэй"],
  ];

  const conclude: Bank = [
    ["Бүх муур сүүлтэй. Мишээ бол муур. Дүгнэлт нь?", "Мишээ сүүлтэй", "Мишээ сүүлгүй", "Мишээ бол нохой", "Бүх сүүлтэй амьтан муур"],
    ["Гадаа бүгд шүхэртэй яваа. Дүгнэлт нь?", "Бороо орж байгаа байх", "Нар жаргаж байгаа", "Цас хайлж байгаа", "Салхи зогссон"],
    ["Бат хичээлдээ ирээгүй бөгөөд ханиад хүрсэн гэв. Дүгнэлт нь?", "Бат өвчтэй тул ирээгүй", "Бат амарсан", "Бат хичээлд дургүй", "Бат нүүсэн"],
    ["Хоолны өрөө үнэртэй, тогооч ажиллаж байна. Дүгнэлт нь?", "Хоол хийж байна", "Хоол дууссан", "Гал унтарсан", "Хүн байхгүй"],
    ["Газар нойтон, тэнгэр цэлмэг. Дүгнэлт нь?", "Дөнгөж саяхан бороо орсон", "Одоо бороо орж байна", "Хэзээ ч бороо ороогүй", "Цас орж байна"],
    ["Сараа бүх бодлогоо зөв бодов. Дүгнэлт нь?", "Сараа алдаа гаргаагүй", "Сараа нэг алдсан", "Сараа бодоогүй", "Бодлого хэцүү байсан"],
    ["Хайрцаг хоосон, алим ширээн дээр байна. Дүгнэлт нь?", "Алимыг хайрцгаас гаргасан", "Алим хайрцагт байгаа", "Хайрцаг дүүрэн", "Алим байхгүй"],
    ["Ангийн бүх сурагч цэнхэр цамц өмссөн. Бат тэр ангийнх. Дүгнэлт нь?", "Бат цэнхэр цамц өмссөн", "Бат улаан цамц өмссөн", "Бат өөр ангийнх", "Ангид цамц байхгүй"],
  ];

  const factGuess: Bank = [
    ["«Өнөөдөр 20 хэм дулаан байна». Энэ юу вэ?", "Баримт", "Таамаг", "Хүсэл", "Асуулт"],
    ["«Маргааш бороо орох байх». Энэ юу вэ?", "Таамаг", "Баримт", "Хэмжилт", "Дүрэм"],
    ["«Улаанбаатар бол Монголын нийслэл». Энэ юу вэ?", "Баримт", "Таамаг", "Санал", "Хошигнол"],
    ["«Энэ ном сонирхолтой байх шиг байна». Энэ юу вэ?", "Таамаг", "Баримт", "Тоо баримт", "Хэмжилт"],
    ["«Ангид 28 сурагч байна». Энэ юу вэ?", "Баримт", "Таамаг", "Мэдрэмж", "Хүсэл"],
    ["«Бат хичээлдээ хоцрох байх». Энэ юу вэ?", "Таамаг", "Баримт", "Хууль", "Тоо"],
    ["«Ус 100°C-т буцалдаг». Энэ юу вэ?", "Баримт", "Таамаг", "Санамсаргүй бодол", "Дуртай зүйл"],
    ["«Тэр багш маань хамгийн сайн нь». Энэ юу вэ?", "Хувийн үнэлгээ", "Баримт", "Хэмжилт", "Тоо баримт"],
  ];

  const pickInfo: Bank = [
    ["«Хичээл хэдэд эхлэх вэ?» — Аль мэдээлэл хэрэгтэй вэ?", "Хичээлийн хуваарь", "Багшийн нэр", "Ангийн өнгө", "Найзын утас"],
    ["«Энэ ном хэдэн хуудас вэ?» — Хаанаас хармаар вэ?", "Сүүлийн хуудасны дугаар", "Номын нэр", "Зохиогчийн нас", "Хавтасны өнгө"],
    ["«Маргааш хүйтэн үү?» — Аль нь хэрэгтэй вэ?", "Цаг агаарын мэдээ", "Өчигдрийн хичээл", "Ангийн жагсаалт", "Автобусны дугаар"],
    ["«Автобус хэдэд ирэх вэ?» — Аль нь хэрэгтэй вэ?", "Автобусны цагийн хуваарь", "Жолоочийн нэр", "Зогсоолын өнгө", "Тасалбарын зураг"],
    ["«Энэ хоол хэд вэ?» — Аль нь хэрэгтэй вэ?", "Үнийн жагсаалт", "Тогоочийн нэр", "Ширээний дугаар", "Хоолны зураг"],
    ["«Найз маань хаана амьдардаг вэ?» — Аль нь хэрэгтэй вэ?", "Гэрийн хаяг", "Төрсөн өдөр", "Дуртай өнгө", "Ангийн дугаар"],
    ["«Энэ кино хэдэн минут вэ?» — Аль нь хэрэгтэй вэ?", "Киноны үргэлжлэх хугацаа", "Жүжигчдийн нэр", "Гарсан улс", "Постерын өнгө"],
    ["«Ангидаа хэдэн охин байна вэ?» — Аль нь хэрэгтэй вэ?", "Ангийн нэрсийн жагсаалт", "Хичээлийн хуваарь", "Сургуулийн хаяг", "Багшийн утас"],
  ];

  const compareInfo: Bank = [
    ["Нэг дэлгүүрт дэвтэр 1200₮, нөгөөд 1000₮. Аль нь ХЯМД вэ?", "Нөгөө дэлгүүр — 1000₮", "Эхний дэлгүүр — 1200₮", "Хоёулаа адил", "Мэдэх боломжгүй"],
    ["Бат 15 хуудас, Сараа 21 хуудас уншсан. Хэн ИЛҮҮ уншсан бэ?", "Сараа", "Бат", "Адил", "Мэдэх боломжгүй"],
    ["А зам 3 км, Б зам 2400 м. Аль нь ОЙР вэ?", "Б зам", "А зам", "Адил", "Мэдэх боломжгүй"],
    ["6 ширхэгтэй багц 3000₮, 3 ширхэгтэй нь 1800₮. Аль нь ашигтай вэ?", "6 ширхэгтэй багц", "3 ширхэгтэй багц", "Адил", "Мэдэх боломжгүй"],
    ["Өчигдөр 12 хэм, өнөөдөр 9 хэм. Аль өдөр ДУЛААН байв?", "Өчигдөр", "Өнөөдөр", "Адил", "Мэдэх боломжгүй"],
    ["А ном 120 хуудас, Б ном 98 хуудас. Аль нь УРТ вэ?", "А ном", "Б ном", "Адил", "Мэдэх боломжгүй"],
    ["Бат 1 цаг 20 минут, Сараа 95 минут ажиллав. Хэн УДААН ажилласан бэ?", "Сараа", "Бат", "Адил", "Мэдэх боломжгүй"],
    ["Нэг сав 1,5 л, нөгөө нь 1200 мл. Аль нь ИХ вэ?", "1,5 литрийн сав", "1200 мл-ийн сав", "Адил", "Мэдэх боломжгүй"],
  ];

  const findError: Bank = [
    ["«Долоо хоног 7 өдөртэй, жил 13 сартай». Алдаа нь хаана вэ?", "Жил 12 сартай", "Долоо хоног 5 өдөртэй", "Алдаа байхгүй", "Хоёулаа буруу"],
    ["«Гурвалжин 3 талтай, дөрвөлжин 5 талтай». Алдаа нь хаана вэ?", "Дөрвөлжин 4 талтай", "Гурвалжин 4 талтай", "Алдаа байхгүй", "Хоёулаа буруу"],
    ["«1 м = 100 см, 1 кг = 100 г». Алдаа нь хаана вэ?", "1 кг = 1000 г", "1 м = 10 см", "Алдаа байхгүй", "Хоёулаа буруу"],
    ["«Нар зүүнээс мандаж, зүүн зүгт жаргана». Алдаа нь хаана вэ?", "Нар баруун зүгт жаргана", "Нар баруунаас мандана", "Алдаа байхгүй", "Хоёулаа буруу"],
    ["«5 + 3 = 8, 9 − 4 = 6». Алдаа нь хаана вэ?", "9 − 4 = 5", "5 + 3 = 7", "Алдаа байхгүй", "Хоёулаа буруу"],
    ["«Цаг 60 минуттай, минут 100 секундтэй». Алдаа нь хаана вэ?", "Минут 60 секундтэй", "Цаг 100 минуттай", "Алдаа байхгүй", "Хоёулаа буруу"],
    ["«Загас усанд, шувуу усанд амьдардаг». Алдаа нь хаана вэ?", "Шувуу агаарт нисдэг", "Загас агаарт амьдардаг", "Алдаа байхгүй", "Хоёулаа буруу"],
    ["«2 × 6 = 12, 3 × 4 = 15». Алдаа нь хаана вэ?", "3 × 4 = 12", "2 × 6 = 10", "Алдаа байхгүй", "Хоёулаа буруу"],
  ];

  const compareOptions: Bank = [
    ["Гэр рүүгээ 10 минут алхах эсвэл 25 минут автобус хүлээх. Аль нь хурдан вэ?", "Алхах", "Автобус хүлээх", "Адил", "Мэдэх боломжгүй"],
    ["Хичээлээ өнөөдөр эсвэл маргааш шөнө хийх. Аль нь найдвартай вэ?", "Өнөөдөр хийх", "Маргааш шөнө хийх", "Адил", "Хийхгүй байх"],
    ["1 ширхэг 900₮ эсвэл 5 ширхэг 4000₮. Нэгжийн үнээр аль нь хямд вэ?", "5 ширхэгтэй нь", "1 ширхэгтэй нь", "Адил", "Мэдэх боломжгүй"],
    ["Шууд хариулах эсвэл бодоод хариулах. Шалгалтад аль нь зөв вэ?", "Бодоод хариулах", "Шууд хариулах", "Хариулахгүй байх", "Хажуугийнхаас харах"],
    ["Ном уншиж эсвэл кино үзэж түүхийг мэдэх. Аль нь ДЭЛГЭРЭНГҮЙ вэ?", "Ном унших", "Кино үзэх", "Адил", "Аль нь ч биш"],
    ["Багшаас асуух эсвэл таамаглах. Аль нь найдвартай вэ?", "Багшаас асуух", "Таамаглах", "Адил", "Орхих"],
    ["Өдөрт 20 минут эсвэл долоо хоногт нэг удаа 2 цаг дасгал хийх. Аль нь үр дүнтэй вэ?", "Өдөр бүр 20 минут", "Долоо хоногт нэг удаа", "Адил", "Аль нь ч биш"],
    ["Ус эсвэл чихэрлэг ундаа. Цангаа тайлахад аль нь тохиромжтой вэ?", "Ус", "Чихэрлэг ундаа", "Адил", "Аль нь ч биш"],
  ];

  const prosCons: Bank = [
    ["Автобусаар явахын ДАВУУ тал юу вэ?", "Хямд", "Үргэлж хоосон", "Хэзээ ч хоцордоггүй", "Хаана ч зогсдог"],
    ["Алхахын СУЛ тал юу вэ?", "Удаан", "Үнэтэй", "Агаар бохирдуулдаг", "Дасгал болдоггүй"],
    ["Онлайн хичээлийн ДАВУУ тал юу вэ?", "Хаанаас ч суралцаж болно", "Интернэт хэрэггүй", "Багштай биечлэн уулзана", "Найзуудтайгаа тоглоно"],
    ["Ганцаараа хичээл хийхийн СУЛ тал юу вэ?", "Асуух хүн байхгүй", "Чимээ шуугиантай", "Санаа хэт олон гарна", "Хурд буурдаггүй"],
    ["Багаар ажиллахын ДАВУУ тал юу вэ?", "Санаа олон гарна", "Хэн ч ярихгүй", "Хариуцлага байхгүй", "Хэлэлцэх шаардлагагүй"],
    ["Шөнө оройтож унтахын СУЛ тал юу вэ?", "Өглөө ядарна", "Илүү эрүүл болно", "Хичээл сайжирна", "Цаг хэмнэнэ"],
    ["Жагсаалт бичихийн ДАВУУ тал юу вэ?", "Мартахгүй", "Цаас хэмнэнэ", "Хурдан гүйнэ", "Мөнгө олно"],
    ["Утсаар удаан тоглохын СУЛ тал юу вэ?", "Нүд ядарна", "Ном олон уншина", "Нойр сайжирна", "Хичээл хурдан дуусна"],
  ];

  const decide: Bank = [
    ["Маргааш шалгалттай, өнөөдөр найз тоглохоор дуудлаа. Аль нь зөв шийдэл вэ?", "Эхлээд бэлдээд дараа нь товч амрах", "Шөнөжин тоглох", "Шалгалтаа орхих", "Найздаа уурлах"],
    ["Бодлого ойлгохгүй байна. Аль нь зөв шийдэл вэ?", "Багшаасаа асуух", "Хоосон орхих", "Хажуугийнхаас хуулах", "Дэвтрээ хаях"],
    ["Автобусны мөнгө хүрэхгүй байна. Аль нь зөв шийдэл вэ?", "Гэр лүүгээ залгаж мэдэгдэх", "Тасалбаргүй суух", "Замдаа гүйх", "Хэн нэгнээс булаах"],
    ["Найз чинь гэрийн даалгавраа хуулъя гэв. Аль нь зөв шийдэл вэ?", "Хамтдаа тайлбарлаж бодох", "Дэвтрээ өгөх", "Зодох", "Багшид худал хэлэх"],
    ["Хичээлдээ хоцорлоо. Аль нь зөв шийдэл вэ?", "Уучлалт гуйж, чимээгүй суух", "Чимээ шуугиан тарих", "Гэртээ буцах", "Хаалганы гадаа зогсох"],
    ["Дэвтрээ гэртээ мартжээ. Аль нь зөв шийдэл вэ?", "Багшдаа үнэнээ хэлэх", "Худал хэлэх", "Нуугдах", "Хичээл таслах"],
    ["Хоёр хичээл зэрэг давтах шаардлагатай. Аль нь зөв шийдэл вэ?", "Цагаа хуваарилж ээлжлэн давтах", "Нэгийг нь огт хийхгүй", "Хоёуланг нь орхих", "Шөнөжин сууж ядрах"],
    ["Тоглоом гэмтжээ. Аль нь зөв шийдэл вэ?", "Эвдэрсэн шалтгааныг олж засах", "Шидэх", "Нуух", "Бусдыг буруутгах"],
  ];

  const explain: Bank = [
    ["«Би автобусаар явахаар шийдлээ, учир нь…» — Аль нь ТАЙЛБАР вэ?", "Явган явахад удаан", "Автобус шар өнгөтэй", "Би автобусанд дуртай", "Тийм л шийдсэн"],
    ["«Эхлээд хичээлээ хийнэ, учир нь…» — Аль нь ТАЙЛБАР вэ?", "Дараа нь тайван амарна", "Хичээл богино", "Найз маань хийсэн", "Дэвтэр шинэ"],
    ["«Энэ хариу зөв, учир нь…» — Аль нь ТАЙЛБАР вэ?", "Эсрэг үйлдлээр шалгахад таарч байна", "Надад таалагдсан", "Хамгийн эхэнд байсан", "Урт тоо учраас"],
    ["«Би энэ номыг сонголоо, учир нь…» — Аль нь ТАЙЛБАР вэ?", "Сонирхсон сэдвээр бичигдсэн", "Хавтас нь хөх", "Хамгийн хүнд нь", "Хажууд байсан"],
    ["«Ус уух хэрэгтэй, учир нь…» — Аль нь ТАЙЛБАР вэ?", "Бие ус алддаг тул нөхөх шаардлагатай", "Ус үнэгүй", "Аяга шинэ", "Бүгд уудаг"],
    ["«Эрт унтана, учир нь…» — Аль нь ТАЙЛБАР вэ?", "Өглөө сэргэг байхын тулд", "Ор зөөлөн", "Гэрэл унтарсан", "Юм хийхгүй"],
    ["«Энэ дэлгүүрээс авна, учир нь…» — Аль нь ТАЙЛБАР вэ?", "Ижил бараа нь хямд", "Хаалга нь том", "Ойрхон дуутай", "Уут нь өнгөтэй"],
    ["«Багаараа хийнэ, учир нь…» — Аль нь ТАЙЛБАР вэ?", "Ажил хурдан бөгөөд санаа олон болно", "Ганцаараа уйтгартай", "Хичээл амархан", "Багш хэлсэн"],
  ];

  return [
    {
      title: "Бүлэг 1: Учир шалтгаан",
      lessons: [
        { title: "Шалтгаан ба үр дагавар", xp: 12, explanation: "Шалтгаан нь эхэлж болдог, үр дагавар нь дараа нь.", items: fromBank(causeEffect, rng, "Шалтгаан ба үр дагавар") },
        { title: "Яагаад гэдгийг олох", xp: 12, explanation: "«Яагаад» гэсний хариу нь зорилго эсвэл шалтгаан.", items: fromBank(why, rng, "Яагаад гэдгийг олох") },
        { title: "Үнэн ба худал", xp: 12, explanation: "Шалгаж болдог зүйл л үнэн, худал гэж хэлэгдэнэ.", items: fromBank(trueFalse, rng, "Үнэн ба худал") },
        { title: "Дүгнэлт хийх", xp: 14, explanation: "Дүгнэлт нь ӨГӨГДСӨН зүйлээс гарах ёстой — нэмж таамаглахгүй.", items: fromBank(conclude, rng, "Дүгнэлт хийх") },
      ],
    },
    {
      title: "Бүлэг 2: Мэдээлэл",
      lessons: [
        { title: "Баримт ба таамаг", xp: 12, explanation: "Баримтыг шалгаж болно, таамгийг болохгүй.", items: fromBank(factGuess, rng, "Баримт ба таамаг") },
        { title: "Зөв мэдээлэл сонгох", xp: 12, explanation: "Асуултад ХЭРЭГТЭЙ мэдээллийг л ав.", items: fromBank(pickInfo, rng, "Зөв мэдээлэл сонгох") },
        { title: "Мэдээлэл харьцуулах", xp: 12, explanation: "Харьцуулахын өмнө нэгж нь ижил эсэхийг шалга.", items: fromBank(compareInfo, rng, "Мэдээлэл харьцуулах") },
        { title: "Алдаатай мэдээлэл олох", xp: 14, explanation: "Мэдэж байгаа баримттайгаа тулгаж шалга.", items: fromBank(findError, rng, "Алдаатай мэдээлэл олох") },
      ],
    },
    {
      title: "Бүлэг 3: Шийдвэр",
      lessons: [
        { title: "Сонголтуудыг харьцуулах", xp: 12, explanation: "Хоёр сонголтыг ИЖИЛ шалгуураар жиш.", items: fromBank(compareOptions, rng, "Сонголтуудыг харьцуулах") },
        { title: "Давуу ба сул тал", xp: 12, explanation: "Сонголт бүр давуу БА сул талтай — хоёуланг нь бич.", items: fromBank(prosCons, rng, "Давуу ба сул тал") },
        { title: "Зөв шийдэл сонгох", xp: 14, explanation: "Аюулгүй, шударга, үр дүнтэй эсэхээр нь шалга.", items: fromBank(decide, rng, "Зөв шийдэл сонгох") },
        { title: "Шийдвэрээ тайлбарлах", xp: 14, explanation: "Сайн тайлбар нь «учир нь» гэсний ард ШАЛТГААН авчирдаг.", items: fromBank(explain, rng, "Шийдвэрээ тайлбарлах") },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// 5. Орон зайн сэтгэлгээ
// ---------------------------------------------------------------------------

/** Цагийн зүүний дагуу 90°-аар эргэх дараалал. */
const DIRS = ["↑", "→", "↓", "←"];
const DIR_NAMES = ["дээш", "баруун", "доош", "зүүн"];

function spatialThinking(): UnitSpec[] {
  const rng = makeRng(710_005);

  const shapeNames = uniqueItems(
    PER_LESSON,
    (i) => {
      const table = [
        ["3 талтай", "Гурвалжин", "Дөрвөлжин", "Тав талт", "Тойрог"],
        ["4 тэнцүү талтай", "Квадрат", "Гурвалжин", "Тойрог", "Зургаан талт"],
        ["огт булангүй", "Тойрог", "Квадрат", "Гурвалжин", "Ромб"],
        ["5 талтай", "Тав талт", "Зургаан талт", "Дөрвөлжин", "Гурвалжин"],
        ["6 талтай", "Зургаан талт", "Тав талт", "Квадрат", "Тойрог"],
        ["4 талтай ч талууд нь хос хосоороо тэнцүү", "Тэгш өнцөгт", "Гурвалжин", "Тойрог", "Тав талт"],
        ["3 хэмжээст бөгөөд 6 квадрат талтай", "Шоо", "Бөмбөг", "Конус", "Цилиндр"],
        ["3 хэмжээст бөгөөд огт ирмэггүй", "Бөмбөг", "Шоо", "Пирамид", "Призм"],
      ] as const;
      const [clue, correct, ...wrong] = table[i % table.length];
      return choice(`Ямар дүрс вэ: ${clue}?`, correct, [...wrong], rng);
    },
    "Дүрс таних"
  );

  const rotate = uniqueItems(
    PER_LESSON,
    (i) => {
      const from = i % 4;
      const quarters = 1 + (i % 3);
      const to = (from + quarters) % 4;
      const degrees = quarters * 90;
      return choice(
        `${DIRS[from]} сумыг цагийн зүүний дагуу ${degrees}° эргүүлбэл юу болох вэ?`,
        DIRS[to],
        DIRS.filter((dir) => dir !== DIRS[to]),
        rng
      );
    },
    "Дүрс эргүүлэх"
  );

  const combine = uniqueItems(
    PER_LESSON,
    (i) => {
      const table = [
        ["Хоёр ижил тэгш өнцөгт гурвалжныг урт талаар нь нийлүүлбэл", "Квадрат", "Тойрог", "Гурвалжин", "Тав талт"],
        ["Хоёр квадратыг хажуугаар нь нийлүүлбэл", "Тэгш өнцөгт", "Квадрат", "Тойрог", "Гурвалжин"],
        ["Дөрвөн жижиг квадратыг 2×2 болгон нийлүүлбэл", "Илүү том квадрат", "Гурвалжин", "Тойрог", "Зургаан талт"],
        ["Хоёр тэнцүү талт гурвалжныг суурьаар нь нийлүүлбэл", "Ромб", "Квадрат", "Тойрог", "Тав талт"],
        ["Хагас тойрог хоёрыг шулуун талаар нь нийлүүлбэл", "Тойрог", "Квадрат", "Гурвалжин", "Ромб"],
        ["Гурвалжин ба квадратыг дээр нь тавьж нийлүүлбэл", "Байшин хэлбэр", "Тойрог", "Ромб", "Зургаан талт"],
        ["Гурван ижил квадратыг мөрөөр нь нийлүүлбэл", "Урт тэгш өнцөгт", "Квадрат", "Гурвалжин", "Тойрог"],
        ["Зургаан тэнцүү талт гурвалжныг тойруулж нийлүүлбэл", "Зургаан талт", "Квадрат", "Тойрог", "Гурвалжин"],
      ] as const;
      const [clue, correct, ...wrong] = table[i % table.length];
      return choice(`${clue} юу үүсэх вэ?`, correct, [...wrong], rng);
    },
    "Дүрс нийлүүлэх"
  );

  const split = uniqueItems(
    PER_LESSON,
    (i) => {
      const table = [
        ["Квадратыг нэг диагоналаар зүсвэл", "Хоёр гурвалжин", "Хоёр квадрат", "Гурван гурвалжин", "Хоёр тойрог"],
        ["Тэгш өнцөгтийг голоор нь хөндлөн зүсвэл", "Хоёр жижиг тэгш өнцөгт", "Хоёр гурвалжин", "Хоёр тойрог", "Гурван дөрвөлжин"],
        ["Тойргийг голоор нь зүсвэл", "Хоёр хагас тойрог", "Хоёр гурвалжин", "Хоёр квадрат", "Дөрвөн гурвалжин"],
        ["Квадратыг ХОЁР диагоналаар нь зүсвэл", "Дөрвөн гурвалжин", "Хоёр гурвалжин", "Дөрвөн квадрат", "Гурван гурвалжин"],
        ["Зургаан талтыг төвөөс нь булан бүр рүү зүсвэл", "Зургаан гурвалжин", "Гурван гурвалжин", "Зургаан квадрат", "Хоёр тав талт"],
        ["Тэнцүү талт гурвалжныг оройноос суурь руу зүсвэл", "Хоёр тэгш өнцөгт гурвалжин", "Хоёр квадрат", "Гурван гурвалжин", "Хоёр ромб"],
        ["Шоог голоор нь хөндлөн зүсвэл", "Хоёр тэгш өнцөгт призм", "Хоёр бөмбөг", "Хоёр пирамид", "Дөрвөн шоо"],
        ["Ромбыг урт диагоналаар нь зүсвэл", "Хоёр гурвалжин", "Хоёр квадрат", "Хоёр ромб", "Дөрвөн гурвалжин"],
      ] as const;
      const [clue, correct, ...wrong] = table[i % table.length];
      return choice(`${clue} юу үүсэх вэ?`, correct, [...wrong], rng);
    },
    "Дүрс задлах"
  );

  const upDown = uniqueItems(
    PER_LESSON,
    (i) => {
      const stack = ["ном", "дэвтэр", "харандаа", "баллуур", "шугам"];
      /*
       * ⚠ Байрлал ба чиглэлийг хоёуланг нь `i`-ээс шууд авбал тэд хамт
       * эргэлдэж, боломжит хувилбарын ХАГАСТ нь л хүрдэг. Тиймээс
       * чиглэлийг удаан эргэдэг тоолуураар авна.
       */
      const at = i % (stack.length - 1);
      const above = Math.floor(i / (stack.length - 1)) % 2 === 0;
      const target = above ? stack[at] : stack[at + 1];
      return choice(
        `Ширээн дээр доороос дээш: ${stack.join(" → ")}. ${stack[at + (above ? 1 : 0)]}-с ${above ? "ДЭЭР" : "ДООР"} нь юу байна вэ?`,
        target,
        stack.filter((item) => item !== target).slice(0, 3),
        rng
      );
    },
    "Дээр/доор"
  );

  const leftRight = uniqueItems(
    PER_LESSON,
    (i) => {
      const row = ["Бат", "Сараа", "Номин", "Дорж", "Ану", "Тунга"];
      const at = 1 + (i % (row.length - 2));
      const right = Math.floor(i / (row.length - 2)) % 2 === 0;
      const target = right ? row[at + 1] : row[at - 1];
      return choice(
        `Эгнээнд зүүнээс баруун тийш: ${row.join(", ")}. ${row[at]}-гийн ${right ? "БАРУУН" : "ЗҮҮН"} талд хэн байна вэ?`,
        target,
        row.filter((person) => person !== target).slice(0, 3),
        rng
      );
    },
    "Баруун/зүүн"
  );

  const frontBack = uniqueItems(
    PER_LESSON,
    (i) => {
      const queue = ["Дорж", "Тунга", "Эрдэнэ", "Ану", "Бат", "Номин"];
      const at = 1 + (i % (queue.length - 2));
      const front = Math.floor(i / (queue.length - 2)) % 2 === 0;
      const target = front ? queue[at - 1] : queue[at + 1];
      return choice(
        `Дараалалд эхнээс нь: ${queue.join(", ")}. ${queue[at]}-гийн ${front ? "УРД" : "ХОЙД"} нь хэн байна вэ?`,
        target,
        queue.filter((person) => person !== target).slice(0, 3),
        rng
      );
    },
    "Урд/хойд"
  );

  const coords = uniqueItems(
    PER_LESSON,
    (i) => {
      const rows = ["А", "Б", "В"];
      const row = i % 3;
      const col = 1 + (Math.floor(i / 3) % 3);
      const shape = SHAPES[i % SHAPES.length];
      const correct = `${rows[row]}${col}`;
      const wrong = [
        `${rows[(row + 1) % 3]}${col}`,
        `${rows[row]}${(col % 3) + 1}`,
        `${rows[(row + 2) % 3]}${(col % 3) + 1}`,
      ];
      return choice(
        `Хөлөг дээр ${shape} нь ${rows[row]} мөрийн ${col}-р баганад байна. Байрлал нь юу вэ?`,
        correct,
        wrong,
        rng
      );
    },
    "Байрлал тодорхойлох"
  );

  const nets = uniqueItems(
    PER_LESSON,
    (i) => {
      const table = [
        ["6 квадратаас бүрдсэн дэлгээс", "Шоо", "Пирамид", "Цилиндр", "Конус"],
        ["Дөрвөлжин суурь дээр 4 гурвалжинтай дэлгээс", "Пирамид", "Шоо", "Бөмбөг", "Цилиндр"],
        ["Хоёр тойрог ба нэг тэгш өнцөгтөөс бүрдсэн дэлгээс", "Цилиндр", "Конус", "Шоо", "Пирамид"],
        ["Нэг тойрог ба нэг дугуй секторын дэлгээс", "Конус", "Цилиндр", "Шоо", "Призм"],
        ["Хоёр гурвалжин ба гурван тэгш өнцөгтийн дэлгээс", "Гурвалжин призм", "Шоо", "Бөмбөг", "Конус"],
        ["Шоог задалбал хэдэн квадрат гарах вэ?", "6", "4", "8", "12"],
        ["Шоо хэдэн ирмэгтэй вэ?", "12", "6", "8", "4"],
        ["Шоо хэдэн оройтой вэ?", "8", "6", "12", "4"],
      ] as const;
      const [clue, correct, ...wrong] = table[i % table.length];
      return choice(clue.endsWith("?") ? clue : `${clue} — ямар биет үүсэх вэ?`, correct, [...wrong], rng);
    },
    "2D → 3D"
  );

  const imagine = uniqueItems(
    PER_LESSON,
    (i) => {
      /*
       * Хэвтээ тэнхлэгийн толь нь ДЭЭШ/ДООШ-ыг, босоо тэнхлэгийнх нь
       * ЗҮҮН/БАРУУН-г солино. Тэнхлэгтэй нь хамт авснаар найман өөр
       * асуулт гарна.
       */
      const from = i % 4;
      const horizontal = Math.floor(i / 4) % 2 === 0;
      const vertical = from === 0 || from === 2;
      const changes = horizontal ? vertical : !vertical;
      const flipped = changes ? (from + 2) % 4 : from;
      return choice(
        `${DIRS[from]} сумыг ${horizontal ? "ХЭВТЭЭ" : "БОСОО"} тэнхлэгийн толинд харуулбал ${DIR_NAMES[from]} чиглэл юу болох вэ?`,
        DIR_NAMES[flipped],
        DIR_NAMES.filter((name) => name !== DIR_NAMES[flipped]),
        rng
      );
    },
    "Дүрсийг төсөөлөх"
  );

  const shadows = uniqueItems(
    PER_LESSON,
    (i) => {
      const table = [
        ["Бөмбөг", "Тойрог", "Квадрат", "Гурвалжин", "Ромб"],
        ["Шоо", "Квадрат", "Тойрог", "Гурвалжин", "Тав талт"],
        ["Цилиндрийг хажуугаас нь", "Тэгш өнцөгт", "Тойрог", "Гурвалжин", "Ромб"],
        ["Цилиндрийг дээрээс нь", "Тойрог", "Квадрат", "Гурвалжин", "Тав талт"],
        ["Конусыг хажуугаас нь", "Гурвалжин", "Тойрог", "Квадрат", "Ромб"],
        ["Конусыг дээрээс нь", "Тойрог", "Гурвалжин", "Квадрат", "Ромб"],
        ["Пирамидыг хажуугаас нь", "Гурвалжин", "Тойрог", "Зургаан талт", "Ромб"],
        ["Гурвалжин призмийг үзүүрээс нь", "Гурвалжин", "Тойрог", "Квадрат", "Тав талт"],
      ] as const;
      const [clue, correct, ...wrong] = table[i % table.length];
      return choice(`${clue} гэрэлд тусгавал сүүдэр нь ямар дүрстэй вэ?`, correct, [...wrong], rng);
    },
    "Сүүдрийг таних"
  );

  /*
   * «Харагдаагүй талыг олох» — шооны эсрэг талууд нийлээд ҮРГЭЛЖ 7 болно.
   * Энэ нь хүүхдэд харагдахгүй байгаа зүйлийг ДҮРМЭЭР олох анхны жишээ.
   */
  const hiddenFace = uniqueItems(
    PER_LESSON,
    (i) => {
      const top = 1 + (i % 6);
      const bottom = 7 - top;
      const fromTop = Math.floor(i / 6) % 2 === 0;
      return choice(
        fromTop
          ? `Шооны эсрэг талууд нийлээд 7 болдог. Дээд тал нь ${top} бол доод тал нь хэд вэ?`
          : `Шооны эсрэг талууд нийлээд 7 болдог. Доод тал нь ${top} бол дээд тал нь хэд вэ?`,
        String(bottom),
        [1, 2, 3, 4, 5, 6].filter((face) => face !== bottom).slice(0, 3).map(String),
        rng
      );
    },
    "Харагдаагүй талыг олох"
  );

  return [
    {
      title: "Бүлэг 1: Дүрс",
      lessons: [
        { title: "Дүрс таних", xp: 10, explanation: "Талын ТОО нь дүрсийн нэрийг шийднэ.", items: shapeNames },
        { title: "Дүрс эргүүлэх", xp: 12, explanation: "90° бүр нь нэг байрлал урагшлахтай адил.", items: rotate },
        { title: "Дүрс нийлүүлэх", xp: 12, explanation: "Нийлүүлэхдээ ижил УРТТАЙ талыг нь тулга.", items: combine },
        { title: "Дүрс задлах", xp: 12, explanation: "Задлах нь нийлүүлэхийн эсрэг үйлдэл.", items: split },
      ],
    },
    {
      title: "Бүлэг 2: Байрлал",
      lessons: [
        { title: "Дээр/доор", xp: 10, explanation: "Жагсаалтыг доороос дээш уншихаа мартуузай.", items: upDown },
        { title: "Баруун/зүүн", xp: 10, explanation: "Эгнээг ҮРГЭЛЖ зүүнээс баруун тийш уншина.", items: leftRight },
        { title: "Урд/хойд", xp: 10, explanation: "Дараалалд урд нь эхэнд, хойд нь ард.", items: frontBack },
        { title: "Байрлал тодорхойлох", xp: 12, explanation: "Эхлээд мөр, дараа нь багана — хаяг ингэж уншигдана.", items: coords },
      ],
    },
    {
      title: "Бүлэг 3: Орон зайн төсөөлөл",
      lessons: [
        { title: "2D → 3D", xp: 14, explanation: "Дэлгээсийг оюун ухаандаа нугалж төсөөл.", items: nets },
        { title: "Дүрсийг төсөөлөх", xp: 12, explanation: "Толин тусгал нь зүүн, баруунг СОЛИНО.", items: imagine },
        { title: "Сүүдрийг таних", xp: 12, explanation: "Сүүдэр нь биетийн НЭГ талын хавтгай дүрс.", items: shadows },
        { title: "Харагдаагүй талыг олох", xp: 14, explanation: "Шооны эсрэг талууд нийлээд 7 болно.", items: hiddenFace },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// 6. Сэтгэхүйн сорил
// ---------------------------------------------------------------------------

function brainChallenge(): UnitSpec[] {
  const rng = makeRng(710_006);

  const fastMath = uniqueItems(
    PER_LESSON,
    (i) => {
      const a = 7 + (i % 12);
      const b = 4 + ((i * 3) % 9);
      const answer = a * b;
      return choice(`⏱ ${a} × ${b} = ?`, String(answer), numberDistractors(answer, rng, 9), rng);
    },
    "Хурдан тооцоолол"
  );

  const fastSort = uniqueItems(
    PER_LESSON,
    (i) => {
      const groups = [
        [["алим", "гүзээлзгэнэ", "лийр"], "Жимс"],
        [["нохой", "муур", "морь"], "Амьтан"],
        [["улаан", "шар", "ногоон"], "Өнгө"],
        [["гурвалжин", "квадрат", "тойрог"], "Дүрс"],
        [["Даваа", "Мягмар", "Лхагва"], "Долоо хоногийн өдөр"],
        [["нэг", "хоёр", "гурав"], "Тоо"],
        [["автобус", "онгоц", "галт тэрэг"], "Тээврийн хэрэгсэл"],
        [["хүрз", "алх", "хөрөө"], "Багаж"],
      ] as const;
      const [items, answer] = groups[i % groups.length];
      const others = ["Жимс", "Амьтан", "Өнгө", "Дүрс", "Тоо", "Багаж", "Тээврийн хэрэгсэл", "Хувцас"];
      return choice(
        `⏱ ${items.join(", ")} — эдгээр нь ямар БҮЛЭГ вэ?`,
        answer,
        others.filter((group) => group !== answer).slice(i % 3, (i % 3) + 3),
        rng
      );
    },
    "Хурдан ангилал"
  );

  const fastDecide = uniqueItems(
    PER_LESSON,
    (i) => {
      /*
       * ⚠ Дөрвөн тоо нь ЗААВАЛ өөр байх ёстой: давхцвал «хамгийн бага»
       * хоёр зөв хариутай болно. Тиймээс өсөх алхмаар барина.
       */
      const start = 12 + i * 7;
      const values = [start, start + 9 + (i % 5), start + 23 + (i % 7), start + 41 + (i % 11)];
      const wantMax = i % 2 === 0;
      const answer = wantMax ? Math.max(...values) : Math.min(...values);
      return choice(
        `⏱ ${shuffle(values, rng).join(", ")} — хамгийн ${wantMax ? "ИХ" : "БАГА"} нь аль нь вэ?`,
        String(answer),
        values.filter((value) => value !== answer).map(String),
        rng
      );
    },
    "Хурдан шийдвэр"
  );

  const reaction = uniqueItems(
    PER_LESSON,
    (i) => {
      /*
       * ⚠ `(i * 2 + index) % 5` нь эгнээг таван хувилбараар л эргүүлдэг.
       * Урт БА алхмыг нь хамт хувиргаж олон янз болгоно.
       */
      const size = 7 + (i % 3);
      const step = 1 + (i % 2);
      const row = Array.from(
        { length: size },
        (_, index) => SHAPES[(i + index * step) % SHAPES.length]
      );
      const target = SHAPES[(i + 1) % SHAPES.length];
      const at = row.indexOf(target);
      if (at < 0) row[i % row.length] = target;
      const first = row.indexOf(target) + 1;
      const words = ["1-р", "2-р", "3-р", "4-р", "5-р", "6-р", "7-р", "8-р"];
      return choice(
        `⏱ ${row.join(" ")} — ${target} дүрс ХАМГИЙН ТҮРҮҮНД хэддэх байрлалд гарч байна вэ?`,
        words[first - 1],
        words.filter((_, index) => index !== first - 1).slice(0, 3),
        rng
      );
    },
    "Reaction Challenge"
  );

  const orderRecall = uniqueItems(
    PER_LESSON,
    (i) => {
      /*
       * ⚠ `i * 5 % 20` нь дөрвөн алхмаар давтагдана. Алхмыг сондгой
       * болгож (7), уртыг ээлжлүүлж олон хувилбар гаргана.
       */
      /*
       * ⚠ Тоонууд ДАВХЦВАЛ эрэмбэлсэн ба солигдсон хувилбарууд ижил
       * болж, буруу сонголт хүрэлцэхгүй болно. Тиймээс өсөх алхмаар
       * барьж, ХАРУУЛАХДАА л холино.
       */
      const start = 1 + (i % 9);
      const sorted = [start, start + 3 + (i % 4), start + 8 + (i % 5), start + 14 + (i % 3)];
      const values = shuffle(sorted, rng);
      return choice(
        `${values.join(" ")} — эдгээрийг жижигээс том руу дараалуул.`,
        sorted.join(" "),
        pickWrong(
          sorted.join(" "),
          [
            [...sorted].reverse().join(" "),
            values.join(" "),
            [...sorted.slice(1), sorted[0]].join(" "),
            [sorted[1], sorted[0], ...sorted.slice(2)].join(" "),
          ],
          "Санаж дараалуулах"
        ),
        rng
      );
    },
    "Санаж дараалуулах"
  );

  const multiInfo = uniqueItems(
    PER_LESSON,
    (i) => {
      const a = 3 + (i % 6);
      const b = 4 + (i % 5);
      const c = 2 + (i % 4);
      const answer = a * b + c;
      return choice(
        `${a} хайрцагт ${b}-аар бөмбөг байна, дээр нь ${c} бөмбөг тусад нь байна. Нийт хэд вэ?`,
        String(answer),
        numberDistractors(answer, rng, 8),
        rng
      );
    },
    "Олон мэдээлэл боловсруулах"
  );

  const switchTask = uniqueItems(
    PER_LESSON,
    (i) => {
      /*
       * ⚠ Дүрмийг тооноос нь ТУСАД нь бодож болохгүй: зөв хариу нь
       * зөвхөн тооны тэгш/сондгойгоос хамаарна. Өмнөх хувилбар нь
       * «горим»-оо тусад нь тооцоод буруу хариу үүсгэж байсан.
       */
      const value = 10 + i * 3;
      const answer = value % 2 === 0 ? value + 7 : value - 7;
      return choice(
        `Дүрэм: ТЭГШ тоонд 7 нэмнэ, СОНДГОЙ тоонд 7 хасна. ${value} → ?`,
        String(answer),
        numberDistractors(answer, rng, 9),
        rng
      );
    },
    "Анхаарлаа шилжүүлэх"
  );

  const dualTask = uniqueItems(
    PER_LESSON,
    (i) => {
      const a = 6 + (i % 9);
      const b = 3 + (i % 7);
      const sum = a + b;
      const product = a * b;
      return choice(
        `${a} ба ${b} — НИЙЛБЭР болон ҮРЖВЭРИЙГ нь зэрэг бод. Нийлбэр нь ${sum} бол үржвэр нь хэд вэ?`,
        String(product),
        numberDistractors(product, rng, 11),
        rng
      );
    },
    "Хоёр үйлдлийг зэрэг хийх"
  );

  const sprint30 = uniqueItems(
    PER_LESSON,
    (i) => {
      const a = 20 + i * 6;
      const b = 8 + (i % 9);
      const answer = a - b;
      return choice(`⏱ 30 секунд: ${a} − ${b} = ?`, String(answer), numberDistractors(answer, rng), rng);
    },
    "30 секундын сорил"
  );

  const sprint60 = uniqueItems(
    PER_LESSON,
    (i) => {
      const a = 4 + (i % 9);
      const b = 3 + (i % 8);
      const c = 5 + (i % 6);
      const answer = a * b + c;
      return choice(
        `⏱ 60 секунд: ${a} × ${b} + ${c} = ?`,
        String(answer),
        numberDistractors(answer, rng, 12),
        rng
      );
    },
    "60 секундын сорил"
  );

  const tenQuestions = uniqueItems(
    PER_LESSON,
    (i) => {
      const kinds = i % 4;
      if (kinds === 0) {
        const a = 30 + i * 4;
        return choice(`${a} тоо тэгш үү, сондгой юу?`, a % 2 === 0 ? "Тэгш" : "Сондгой", [a % 2 === 0 ? "Сондгой" : "Тэгш", "Аль нь ч биш", "Хоёулаа"], rng);
      }
      if (kinds === 1) {
        const a = 7 + i;
        const b = 6 + (i % 5);
        return choice(`${a} + ${b} = ?`, String(a + b), numberDistractors(a + b, rng, 7), rng);
      }
      if (kinds === 2) {
        const start = 4 + i;
        const step = 3 + (i % 4);
        const items = [start, start + step, start + step * 2];
        return choice(`${items.join(", ")}, ? — дараагийнх нь хэд вэ?`, String(start + step * 3), numberDistractors(start + step * 3, rng, 6), rng);
      }
      const from = i % 4;
      const to = (from + 1) % 4;
      return choice(`${DIRS[from]} сумыг 90° цагийн зүүний дагуу эргүүлбэл?`, DIRS[to], DIRS.filter((dir) => dir !== DIRS[to]), rng);
    },
    "10 асуултын сорил"
  );

  const boss = uniqueItems(
    PER_LESSON,
    (i) => {
      const packs = 3 + (i % 6);
      const each = 5 + (i % 5);
      const used = 4 + (i % 7);
      const answer = packs * each - used;
      return choice(
        `👑 ${packs} багцад ${each}-аар наалт байв. ${used}-ыг нь наасан. Хэд үлдэв?`,
        String(answer),
        numberDistractors(answer, rng, 10),
        rng
      );
    },
    "Level Boss Challenge"
  );

  return [
    {
      title: "Бүлэг 1: Хурдан сэтгэлгээ",
      lessons: [
        { title: "Хурдан тооцоолол", xp: 12, explanation: "Үржвэрийн хүснэгт цээжтэй бол бодохгүй, санана.", items: fastMath },
        { title: "Хурдан ангилал", xp: 12, explanation: "Гурвуулангийнх нь НИЙТЛЭГ шинжийг ол.", items: fastSort },
        { title: "Хурдан шийдвэр", xp: 12, explanation: "Эхлээд орны тоог хар — хурдан шүүнэ.", items: fastDecide },
        { title: "Reaction Challenge", xp: 14, explanation: "Зүүнээс баруун тийш нэг л удаа гүйлгэж хар.", items: reaction },
      ],
    },
    {
      title: "Бүлэг 2: Санах + бодох",
      lessons: [
        { title: "Санаж дараалуулах", xp: 12, explanation: "Хамгийн жижгийг нь олоод дараа нь үлдсэнээс дахин.", items: orderRecall },
        { title: "Олон мэдээлэл боловсруулах", xp: 14, explanation: "Эхлээд бүлэг бүрийг бод, дараа нь үлдсэнийг нэм.", items: multiInfo },
        { title: "Анхаарлаа шилжүүлэх", xp: 14, explanation: "Эхлээд ДҮРМИЙГ шалга, дараа нь бод.", items: switchTask },
        { title: "Хоёр үйлдлийг зэрэг хийх", xp: 14, explanation: "Нэгийг нь бодоод санаж байж нөгөөг нь бод.", items: dualTask },
      ],
    },
    {
      title: "Бүлэг 3: Challenge",
      lessons: [
        { title: "30 секундын сорил", xp: 14, explanation: "Хасахдаа аравтаас зээлэхээ мартуузай.", items: sprint30 },
        { title: "60 секундын сорил", xp: 14, explanation: "Эхлээд үржүүл, дараа нь нэм — дараалал чухал.", items: sprint60 },
        { title: "10 асуултын сорил", xp: 16, explanation: "Асуулт бүр өөр төрөлтэй — юу асууж байгааг эхлээд унш.", items: tenQuestions },
        { title: "Level Boss Challenge", xp: 20, explanation: "Олон алхамт: үржүүлээд дараа нь хас.", items: boss },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Курсын тодорхойлолтууд
// ---------------------------------------------------------------------------

function buildCourses(): CourseSpec[] {
  return [
    {
      slug: "math-foundations",
      title: "Математикийн суурь",
      titleEn: "Math Foundations",
      description:
        "Тооны орон, дөрвөн үйлдэл, толгойгоор бодох чадвар. Дараагийн бүх " +
        "математикийн суурь энд тавигдана.",
      descriptionEn:
        "Place value, the four operations and mental arithmetic — the base " +
        "every later maths topic stands on.",
      icon: "calculator",
      color: "sky",
      units: mathFoundations(),
    },
    {
      slug: "math-problem-solving",
      title: "Математик бодлого",
      titleEn: "Math Problem Solving",
      description:
        "Өгүүлбэртэй бодлогыг задалж, зөв үйлдлээ сонгож, амьдрал дээрх " +
        "мөнгө, цаг, хэмжээсийг тооцож сурна.",
      descriptionEn:
        "Break down word problems, choose the right operation and handle " +
        "real-life money, time and measurement.",
      icon: "lightbulb",
      color: "emerald",
      units: mathProblems(),
    },
    {
      slug: "iq-training",
      title: "IQ хөгжүүлэх",
      titleEn: "IQ Training",
      description:
        "Хэв маягийг таних, нарийн ажиглах, санах ойгоо сургах — сэтгэхүйн " +
        "хурдыг өсгөх дасгалууд.",
      descriptionEn:
        "Spot patterns, observe closely and train memory — exercises that " +
        "raise thinking speed.",
      icon: "brain",
      color: "violet",
      units: iqTraining(),
    },
    {
      slug: "critical-thinking",
      title: "Шүүмжлэлт сэтгэлгээ",
      titleEn: "Critical Thinking",
      description:
        "Шалтгаан, үр дагаврыг ялгах, баримтыг таамгаас салгах, шийдвэрээ " +
        "тайлбарлаж сурах.",
      descriptionEn:
        "Tell cause from effect, fact from guess, and learn to explain the " +
        "reasoning behind a decision.",
      icon: "target",
      color: "amber",
      units: criticalThinking(),
    },
    {
      slug: "spatial-thinking",
      title: "Орон зайн сэтгэлгээ",
      titleEn: "Spatial Thinking",
      description:
        "Дүрсийг эргүүлэх, нийлүүлэх, задлах, хавтгайгаас биет төсөөлөх — " +
        "орон зайн төсөөллийн дасгалууд.",
      descriptionEn:
        "Rotate, combine and split shapes, and imagine solids from flat " +
        "nets — spatial imagination training.",
      icon: "shapes",
      color: "teal",
      units: spatialThinking(),
    },
    {
      slug: "brain-challenge",
      title: "Сэтгэхүйн сорил",
      titleEn: "Brain Challenge",
      description:
        "Хугацаатай сорилууд: хурдан тооцоолол, анхаарал шилжүүлэх, олон " +
        "мэдээллийг зэрэг барих.",
      descriptionEn:
        "Timed challenges: fast arithmetic, task switching and holding " +
        "several pieces of information at once.",
      icon: "rocket",
      color: "rose",
      units: brainChallenge(),
    },
  ];
}

// ---------------------------------------------------------------------------
// Санд бичих
// ---------------------------------------------------------------------------

async function main() {
  console.log("Дасгалуудыг үүсгэж шалгаж байна…");

  const specs = buildCourses();
  const unitCount = specs.reduce((sum, course) => sum + course.units.length, 0);
  const lessonList = specs.flatMap((course) => course.units.flatMap((unit) => unit.lessons));
  const exerciseCount = lessonList.reduce((sum, lesson) => sum + lesson.items.length, 0);

  console.log(
    `✓ ${specs.length} курс, ${unitCount} бүлэг, ${lessonList.length} хичээл, ` +
      `${exerciseCount} дасгал — бүгд тэнцлээ`
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

    let added = 0;
    let replaced = 0;
    let written = 0;

    for (const spec of specs) {
      const [course] = await db
        .select({ slug: courses.slug, status: courses.status })
        .from(courses)
        .where(eq(courses.slug, spec.slug))
        .limit(1);

      if (!course) {
        await db.insert(courses).values({
          slug: spec.slug,
          title: spec.title,
          titleEn: spec.titleEn,
          description: spec.description,
          descriptionEn: spec.descriptionEn,
          icon: spec.icon,
          color: spec.color,
          school: SCHOOL,
          schools: [SCHOOL],
          status: "active",
        });
        console.log(`  «${spec.title}» курс үүслээ.`);
      } else if (course.status !== "active") {
        await db
          .update(courses)
          .set({ status: "active", updatedAt: new Date() })
          .where(eq(courses.slug, spec.slug));
      }

      for (const [unitIndex, unitSpec] of spec.units.entries()) {
        /*
         * ⚠ Бүлгийг нэрээр нь ОЛОOД байвал ДАХИН ҮҮСГЭХГҮЙ: бүлгийн ID
         * солигдвол доторх хичээлүүд шинэ ID авч, `lesson_progress`-ийн
         * холбоо тасарч сурагчийн явц алга болно.
         */
        const [existingUnit] = await db
          .select({ id: units.id })
          .from(units)
          .where(and(eq(units.courseSlug, spec.slug), eq(units.title, unitSpec.title)))
          .limit(1);

        let unitId: string;
        if (existingUnit) {
          unitId = existingUnit.id;
        } else {
          const [created] = await db
            .insert(units)
            .values({
              courseSlug: spec.slug,
              title: unitSpec.title,
              color: spec.color,
              sortOrder: unitIndex,
              createdBy: owner.uid,
            })
            .returning({ id: units.id });
          unitId = created.id;
        }

        const existingLessons = await db
          .select({ id: lessons.id, title: lessons.title, sortOrder: lessons.sortOrder })
          .from(lessons)
          .where(eq(lessons.unitId, unitId));
        const byTitle = new Map(existingLessons.map((row) => [row.title, row]));
        let order = existingLessons.reduce((max, row) => Math.max(max, row.sortOrder + 1), 0);

        for (const lesson of unitSpec.lessons) {
          const found = byTitle.get(lesson.title);
          if (found && !force) continue;

          let lessonId: string;

          if (found) {
            lessonId = found.id;
            // ⚠ Хичээлийг ХАДГАЛНА (явц нь хичээлийн түвшинд) — дасгалыг сольно.
            await db.update(lessons).set({ xpReward: lesson.xp }).where(eq(lessons.id, lessonId));
            await db.delete(exercises).where(eq(exercises.lessonId, lessonId));
            replaced += 1;
          } else {
            lessonId = crypto.randomUUID();
            await db.insert(lessons).values({
              id: lessonId,
              unitId,
              title: lesson.title,
              xpReward: lesson.xp,
              sortOrder: order++,
              createdBy: owner.uid,
            });
            added += 1;
          }

          for (const [index, item] of lesson.items.entries()) {
            await db.insert(exercises).values({
              lessonId,
              type: "choice",
              prompt: item.prompt,
              options: item.options,
              correctOptionId: item.correctId,
              grid: null,
              explanation: lesson.explanation,
              sortOrder: index,
              createdBy: owner.uid,
            });
            written += 1;
          }
        }
      }
    }

    const parts: string[] = [];
    if (added > 0) parts.push(`${added} хичээл нэмэгдлээ`);
    if (replaced > 0) parts.push(`${replaced} хичээл шинэчлэгдлээ`);

    console.log(
      parts.length === 0
        ? "Бүх хичээл аль хэдийн байна — юу ч өөрчлөөгүй.\n" +
            "Шинэчлэх бол: npm run seed:kids710 -- <email> --force"
        : `✅ Kids 7-10 — ${parts.join(", ")}. Нийт ${written} дасгал бичигдлээ.`
    );
  } finally {
    await pool.end();
  }
}

void main();
