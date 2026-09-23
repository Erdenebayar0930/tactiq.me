/**
 * «ДАДЛАГА» БҮЛЭГ — ЭНГИЙН ИДЭЛТ, ЦОХИЛТЫН 200 ДАСГАЛ.
 *
 * ⚠ ЭНЭ БҮЛЭГ ЮУГААРАА ӨӨР ВЭ: Level 1–6-гийн хичээлүүд нь ШИНЭ санаа
 * заадаг (хамгаалалт, цоолох, золиос, төвийн хяналт). Энд ШИНЭ санаа
 * АЛГА — зөвхөн ДАВТАЛТ. Сурагч аль хэдийн мэдэх зүйлээ олон удаа хийж
 * хурдаа нэмнэ. Тиймээс онолын асуулт огт байхгүй, бүгд хөлөгт дасгал.
 *
 * ⚠ ДААЛГАВРЫН ТЕКСТИЙГ ЗОРИУД ДАВТАВ. Шинэ үг зохиосонгүй — хөтөлбөрт
 * АЛЬ ХЭДИЙН БАЙГАА даалгаврыг яг тэр үсгээр нь ашиглав. Шалтгаан:
 * `repair-draughts-moves.ts`-ийн `specFor()` нь даалгаврын ТЕКСТЭЭС
 * шаардлагыг уншдаг. Шинэ өгүүлбэр бичвэл аудит тэр дасгалыг танихгүй
 * бөгөөд ЧИМЭЭГҮЙ алгасна (яг ийм алдаа «Төвийн хяналт» дээр гарсан).
 *
 * ⚠ ЭНД ТАВИХ `spec` НЬ `specFor()`-ЫН ШААРДЛАГААС СУЛ БАЙЖ БОЛОХГҮЙ.
 * Жишээ нь «хоёр хүү ид» гэсэн текст нь аудитад `minCaptures: 2` гэж
 * уншигдана — тиймээс үүсгэгчид ч дор хаяж 2 гэж өгнө. Эс бөгөөс seed
 * амжилттай болоод аудит дараа нь унана.
 *
 * ⚠ БАЙРЛАЛ ДАВХАРДАХГҮЙ: seeder (`seed-draughts-curriculum.ts`) нь
 * хөлгийн түлхүүрээр бүх даамын дасгалыг дамнан давхардлыг хардаг тул
 * эдгээр 200 байрлал хуучин 767-той ч, бие биетэйгээ ч давхцахгүй.
 *
 * ⚠ `seedKey` ЗААВАЛ: үр нь гарчгаас биш түлхүүрээс гарна. Ингэснээр
 * хожим хичээлийн нэрийг засахад агуулга нь өөрчлөгдөхгүй.
 */
import {
  CAPTURE_EXPLAIN,
  CAPTURE_PROMPT,
  CHAIN_EXPLAIN,
  COMBO_EXPLAIN,
  COMBO_PROMPT,
  gen,
} from "./draughtsShared";

import type { Bi, GenSpec, SeedLesson, SeedUnit } from "./draughtsShared";

/**
 * ⚠ ЭНЭ НЭРИЙГ `levelGuard.ts` ТАНИНА. Бүлгийн нэрэнд «Level N» байхгүй
 * тул царцаалтын шалгуур үүнийг анхдагчаар ХӨНДӨХГҮЙ гэж үзнэ. Тиймээс
 * тэнд зориуд зөвшөөрсөн жагсаалтад нэмсэн — нэрийг СОЛИХ бол тэндхийг
 * нь хамт солино.
 */
export const PRACTICE_UNIT_TITLE = "Дадлага — Идэлт ба цохилт";

/** Хичээл бүр 20 дасгал — 10 хичээл нийлээд 200. */
const PER_LESSON = 20;

const practice = (
  seedKey: string,
  title: Bi,
  prompt: Bi,
  explain: Bi,
  spec: GenSpec
): SeedLesson => ({
  title,
  xp: 20,
  seedKey,
  exercises: [gen(prompt, explain, PER_LESSON, spec)],
});

// --- Давтагдах даалгаврын текст (хөтөлбөрт байгаагаар нь) ----------------

const TWO_PROMPT: Bi = [
  "Цагаанаар тоглож байна. Нэг нүүдлээр хоёр хүү ид.",
  "White to play. Capture two men in one move.",
];

const THREE_PROMPT: Bi = [
  "Цагаанаар тоглож байна. Нэг нүүдлээр гурваас дээш хүү ид.",
  "White to play. Capture three or more men in one move.",
];

const KING_PROMPT: Bi = [
  "Цагаанаар тоглож байна. Даамаараа ид.",
  "White to play. Capture with your king.",
];

const BACK_PROMPT: Bi = [
  "Цагаанаар тоглож байна. Хүүгээрээ хойш нь ид.",
  "White to play. Capture backwards with a man.",
];

const MAJORITY_PROMPT: Bi = [
  "Цагаанаар тоглож байна. Хамгийн олон хүү иддэг цувааг ол.",
  "White to play. Find the line that captures the most men.",
];

const PROMOTE_PROMPT: Bi = [
  "Цагаанаар тоглож байна. Идээд даам бол.",
  "White to play. Capture and promote.",
];

const KING_EXPLAIN: Bi = [
  "Даам ташуу шугамаар АЛСААС ажиллана — идэх дүрсээ хол зайнаас хай.",
  "A king works along the whole diagonal — look for its target from far away.",
];

const BACK_EXPLAIN: Bi = [
  "Хүү урагш НҮҮДЭГ ч хойш нь ИДЭЖ чадна. Тиймээс ард талаа ч тоол.",
  "A man moves only forward but captures backwards too — so count behind you as well.",
];

const MAJORITY_EXPLAIN: Bi = [
  "Идэлт албадмал ба ХАМГИЙН ОЛОНГ иддэг цувааг сонгох ёстой. Богино нь эхлээд нүдэнд туссан ч урт нь заавал бий.",
  "Captures are compulsory and you must take the longest line. The short one catches the eye first — the long one is still there.",
];

const PROMOTE_EXPLAIN: Bi = [
  "Цуваагаа сүүлийн эгнээнд ТӨГСГӨвөл даам болно. Дундуур нь дайрч өнгөрвөл болохгүй.",
  "Finish the line on the last row and you promote. Passing through it on the way does not count.",
];

export const PRACTICE_UNIT: SeedUnit = {
  title: [PRACTICE_UNIT_TITLE, "Practice — captures and strikes"],
  color: "amber",
  lessons: [
    /*
     * ⚠ ЭНГИЙНЭЭС ХҮНД РҮҮ: нэг идэлт → олон идэлт → дүрсийн онцгой
     * эрх (даам, хойш идэх) → цохилт. Дасгал бүр өмнөхөө ТҮШИНЭ.
     */
    practice("Дадлага|Нэг идэлт", ["Нэг идэлт", "Single capture"], CAPTURE_PROMPT, CAPTURE_EXPLAIN, {
      type: "move",
      pieces: { whites: 3, blacks: 3 },
      minCaptures: 1,
      maxCaptures: 1,
    }),
    practice("Дадлага|Хоёр идэлт", ["Хоёр идэлт", "Double capture"], TWO_PROMPT, CHAIN_EXPLAIN, {
      type: "move",
      pieces: { whites: 3, blacks: 4 },
      minCaptures: 2,
      maxCaptures: 2,
    }),
    practice(
      "Дадлага|Гурван идэлт",
      ["Гурван идэлт", "Triple capture"],
      THREE_PROMPT,
      CHAIN_EXPLAIN,
      { type: "move", pieces: { whites: 3, blacks: 5 }, minCaptures: 3, maxCaptures: 4 }
    ),
    practice(
      "Дадлага|Даамаар идэх",
      ["Даамаар идэх", "Capturing with the king"],
      KING_PROMPT,
      KING_EXPLAIN,
      {
        type: "move",
        pieces: { whites: 1, blacks: 4, whiteKings: 1 },
        byKing: true,
        minCaptures: 1,
        maxCaptures: 4,
      }
    ),
    practice(
      "Дадлага|Хойш идэх",
      ["Хойш идэх", "Capturing backwards"],
      BACK_PROMPT,
      BACK_EXPLAIN,
      {
        type: "move",
        pieces: { whites: 3, blacks: 4 },
        byMan: true,
        backward: true,
        minCaptures: 1,
        maxCaptures: 3,
      }
    ),
    practice(
      "Дадлага|Хамгийн олон идэлт",
      ["Хамгийн олон идэлт", "The longest capture"],
      MAJORITY_PROMPT,
      MAJORITY_EXPLAIN,
      {
        type: "move",
        pieces: { whites: 4, blacks: 5 },
        majority: true,
        minCaptures: 2,
        maxCaptures: 4,
      }
    ),
    practice(
      "Дадлага|Идээд даам болох",
      ["Идээд даам болох", "Capture and promote"],
      PROMOTE_PROMPT,
      PROMOTE_EXPLAIN,
      {
        type: "move",
        pieces: { whites: 2, blacks: 4 },
        byMan: true,
        mustPromote: true,
        minCaptures: 1,
        maxCaptures: 3,
      }
    ),
    /*
     * ⚠ СҮҮЛИЙН ГУРАВ НЬ ЦОХИЛТ (хоёр нүүдлийн комбинаци): тулгуураа
     * өгөөд илүүг эргүүлж авна. Дүрсийн тоо ахих тусам хөлөг дүүрч,
     * тооцоо хүндэрнэ — гурвуулаа ижил даалгавартай ч ижил хүндрэлтэй
     * биш.
     */
    practice(
      "Дадлага|Цохилт 1",
      ["Цохилтын дадлага 1", "Strike practice 1"],
      COMBO_PROMPT,
      COMBO_EXPLAIN,
      { type: "combo", pieces: { whites: 4, blacks: 4 } }
    ),
    practice(
      "Дадлага|Цохилт 2",
      ["Цохилтын дадлага 2", "Strike practice 2"],
      COMBO_PROMPT,
      COMBO_EXPLAIN,
      { type: "combo", pieces: { whites: 5, blacks: 5 } }
    ),
    practice(
      "Дадлага|Цохилт 3",
      ["Цохилтын дадлага 3", "Strike practice 3"],
      COMBO_PROMPT,
      COMBO_EXPLAIN,
      { type: "combo", pieces: { whites: 5, blacks: 6 }, minGain: 2 }
    ),
  ],
};
