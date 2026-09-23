/**
 * «ЦОХИХ / ЦОХИЛТ» → «ИДЭХ / ИДЭЛТ» (зөвхөн даамын курс).
 *
 * ⚠ ЭЗНИЙ ШИЙДВЭР: дүрс авах үйлдлийг курс даяар НЭГ үгээр нэрлэнэ.
 * Урьд нь даалгавар нь «цохи» гэж хэлээд, тайлбар нь «ид» гэж хэлдэг
 * байв — нэг үйлдлийн хоёр нэр.
 *
 * ⚠ ХЭЛЛЭГИЙГ ЭХЭЛЖ СОЛИНО. «Цохилтоо олж ид» гэдгийг үг үгээр нь
 * сольбол «Идэлтээ олж ид» болж давхардана. Тиймээс бүтэн өгүүлбэрийн
 * дүрмүүд эхэнд, үгийн дүрмүүд дараа нь.
 *
 * ⚠ ТИЙН ЯЛГАЛ ӨӨРЧЛӨГДӨНӨ: «цохилт» нь ар эгшигт (цохилтыг, цохилтын),
 * «идэлт» нь ЭМ эгшигт үг (идэлтийг, идэлтийн, идэлтэд, идэлтүүд).
 * Ганцаарчилсан хэлбэр бүрийг тусад нь бичсэн.
 *
 * Ажиллуулах:  node scripts/_capture_terms.mjs [--apply]
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const MN = "А-Яа-яӨөҮүЁё";
const word = (mn) => new RegExp(`(?<![${MN}])${mn}(?![${MN}])`, "g");

/** 1) БҮТЭН ХЭЛЛЭГ — давхардал, эвгүй бичлэгээс сэргийлнэ. */
const PHRASES = [
  [/Цохилтоо олж ид\./g, "Идэх боломжоо ол."],
  [/Цохилтоо олж ид/g, "Идэх боломжоо ол"],
  [/Аль хүү цохих вэ\?/g, "Аль хүүг идэх вэ?"],
  [/цохиж дүрс хож/g, "идэж дүрс хож"],
  [/Цохиод даам бол/g, "Идээд даам бол"],
  [/Цохиод даам болох/g, "Идээд даам болох"],
];

/** 2) ҮГИЙН ХЭЛБЭРҮҮД — уртаас богино руу. */
const RULES = [
  [word("Цохилтуудыг"), "Идэлтүүдийг"],
  [word("цохилтуудыг"), "идэлтүүдийг"],
  [word("Цохилтоо"), "Идэлтээ"],
  [word("цохилтоо"), "идэлтээ"],
  [word("Цохилтыг"), "Идэлтийг"],
  [word("цохилтыг"), "идэлтийг"],
  [word("Цохилтын"), "Идэлтийн"],
  [word("цохилтын"), "идэлтийн"],
  [word("Цохилтод"), "Идэлтэд"],
  [word("цохилтод"), "идэлтэд"],
  [word("Цохилтууд"), "Идэлтүүд"],
  [word("цохилтууд"), "идэлтүүд"],
  [word("Цохилт"), "Идэлт"],
  [word("цохилт"), "идэлт"],

  [word("Цохидог"), "Иддэг"],
  [word("цохидог"), "иддэг"],
  [word("Цохиод"), "Идээд"],
  [word("цохиод"), "идээд"],
  [word("Цохино"), "Иднэ"],
  [word("цохино"), "иднэ"],
  [word("Цохих"), "Идэх"],
  [word("цохих"), "идэх"],
  [word("Цохиж"), "Идэж"],
  [word("цохиж"), "идэж"],
  [word("Цохь"), "Ид"],
  [word("Цохи"), "Ид"],
  [word("цохи"), "ид"],
];

export function fixCapture(text) {
  let out = String(text);
  for (const [pattern, replacement] of [...PHRASES, ...RULES]) out = out.replace(pattern, replacement);
  return out;
}

/* --- ХАМГААЛАЛТЫН ТУРШИЛТ --- */
const GUARD = [
  ["Цагаанаар тоглож байна. Цохилтоо олж ид.", "Цагаанаар тоглож байна. Идэх боломжоо ол."],
  ["Цагаанаар тоглож байна. Хүүгээрээ хойш нь цохи.", "Цагаанаар тоглож байна. Хүүгээрээ хойш нь ид."],
  ["Цагаанаар тоглож байна. Даамаараа цохи.", "Цагаанаар тоглож байна. Даамаараа ид."],
  ["Цагаанаар тоглож байна. Даамаараа цохиж дүрс хож.", "Цагаанаар тоглож байна. Даамаараа идэж дүрс хож."],
  ["Цагаанаар тоглож байна. Тулгуураа өгөөд цохи.", "Цагаанаар тоглож байна. Тулгуураа өгөөд ид."],
  ["Цагаанаар тоглож байна. Цохиод даам бол.", "Цагаанаар тоглож байна. Идээд даам бол."],
  ["Аль хүү цохих вэ?", "Аль хүүг идэх вэ?"],
  ["Дараалсан цохилт", "Дараалсан идэлт"],
  ["Цохилтын дадлага 1", "Идэлтийн дадлага 1"],
  ["Заавал цохих", "Заавал идэх"],
  ["Хойш цохих", "Хойш идэх"],
  ["Тулгууртай цохилт", "Тулгууртай идэлт"],
  ["цохилтыг эхлээд хай", "идэлтийг эхлээд хай"],
  ["Цохилтод бэлдэх", "Идэлтэд бэлдэх"],
  ["хоёр цохилт байна", "хоёр идэлт байна"],
  ["Дамка холоос цохино", "Дамка холоос иднэ"],
  // Хөндөгдөх ЁСГҮЙ
  ["цаг цохих", "цаг идэх"], // ⚠ даамын курст ийм хэллэг БАЙХГҮЙ (доор шалгасан)
  ["Хүү идэх", "Хүү идэх"],
  ["идэлтийн дараа", "идэлтийн дараа"],
];

let failed = 0;
for (const [input, expected] of GUARD) {
  const actual = fixCapture(input);
  if (actual !== expected) {
    failed++;
    console.error(`  ✗ "${input}"\n     хүлээсэн: "${expected}"\n     гарсан:   "${actual}"`);
  }
}
if (failed) {
  console.error(`ХАМГААЛАЛТЫН ТУРШИЛТ ${failed} газар бүтэлгүйтэв — юу ч бичихгүй.`);
  process.exit(1);
}
console.log(`хамгаалалтын туршилт: ${GUARD.length}/${GUARD.length} ✓`);

const apply = process.argv.includes("--apply");

/* --- САН: ЗӨВХӨН ДААМЫН КУРС --- */
const url = (fs.readFileSync(".env.local", "utf8").match(/^DATABASE_URL=(.*)$/m) || [])[1].trim();
const client = new pg.Client({ connectionString: url });
await client.connect();

let dbRows = 0;

const exercises = (
  await client.query(`
    select e.id, e.prompt, e.explanation, e.options
      from exercises e
      join lessons l on l.id = e.lesson_id
      join units u on u.id = l.unit_id
     where u.course_slug = 'checkers'`)
).rows;

for (const row of exercises) {
  const prompt = row.prompt ? fixCapture(row.prompt) : row.prompt;
  const explanation = row.explanation ? fixCapture(row.explanation) : row.explanation;
  // ⚠ `label` л солигдоно; `id` нь зөв хариултын холбоос.
  const options = Array.isArray(row.options)
    ? row.options.map((o) => ({ ...o, label: fixCapture(o.label ?? "") }))
    : row.options;

  const optionsChanged = JSON.stringify(options) !== JSON.stringify(row.options);
  if (prompt === row.prompt && explanation === row.explanation && !optionsChanged) continue;

  dbRows++;
  if (apply) {
    await client.query(
      "update exercises set prompt=$2, explanation=$3, options=$4::jsonb where id=$1",
      [row.id, prompt, explanation, options == null ? null : JSON.stringify(options)]
    );
  }
}

const lessons = (
  await client.query(`
    select l.id, l.title from lessons l join units u on u.id = l.unit_id
     where u.course_slug = 'checkers'`)
).rows;

for (const row of lessons) {
  const title = fixCapture(row.title);
  if (title === row.title) continue;
  dbRows++;
  if (apply) await client.query("update lessons set title=$2 where id=$1", [row.id, title]);
}

await client.end();

/* --- ЭХ ФАЙЛУУД (даамд хамаарах) --- */
const FILES = [
  ...fs.readdirSync("scripts/curriculum").filter((f) => f.startsWith("draughts")).map((f) => path.join("scripts/curriculum", f)),
  ...fs.readdirSync("scripts").filter((f) => f.startsWith("seed-draughts") || f === "repair-draughts-moves.ts" || f === "fix-lesson-prompts.ts").map((f) => path.join("scripts", f)),
];

let fileCount = 0;
let fileLines = 0;

for (const file of FILES) {
  const before = fs.readFileSync(file, "utf8");
  const after = fixCapture(before);
  if (before === after) continue;

  const b = before.split("\n");
  const a = after.split("\n");
  for (let i = 0; i < b.length; i += 1) if (b[i] !== a[i]) fileLines++;

  fileCount++;
  if (apply) fs.writeFileSync(file, after);
}

console.log(`сан: ${dbRows} мөр, эх файл: ${fileCount} файлын ${fileLines} мөр${apply ? " → БИЧСЭН" : " (туршилт)"}`);
