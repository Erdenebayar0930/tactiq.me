/**
 * ХИЧЭЭЛИЙН СЭДЭВТЭЙ ЗӨРСӨН ДААЛГАВРУУДЫГ ТААРУУЛНА.
 *
 * ⚠ ЮУ БУРУУ БАЙСАН БЭ: «Гинжин комбинаци», «Дараалсан комбинаци»,
 * «Урт цуваа», «Идэлтийн чиглэл» гэсэн хичээлүүдийн дадлага нь ерөнхий
 * «Идэх боломжоо ол» байв. Үр дүнд нь тэр хичээлүүдийн зарим байрлал
 * ЗӨВХӨН НЭГ дүрс иддэг (цуваа биш), эсвэл УРАГШ иддэг (чиглэлийн
 * хичээл дээр) болсон. Сурагч гарчигт нэгийг уншаад хөлөг дээр өөрийг нь
 * хийнэ.
 *
 * ⚠ ЗӨВХӨН ДААЛГАВРЫГ СОЛИНО, БАЙРЛАЛЫГ ЭНД ХӨНДӨХГҮЙ. Даалгавар
 * тодорхой болмогц `repair:draughts` нь зөрсөн байрлалуудыг өөрөө олж
 * дахин үүсгэнэ (`specFor` даалгаврын текстийг уншдаг). Ингэснээр
 * байрлал үүсгэх логик НЭГ газар үлдэнэ.
 *
 * Ажиллуулах:
 *   npx tsx --env-file=.env.local scripts/fix-lesson-prompts.ts [--apply]
 *   npm run repair:draughts -- --apply      # дараа нь ЗААВАЛ
 */
import { Client } from "pg";

type Text = { prompt: string; promptEn: string; explain: string; explainEn: string };

const CHAIN: Text = {
  prompt: "Цагаанаар тоглож байна. Нэг нүүдлээр хоёроос дээш хүү ид.",
  promptEn: "White to play. Capture two or more pieces in one move.",
  explain: "Идсэн газраа зогсохгүй: цааш идэх боломж байвал ҮРГЭЛЖЛҮҮЛЭН үсэрнэ.",
  explainEn: "Do not stop after the first jump: keep jumping while captures remain.",
};

const BACKWARD: Text = {
  prompt: "Цагаанаар тоглож байна. Хүүгээрээ хойш нь ид.",
  promptEn: "White to play. Capture backwards with a man.",
  explain: "Хүү НҮҮХДЭЭ зөвхөн урагш, харин ИДЭХДЭЭ хойш ч үсэрч болно.",
  explainEn: "A man MOVES only forward, but it may CAPTURE backwards too.",
};

/** Хичээлийн нэр → тухайн хичээлд тохирох даалгавар. */
const LESSONS: Record<string, Text> = {
  "Идэлтийн чиглэл": BACKWARD,
  "Дараалсан комбинаци": CHAIN,
  "Гинжин комбинаци": CHAIN,
  // ⚠ «Урт цуваа 2» нь «гурваас дээш» — эхнийх нь хоёроос дээш байж
  //    хүндрэлийн шат үүснэ.
  "Урт цуваа": CHAIN,
};

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  let changed = 0;

  for (const [lesson, text] of Object.entries(LESSONS)) {
    const rows = (
      await client.query<{ id: string; prompt: string }>(
        `select e.id, e.prompt
           from exercises e
           join lessons l on l.id = e.lesson_id
           join units u on u.id = l.unit_id
          where u.course_slug = 'checkers' and l.title = $1 and e.type = 'draughts-move'
          order by e.sort_order`,
        [lesson]
      )
    ).rows;

    const stale = rows.filter((row) => row.prompt !== text.prompt);
    console.log(`${lesson}: ${rows.length} дасгал, солих ${stale.length}`);

    for (const row of stale) {
      changed++;
      if (apply) {
        await client.query(
          `update exercises set prompt=$2, prompt_en=$3, explanation=$4, explanation_en=$5 where id=$1`,
          [row.id, text.prompt, text.promptEn, text.explain, text.explainEn]
        );
      }
    }
  }

  console.log(`\n${changed} дасгал${apply ? " → БИЧСЭН" : " (туршилт)"}`);
  if (apply && changed) console.log("ДАРААГИЙН АЛХАМ: npm run repair:draughts -- --apply");
  await client.end();
}

main();
