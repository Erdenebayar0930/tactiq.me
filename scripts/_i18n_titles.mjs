/**
 * ХИЧЭЭЛ, НЭГЖ, КУРСЫН АНГЛИ ГАРЧГИЙГ БӨГЛӨНӨ.
 *
 * ⚠ ДҮРМИЙН ХҮСНЭГТЭЭР: гарчгууд нь «<хэсэг> <тоо>» гэсэн дэг журамтай
 * хэлбэртэй (жишээ нь «9×9 хүнд 14»). Тоог ХӨНДӨХГҮЙ, зөвхөн үгийг
 * хөрвүүлнэ — ингэснээр 422 гарчгийг гараар бичихэд гарах үсгийн алдаа,
 * дугаарын зөрүү бүрэн хаагдана.
 *
 * ⚠ ТААРААГҮЙ гарчгийг ОРХИНО (бичихгүй): хагас таасан орчуулга бичих
 * нь хоосон орхихоос дор — код нь хоосон үед монгол хувилбарыг
 * харуулдаг (`lib/i18n/content.ts`).
 */
import fs from "node:fs";
import pg from "pg";

const url = (fs.readFileSync(".env.local", "utf8").match(/^DATABASE_URL=(.*)$/m) || [])[1].trim();

/** Үг → англи. Урт хэллэгийг ЭХЭЛЖ таруулна (дэс дараалал чухал). */
const WORDS = [
  ["4×4 хөнгөн", "4×4 easy"],
  ["4×4 дунд", "4×4 medium"],
  ["4×4 хүнд", "4×4 hard"],
  ["6×6 хөнгөн", "6×6 easy"],
  ["6×6 дунд", "6×6 medium"],
  ["6×6 хүнд", "6×6 hard"],
  ["9×9 хөнгөн", "9×9 easy"],
  ["9×9 дунд", "9×9 medium"],
  ["9×9 хүнд", "9×9 hard"],
  ["Хос олох", "Find the pair"],
  ["Хэв маяг", "Pattern"],
  ["Харааны", "Visual"],
  ["Дараалал", "Sequence"],
  ["Нонограм", "Nonogram"],
  ["Гулсах", "Sliding"],
  ["Тоолох", "Counting"],
  ["Хөнгөн", "Easy"],
  ["Хөзөр", "Cards"],
  ["Логик", "Logic"],
  ["Хүнд", "Hard"],
  ["Дунд", "Medium"],
  ["Тоо", "Numbers"],
  ["Үг", "Word"],
];

/** Бүтэн гарчгийн онцгой хувилбарууд. */
const EXACT = new Map([
  ["Судоку гэж юу вэ?", "What is sudoku?"],
  ["Хайрцаг гэж юу вэ?", "What is a box?"],
  ["4×4 — хөнгөнөөс хүнд", "4×4 — from easy to hard"],
  ["6×6 — хайрцаг дөрвөлжин биш", "6×6 — the boxes are not square"],
  ["9×9 — жинхэнэ судоку", "9×9 — real sudoku"],
  ["Дүрэм (4×4)", "Rules (4×4)"],
  ["Хөнгөн", "Easy"],
  ["Дунд", "Medium"],
  ["Хүнд", "Hard"],
]);

const CYRILLIC = /[А-Яа-яӨөҮүЁё]/;

function translateTitle(title) {
  const exact = EXACT.get(title.trim());
  if (exact) return exact;

  /* «<үг> <тоо>» ба «<үг> <тоо>–<тоо>» хоёуланг НЭГ дүрмээр. */
  const m = title.trim().match(/^(.+?)\s+(\d+(?:\s*[–-]\s*\d+)?)$/);
  if (!m) return CYRILLIC.test(title) ? null : title; // англи гарчиг — хэвээр
  const [, head, tail] = m;

  for (const [mn, en] of WORDS) {
    if (head.toLowerCase() === mn.toLowerCase()) return `${en} ${tail}`;
  }
  return null;
}

const client = new pg.Client({ connectionString: url });
await client.connect();

const apply = process.argv.includes("--apply");
const report = { units: [0, 0], lessons: [0, 0], courses: [0, 0] };

for (const [table, key] of [["units", "units"], ["lessons", "lessons"]]) {
  const rows = (
    await client.query(`select id, title from ${table} where coalesce(title_en,'')=''`)
  ).rows;
  for (const row of rows) {
    const en = translateTitle(row.title);
    if (!en) {
      report[key][1]++;
      console.log(`  ? ${table}: ${row.title}`);
      continue;
    }
    report[key][0]++;
    if (apply) {
      await client.query(`update ${table} set title_en=$2 where id=$1`, [row.id, en]);
    }
  }
}

/* Курс — гарчиг ба тайлбар хоёуланг. */
const COURSE_EN = new Map([
  [
    "chess",
    {
      title: "Chess",
      description: "From the board, the pieces and the moves all the way to tactics — step by step.",
    },
  ],
]);
for (const row of (
  await client.query(
    "select slug, title, description from courses where coalesce(title_en,'')='' or coalesce(description_en,'')=''"
  )
).rows) {
  const en = COURSE_EN.get(row.slug);
  if (!en) {
    report.courses[1]++;
    console.log(`  ? course: ${row.slug} — ${row.title}`);
    continue;
  }
  report.courses[0]++;
  if (apply) {
    await client.query("update courses set title_en=$2, description_en=$3 where slug=$1", [
      row.slug,
      en.title,
      en.description,
    ]);
  }
}

console.log(
  `нэгж ${report.units[0]}/${report.units[0] + report.units[1]} · ` +
    `хичээл ${report.lessons[0]}/${report.lessons[0] + report.lessons[1]} · ` +
    `курс ${report.courses[0]}/${report.courses[0] + report.courses[1]}` +
    (apply ? "  → БИЧСЭН" : "  (туршилт, --apply гэж бичвэл хадгална)")
);
await client.end();
