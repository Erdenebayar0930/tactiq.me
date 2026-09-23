/**
 * SEED-ИЙН ЭХ ФАЙЛУУДЫГ ижил нэр томъёонд оруулна.
 *
 * ⚠ ЯАГААД ХЭРЭГТЭЙ ВЭ: `_draughts_terms.mjs` нь ЗӨВХӨН санг зассан.
 * Хичээл үүсгэгч файлууд «чулуу/бэр» гэж бичсэн хэвээр үлдсэн тул
 * `npm run seed:draughts*`-ийг дахин ажиллуулмагц хуучин нэр буцаж
 * ирнэ — чимээгүй ухралт.
 *
 * ⚠ Дүрмийг ЭХ СУРВАЛЖААС нь импортлов: хоёр газар хуулбарлавал нэг нь
 * хоцорч, сан ба эх файл дахин зөрнө.
 *
 * Ажиллуулах:  node scripts/_draughts_terms_files.mjs [--apply]
 */
import fs from "node:fs";
import path from "node:path";

import { fixTerms } from "./_draughts_terms.mjs";

const FILES = [
  ...fs
    .readdirSync("scripts/curriculum")
    .filter((name) => name.startsWith("draughts"))
    .map((name) => path.join("scripts/curriculum", name)),
  ...fs
    .readdirSync("scripts")
    .filter((name) => name.startsWith("seed-draughts"))
    .map((name) => path.join("scripts", name)),
];

const apply = process.argv.includes("--apply");
let changedFiles = 0;
let changedLines = 0;

for (const file of FILES) {
  const before = fs.readFileSync(file, "utf8");
  const after = fixTerms(before);
  if (before === after) continue;

  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  for (let i = 0; i < beforeLines.length; i += 1) {
    if (beforeLines[i] === afterLines[i]) continue;
    changedLines++;
    console.log(`${file}:${i + 1}\n  - ${beforeLines[i].trim()}\n  + ${afterLines[i].trim()}`);
  }

  changedFiles++;
  if (apply) fs.writeFileSync(file, after);
}

console.log(`\n${changedFiles} файл, ${changedLines} мөр${apply ? " → БИЧСЭН" : " (туршилт)"}`);
