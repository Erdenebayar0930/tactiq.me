/**
 * КОМБИНАЦИД «ЦОХИЛТ» ГЭДЭГ НЭРИЙГ СЭРГЭЭНЭ.
 *
 * ⚠ ЮУ БОЛСОН БЭ: «цохих → идэх» гэсэн нэгтгэлийг би ХЭТЭРХИЙ ӨРГӨН
 * хэрэглэсэн. Даамд хоёр өөр ойлголт бий:
 *
 *   • ИДЭХ    — нэг нүүдлээр дүрс авах (заавал идэх дүрэм);
 *   • ЦОХИЛТ  — дүрсээ зориуд өгөөд илүүг эргүүлж авдаг КОМБИНАЦИ
 *               (тулгууртай цохилт, 2–3 нүүдлийн цохилт).
 *
 * Хоёрдахийг «идэлт» гэвэл золиос гаргадаг тактикийн санаа нь энгийн
 * дүрс авалттай ялгагдахаа болино.
 *
 * ⚠ ӨРГӨН ДҮРЭМ БИШ, ТОДОРХОЙ ХОС: энэ ялгаа нь үг биш КОНТЕКСТЭЭР
 * тодорхойлогддог тул автомат дүрэм тавих аргагүй. Дасгалын ТӨРӨЛ нь
 * хамгийн найдвартай шалгуур болсон: `draughts-puzzle` = комбинаци,
 * `draughts-move` = нэг нүүдлийн идэлт. Доорх хосуудыг тэр ялгаанд
 * тулгуурлан гараар сонгосон.
 *
 * Ажиллуулах:  node scripts/_combo_terms.mjs [--apply]
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

/** [хуучин, шинэ] — ЯГ тэр мөрийг л солино. */
const PAIRS = [
  // --- Хичээлийн нэрс (бүгд `draughts-puzzle` дасгалтай) ---
  ["Тулгууртай идэлт", "Тулгууртай цохилт"],
  ["Буцаан идэлт", "Буцаан цохилт"],
  ["Идэлтийн дараах байрлал", "Цохилтын дараах байрлал"],
  ["Идэлтэд татах", "Цохилтод татах"],
  ["Хүчээр идэлт хийлгэх", "Хүчээр цохилт хийлгэх"],

  // --- Даалгаврууд ---
  ["Цагаанаар тоглож байна. Тулгуураа өгөөд ид.", "Цагаанаар тоглож байна. Тулгуураа өгөөд цохи."],
  ["Идэлтийн дараа юуг хамгийн түрүүнд шалгах вэ?", "Цохилтын дараа юуг хамгийн түрүүнд шалгах вэ?"],
  ["Өөрийн хүү идэлтэд саад болвол юу хийх вэ?", "Өөрийн хүү цохилтод саад болвол юу хийх вэ?"],

  // --- Тайлбарууд ---
  [
    "Идэлт дууссаны дараа дүрс нь ил үлддэг. Тиймээс «идээд дараа нь юу?» гэдгийг ямагт тооцно.",
    "Цохилт дууссаны дараа дүрс нь ил үлддэг. Тиймээс «цохиод дараа нь юу?» гэдгийг ямагт тооцно.",
  ],
  [
    "Идэлтийн зам дээрх ӨӨРИЙН хүү нь хамгийн их анзаарагддаггүй саад.",
    "Цохилтын зам дээрх ӨӨРИЙН хүү нь хамгийн их анзаарагддаггүй саад.",
  ],
  [
    "Сул тал бол тактикийн «хаяг»: идэлт ямагт хамгаалалтгүй зүйл дээр тогтдог.",
    "Сул тал бол тактикийн «хаяг»: цохилт ямагт хамгаалалтгүй зүйл дээр тогтдог.",
  ],
  [
    "Хамгаалалтгүй цоорхой нь тулгууртай идэлтийн үндсэн бай болдог.",
    "Хамгаалалтгүй цоорхой нь тулгууртай цохилтын үндсэн бай болдог.",
  ],

  // --- Сонголтын шошго ---
  ["Идэлтээ болих", "Цохилтоо болих"],
];

export function fixCombo(text) {
  let out = String(text);
  for (const [from, to] of PAIRS) out = out.split(from).join(to);
  return out;
}

/* --- ХАМГААЛАЛТЫН ТУРШИЛТ --- */
const GUARD = [
  ["Тулгууртай идэлт", "Тулгууртай цохилт"],
  [
    "Цагаанаар тоглож байна. Тулгуураа өгөөд ид.",
    "Цагаанаар тоглож байна. Тулгуураа өгөөд цохи.",
  ],
  // ⚠ ЭНГИЙН ИДЭЛТ ХЭВЭЭР — «заавал идэх» дүрэм нь комбинаци БИШ
  ["Идэлт заавал байдаг нь даамын гол дүрэм", "Идэлт заавал байдаг нь даамын гол дүрэм"],
  ["Цагаанаар тоглож байна. Идэх боломжоо ол.", "Цагаанаар тоглож байна. Идэх боломжоо ол."],
  ["Хоёр өөр идэлт байвал аль нь вэ?", "Хоёр өөр идэлт байвал аль нь вэ?"],
  ["Идэлтийн дадлага 1", "Идэлтийн дадлага 1"],
  ["Дараалсан идэлт", "Дараалсан идэлт"],
  ["Хойш идэлтийн дадлага", "Хойш идэлтийн дадлага"],
];

let failed = 0;
for (const [input, expected] of GUARD) {
  const actual = fixCombo(input);
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

/* --- САН --- */
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
  const prompt = row.prompt ? fixCombo(row.prompt) : row.prompt;
  const explanation = row.explanation ? fixCombo(row.explanation) : row.explanation;
  // ⚠ `label` л солигдоно; `id` нь зөв хариултын холбоос.
  const options = Array.isArray(row.options)
    ? row.options.map((o) => ({ ...o, label: fixCombo(o.label ?? "") }))
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
  const title = fixCombo(row.title);
  if (title === row.title) continue;
  dbRows++;
  if (apply) await client.query("update lessons set title=$2 where id=$1", [row.id, title]);
}

await client.end();

/* --- ЭХ ФАЙЛУУД --- */
const FILES = [
  ...fs
    .readdirSync("scripts/curriculum")
    .filter((f) => f.startsWith("draughts"))
    .map((f) => path.join("scripts/curriculum", f)),
  ...fs
    .readdirSync("scripts")
    .filter((f) => f.startsWith("seed-draughts") || f === "fix-lesson-prompts.ts")
    .map((f) => path.join("scripts", f)),
];

let fileCount = 0;
let fileLines = 0;

for (const file of FILES) {
  const before = fs.readFileSync(file, "utf8");
  const after = fixCombo(before);
  if (before === after) continue;

  const b = before.split("\n");
  const a = after.split("\n");
  for (let i = 0; i < b.length; i += 1) if (b[i] !== a[i]) fileLines++;

  fileCount++;
  if (apply) fs.writeFileSync(file, after);
}

console.log(
  `сан: ${dbRows} мөр, эх файл: ${fileCount} файлын ${fileLines} мөр${apply ? " → БИЧСЭН" : " (туршилт)"}`
);
