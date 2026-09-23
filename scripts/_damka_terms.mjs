/**
 * «ДАМКА» → «ДААМ» (хаан болсон дүрсийн нэр).
 *
 * ⚠ ЭЗНИЙ ШИЙДВЭР. «Дамка» нь орос «дамка»-аас орсон үг; эзэн монгол
 * нэрийг нь хэрэглэхээр шийдсэн.
 *
 * ⚠ ТИЙН ЯЛГАЛ ӨӨРЧЛӨГДӨНӨ: «дамка» нь эгшгээр төгсдөг тул «дамканы,
 * дамкаараа» гэдэг. «Даам» нь гийгүүлэгчээр төгсдөг, ар эгшигт үг тул
 * «даамын, даамаараа, даамд, даамтай» болно. Үг бүрийг сольчихвол
 * «даамны» гэсэн буруу хэлбэр гарна — тиймээс хэлбэр бүрийг тусад нь
 * бичсэн.
 *
 * ⚠ ТОГЛООМЫН НЭРТЭЙ ДАВХАЦНА: «даам» нь тоглоомын нэр ч мөн тул
 * «даамын хөлөг» гэдэг нь хоёр утгатай болно. Энэ нь эзний мэдэж байгаа
 * зөрүү — код нь үүнийг шийдэхгүй.
 *
 * Ажиллуулах:  node scripts/_damka_terms.mjs [--apply]
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const MN = "А-Яа-яӨөҮүЁё";
const word = (mn) => new RegExp(`(?<![${MN}])${mn}(?![${MN}])`, "g");

/** ⚠ УРТААС БОГИНО руу: «дамка»-г эхэлж тавибал тийн ялгал эвдэрнэ. */
const RULES = [
  [word("Дамкаараа"), "Даамаараа"],
  [word("дамкаараа"), "даамаараа"],
  [word("Дамкатай"), "Даамтай"],
  [word("дамкатай"), "даамтай"],
  [word("Дамкаас"), "Даамаас"],
  [word("дамкаас"), "даамаас"],
  [word("Дамкаар"), "Даамаар"],
  [word("дамкаар"), "даамаар"],
  [word("Дамканууд"), "Даамнууд"],
  [word("дамканууд"), "даамнууд"],
  [word("Дамканы"), "Даамын"],
  [word("дамканы"), "даамын"],
  [word("Дамкын"), "Даамын"],
  [word("дамкын"), "даамын"],
  [word("Дамкыг"), "Даамыг"],
  [word("дамкыг"), "даамыг"],
  [word("Дамкад"), "Даамд"],
  [word("дамкад"), "даамд"],
  [word("Дамкаа"), "Даамаа"],
  [word("дамкаа"), "даамаа"],
  [word("Дамка"), "Даам"],
  [word("дамка"), "даам"],
];

export function fixDamka(text) {
  let out = String(text);
  for (const [pattern, replacement] of RULES) out = out.replace(pattern, replacement);
  return out;
}

/* --- ХАМГААЛАЛТЫН ТУРШИЛТ --- */
const GUARD = [
  ["Дамка ташуу шугамаар явна", "Даам ташуу шугамаар явна"],
  ["дамка болсон хүү", "даам болсон хүү"],
  ["Дамканы ташуу шугамыг тоол", "Даамын ташуу шугамыг тоол"],
  ["дамкын хүч", "даамын хүч"],
  ["Дамкаараа цохи", "Даамаараа цохи"],
  ["хүүгээ дамка болго", "хүүгээ даам болго"],
  ["дамкатай тоглох", "даамтай тоглох"],
  // Хөндөгдөх ЁСГҮЙ — «даам» аль хэдийн зөв, «дамжих» нь өөр үг
  ["Даам ташуу явна", "Даам ташуу явна"],
  ["дамжин өнгөрөх", "дамжин өнгөрөх"],
  ["дамжуулагч", "дамжуулагч"],
  ["Даамын хөлөг", "Даамын хөлөг"],
];

let failed = 0;
for (const [input, expected] of GUARD) {
  const actual = fixDamka(input);
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

/* --- 1. САН (зөвхөн даамын курс) --- */
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
  const prompt = row.prompt ? fixDamka(row.prompt) : row.prompt;
  const explanation = row.explanation ? fixDamka(row.explanation) : row.explanation;
  // ⚠ `label`-ыг л зална, `id`-г ХЭЗЭЭ Ч БИШ: зөв хариулт түүгээр холбогдоно.
  const options = Array.isArray(row.options)
    ? row.options.map((option) => ({ ...option, label: fixDamka(option.label ?? "") }))
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
  const title = fixDamka(row.title);
  if (title === row.title) continue;
  dbRows++;
  if (apply) await client.query("update lessons set title=$2 where id=$1", [row.id, title]);
}

await client.end();

/* --- 2. ЭХ ФАЙЛУУД --- */
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|md)$/.test(entry.name)) out.push(full);
  }
  return out;
}

let fileCount = 0;
let fileLines = 0;

for (const file of [...walk("scripts"), ...walk("src"), ...walk("docs")]) {
  // ⚠ Дүрмийн файл өөрөө ХӨНДӨГДӨХГҮЙ: дотор нь «дамка» гэсэн ХАЙЛТЫН
  // хэв байгаа тул сольчихвол дүрэм өөрөө устана.
  if (file.endsWith("_damka_terms.mjs")) continue;

  const before = fs.readFileSync(file, "utf8");
  const after = fixDamka(before);
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
