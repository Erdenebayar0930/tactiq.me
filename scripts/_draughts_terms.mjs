/**
 * ДААМЫН ДҮРСИЙГ «ХҮҮ» ГЭЖ НЭГТГЭНЭ.
 *
 * ⚠ ЮУ ЗАСАЖ БАЙНА ВЭ: даамын курс НЭГ дүрсийг ГУРВАН үгээр нэрлэж
 * байв — «чулуу» (433), «бэр» (166), мөн хичээлийн гарчигт «чулуу».
 * Хүүхэд «Тал бүр 20 ЧУЛУУТАЙ» гэж уншаад дараагийн хичээл дээр
 * «БЭР урагш ташуу нүүнэ» гэж уншихад тэр хоёрыг ИЖИЛ зүйл гэж
 * ойлгох арга байхгүй. Эзний шийдвэрээр эцсийн нэр нь «ХҮҮ» —
 * шатрын хүүтэй ижил, сурагчид аль хэдийн танил.
 *
 * ⚠ ЗӨВХӨН ДААМЫН КУРС (`course_slug = 'checkers'`). «Чулуу» гэдэг нь
 * ГО тоглоомын нэр томъёо ч мөн (`components/go/GoBoard.tsx`,
 * `go-move` дасгал) — түүнийг хөндвөл өөр хичээл эвдэрнэ.
 *
 * ⚠ «ДАМКА» ХЭВЭЭР: хаан болсон дүрсийг нэрлэдэг тусдаа үг бөгөөд
 * 320 газар жигд хэрэглэгдсэн. «Хүү» нь зөвхөн ЭНГИЙН дүрс.
 *
 * ⚠ «БЭРС» (шатрын хатан) ХӨНДӨГДӨХГҮЙ: `бэр` нь түүний эхлэл тул
 * үгийн ХИЛИЙГ заавал шалгана. Доорх хамгаалалтын туршилт үүнийг
 * барина.
 *
 * ⚠ ТИЙН ЯЛГАЛЫГ ШАТРЫН КУРСЭЭС ХУУЛСАН: тэнд «хүү» аль хэдийн 475
 * газар хэрэглэгдсэн бөгөөд хэлбэрүүд нь (хүүг, хүүгийн, хүүгээ,
 * хүүгээс, хүүгээр, хүүнүүд) батлагдсан. Шинээр зохиохын оронд тэр
 * загварыг ашиглав — «чулууны» → «хүүний» гэвэл шатартай зөрнө.
 *
 * ⚠ `options` (jsonb) БАГАНАГ БАС ЗАСНА. Эхний хувилбар нь зөвхөн
 * `prompt`/`explanation`-ыг заснаас болж СОНГОЛТЫН ХАРИУЛТУУД хуучин
 * үгээр үлдэж, «Дайсны ЧУЛУУН дээгүүр үсэрч…» гэсэн хариулт харагдсаар
 * байв — асуулт нь «хүү», хариулт нь «чулуу» гэсэн зөрүү үүссэн.
 * Текст агуулсан БҮХ багана: `prompt`, `explanation`, `options`,
 * `lessons.title`.
 *
 * Ажиллуулах:  node scripts/_draughts_terms.mjs [--apply]
 */
import fs from "node:fs";
import pg from "pg";

const url = (fs.readFileSync(".env.local", "utf8").match(/^DATABASE_URL=(.*)$/m) || [])[1].trim();

const MN = "А-Яа-яӨөҮүЁё";
const word = (mn) => new RegExp(`(?<![${MN}])${mn}(?![${MN}])`, "g");

/**
 * Хувиргалтууд — УРТААС БОГИНО руу.
 *
 * ⚠ Дараалал чухал: «чулуу»-г эхэлж тавибал «чулууны» нь «хүүны»
 * болж, тийн ялгал эвдэрнэ.
 */
const RULES = [
  // Тусгай хэллэг: «дайсны чулуун дээгүүр үсэрнэ»
  [/чулуун дээгүүр/g, "хүүгийн дээгүүр"],

  // --- ЧУЛУУ → ХҮҮ ---
  [word("Чулуунууд"), "Хүүнүүд"],
  [word("чулуунууд"), "хүүнүүд"],
  [word("Чулуугаа"), "Хүүгээ"],
  [word("чулуугаа"), "хүүгээ"],
  [word("Чулууны"), "Хүүгийн"],
  [word("чулууны"), "хүүгийн"],
  [word("Чулуугаар"), "Хүүгээр"],
  [word("чулуугаар"), "хүүгээр"],
  [word("Чулуутай"), "Хүүтэй"],
  [word("чулуутай"), "хүүтэй"],
  [word("Чулууг"), "Хүүг"],
  [word("чулууг"), "хүүг"],
  [word("Чулуунд"), "Хүүнд"],
  [word("чулуунд"), "хүүнд"],
  [word("Чулуу"), "Хүү"],
  [word("чулуу"), "хүү"],

  // --- БЭР → ХҮҮ (⚠ «бэрс» БИШ) ---
  [word("Бэрээрээ"), "Хүүгээрээ"],
  [word("бэрээрээ"), "хүүгээрээ"],
  [word("Бэрээс"), "Хүүгээс"],
  [word("бэрээс"), "хүүгээс"],
  [word("Бэрээ"), "Хүүгээ"],
  [word("бэрээ"), "хүүгээ"],
  [word("Бэртэй"), "Хүүтэй"],
  [word("бэртэй"), "хүүтэй"],
  [word("Бэрийн"), "Хүүгийн"],
  [word("бэрийн"), "хүүгийн"],
  [word("Бэрийг"), "Хүүг"],
  [word("бэрийг"), "хүүг"],
  [word("Бэр"), "Хүү"],
  [word("бэр"), "хүү"],
];

export function fixTerms(text) {
  let out = String(text);
  for (const [pattern, replacement] of RULES) out = out.replace(pattern, replacement);
  return out;
}

/* --- ХАМГААЛАЛТЫН ТУРШИЛТ --- */
const GUARD = [
  // Хөндөгдөх ЁСГҮЙ
  ["Бэрс хол зайнаас орлоо", "Бэрс хол зайнаас орлоо"],
  ["бэрсийг идэх", "бэрсийг идэх"],
  ["Дамка ташуу шугамаар явна", "Дамка ташуу шугамаар явна"],
  ["хүүхэд, хүүхдүүд", "хүүхэд, хүүхдүүд"],
  ["бэрхшээлийг давах", "бэрхшээлийг давах"],

  // Хувиргалт
  ["Тал бүр 20 чулуутай тоглогдоно", "Тал бүр 20 хүүтэй тоглогдоно"],
  ["Чулуунууд самбарын ямар нүдэнд", "Хүүнүүд самбарын ямар нүдэнд"],
  ["Чулууны бүтэц", "Хүүгийн бүтэц"],
  ["Гурван чулууны цуваа", "Гурван хүүгийн цуваа"],
  ["Чулуугаа зөв байрлуул", "Хүүгээ зөв байрлуул"],
  ["хамгийн олон чулуу ид", "хамгийн олон хүү ид"],
  ["Энгийн бэр хэрхэн нүүдэг вэ?", "Энгийн хүү хэрхэн нүүдэг вэ?"],
  ["Бэрээрээ хойш нь цохи", "Хүүгээрээ хойш нь цохи"],
  ["дамка бэрээс хамаагүй хүчтэй", "дамка хүүгээс хамаагүй хүчтэй"],
  ["дайсны чулуун дээгүүр үсэрнэ", "дайсны хүүгийн дээгүүр үсэрнэ"],

  // Сонголтын хариултууд (`options.label`)
  ["Дайсны чулуун дээгүүр үсэрч, ДАРААХ хоосон нүдэнд буух",
   "Дайсны хүүгийн дээгүүр үсэрч, ДАРААХ хоосон нүдэнд буух"],
  ["Хамгийн ОЛОН чулуу идэх цуваа", "Хамгийн ОЛОН хүү идэх цуваа"],
  ["Өрсөлдөгчийн бүх чулууг идэх", "Өрсөлдөгчийн бүх хүүг идэх"],

  ["Хоёр чулуугаар нүүх", "Хоёр хүүгээр нүүх"],
  ["Бэртэй харьцуулбал", "Хүүтэй харьцуулбал"],

  // Идемпотент: аль хэдийн зөв бичвэр ХЭВЭЭР
  ["Хүү урагш ташуу нүүнэ", "Хүү урагш ташуу нүүнэ"],
];

let failed = 0;
for (const [input, expected] of GUARD) {
  const actual = fixTerms(input);
  if (actual !== expected) {
    failed++;
    console.error(`  ✗ "${input}"\n     хүлээсэн: "${expected}"\n     гарсан:   "${actual}"`);
  }
}
if (failed) {
  console.error(`ХАМГААЛАЛТЫН ТУРШИЛТ ${failed} газар бүтэлгүйтэв — санд юу ч бичихгүй.`);
  process.exit(1);
}
console.log(`хамгаалалтын туршилт: ${GUARD.length}/${GUARD.length} ✓`);

/* --- САНГИЙН БИЧИЛТ (ЗӨВХӨН ДААМЫН КУРС) --- */
const apply = process.argv.includes("--apply");
const client = new pg.Client({ connectionString: url });
await client.connect();

let changed = 0;

/* Дасгалууд */
const exercises = (
  await client.query(`
    select e.id, e.prompt, e.explanation, e.options
    from exercises e
    join lessons l on l.id = e.lesson_id
    join units u on u.id = l.unit_id
    where u.course_slug = 'checkers'`)
).rows;

for (const row of exercises) {
  const prompt = row.prompt ? fixTerms(row.prompt) : row.prompt;
  const explanation = row.explanation ? fixTerms(row.explanation) : row.explanation;

  /*
   * ⚠ СОНГОЛТУУД (`options`) — `label`-ыг л зална, `id`-г ХЭЗЭЭ Ч БИШ:
   * зөв хариулт нь `correct_option_id`-аар холбогддог тул `id` өөрчлөгдвөл
   * дасгал бүхэлдээ эвдэрнэ.
   */
  const options = Array.isArray(row.options)
    ? row.options.map((option) => ({ ...option, label: fixTerms(option.label ?? "") }))
    : row.options;

  const optionsChanged = JSON.stringify(options) !== JSON.stringify(row.options);
  if (prompt === row.prompt && explanation === row.explanation && !optionsChanged) continue;

  changed++;
  if (apply) {
    await client.query(
      "update exercises set prompt=$2, explanation=$3, options=$4::jsonb where id=$1",
      [
        row.id,
        prompt,
        explanation,
        /* ⚠ `JSON.stringify` — node-postgres нь JS массивыг PG массив
           болгодог тул jsonb руу МӨРӨӨР дамжуулна. */
        options === null || options === undefined ? null : JSON.stringify(options),
      ]
    );
  }
}

/* Хичээлийн гарчиг */
const lessons = (
  await client.query(`
    select l.id, l.title
    from lessons l join units u on u.id = l.unit_id
    where u.course_slug = 'checkers'`)
).rows;

for (const row of lessons) {
  const title = fixTerms(row.title);
  if (title === row.title) continue;

  changed++;
  if (apply) {
    await client.query("update lessons set title=$2 where id=$1", [row.id, title]);
  }
}

console.log(`${changed} мөр${apply ? " → БИЧСЭН" : " (туршилт)"}`);
await client.end();
