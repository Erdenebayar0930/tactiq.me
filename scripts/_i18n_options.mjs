/**
 * СОНГОЛТЫН АНГЛИ ХУВИЛБАР (`options_en`).
 *
 * ⚠ `id`-аар ТААРУУЛНА, дараалалаар БИШ: зөв хариулт нь
 * `correct_option_id` дээр тулгуурладаг (`lib/i18n/content.ts`-ийн
 * `localizedOptions`). Дарааллаар тааруулбал англи хэл дээрх сурагч
 * ӨӨР хариултыг зөв гэж уншина.
 *
 * ⚠ Зөвхөн ТООН БИШ шошгыг орчуулна: «7», «2×2» гэх мэт нь хэлнээс
 * хамаарахгүй тул хэвээр дамжина.
 */
import fs from "node:fs";
import pg from "pg";

const url = (fs.readFileSync(".env.local", "utf8").match(/^DATABASE_URL=(.*)$/m) || [])[1].trim();

const LABELS = new Map([
  ["1-ээс 4", "1 to 4"],
  ["0-ээс 4", "0 to 4"],
  ["1-ээс 9", "1 to 9"],
  ["1-ээс 16", "1 to 16"],
  ["2 мөр × 3 багана", "2 rows × 3 columns"],
  ["Мөр, багана, хайрцаг бүрд тоо давтагдахгүй", "No number repeats in any row, column or box"],
  ["Зөвхөн мөрөнд тоо давтагдахгүй", "A number may not repeat only within a row"],
  ["Тоонуудыг өсөхөөр эрэмбэлнэ", "The numbers are sorted in increasing order"],
  ["Хамгийн их тоог дунд нь тавина", "The largest number goes in the middle"],
  ["Өөрчлөгдөхгүй", "It stays the same"],
  ["Нэгээр багасна", "It goes down by one"],
  ["Нэгээр нэмэгдэнэ", "It goes up by one"],
  ["Хоёр дахин болно", "It doubles"],
]);

const CYRILLIC = /[А-Яа-яӨөҮүЁё]/;

const client = new pg.Client({ connectionString: url });
await client.connect();

const apply = process.argv.includes("--apply");
const rows = (
  await client.query("select id, options from exercises where options is not null and options_en is null")
).rows;

let done = 0;
const missing = new Set();

for (const row of rows) {
  const translated = row.options.map((option) => {
    const label = String(option.label);
    if (!CYRILLIC.test(label)) return option; // тоо, хэмжээ — хэвээр
    const en = LABELS.get(label.trim());
    if (!en) missing.add(label);
    return en ? { ...option, label: en } : option;
  });

  done++;
  if (apply) {
    /* ⚠ `JSON.stringify` — node-postgres нь JS массивыг PG массив болгодог
       тул jsonb багана руу мөрөөр дамжуулах ёстой. */
    await client.query("update exercises set options_en=$2::jsonb where id=$1", [
      row.id,
      JSON.stringify(translated),
    ]);
  }
}

console.log(`мөр ${done}${apply ? "  → БИЧСЭН" : "  (туршилт)"}`);
if (missing.size) {
  console.log("ОРЧУУЛГА ДУТУУ:");
  for (const label of missing) console.log("  ?", label);
}
await client.end();
