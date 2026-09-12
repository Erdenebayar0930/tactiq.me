/**
 * ДААМЫН ХӨТӨЛБӨРИЙН 2-Р ШАТ — байгаа сэдэв бүрийн АРД нэмэгдэх шинэ
 * дадлага/давтлага хичээлүүд (нийт ~1000 дасгал болгох).
 *
 * ⚠ Хуучин хичээлийн гарчиг, дараалал, агуулгад ХҮРЭХГҮЙ (сурагчдын ахиц
 * тэдгээрт холбоотой). Шинэ хичээл бүр ӨӨРИЙН `seedKey`-тэй: үр нь гарчгаас
 * биш түлхүүрээс гардаг тул гарчгийг засахад дасгал өөрчлөгдөхгүй.
 *
 * ⚠ `seedKey`-г ХЭЗЭЭ Ч бүү өөрчил — өөрчилбөл санд байгаа хичээлээс өөр
 * байрлал гарна (seeder гарчгаар нь алгасах тул санд нөлөөлөхгүй ч, шинэ
 * орчинд өөр агуулга үүснэ).
 */
import {
  CAPTURE_EXPLAIN,
  CAPTURE_PROMPT,
  CHAIN_EXPLAIN,
  COMBO_EXPLAIN,
  COMBO_PROMPT,
  QUIET_PROMPT,
  gen,
  type Bi,
  type SeedLesson,
} from "./draughtsShared";

// --- Даалгавар ------------------------------------------------------------

const ONLY_PROMPT: Bi = ["Цагаанаар тоглож байна. Цорын ганц нүүдлээ ол.", "White to play. Find your only move."];
const TWO_PROMPT: Bi = ["Цагаанаар тоглож байна. Нэг нүүдлээр хоёр чулуу ид.", "White to play. Capture two pieces in one move."];
const CHAIN2_PROMPT: Bi = [
  "Цагаанаар тоглож байна. Нэг нүүдлээр хоёроос дээш чулуу ид.",
  "White to play. Capture two or more pieces in one move.",
];
const CHAIN3_PROMPT: Bi = [
  "Цагаанаар тоглож байна. Нэг нүүдлээр гурваас дээш чулуу ид.",
  "White to play. Capture three or more pieces in one move.",
];
const CHAIN4_PROMPT: Bi = [
  "Цагаанаар тоглож байна. Нэг нүүдлээр дөрвөөс дээш чулуу ид.",
  "White to play. Capture four or more pieces in one move.",
];
const BACK_PROMPT: Bi = ["Цагаанаар тоглож байна. Бэрээрээ хойш нь цохи.", "White to play. Capture backwards with a man."];
const MAJORITY_PROMPT: Bi = [
  "Цагаанаар тоглож байна. Хамгийн олон чулуу иддэг цувааг ол.",
  "White to play. Find the sequence that captures the most pieces.",
];
const PROMOTE_PROMPT: Bi = ["Цагаанаар тоглож байна. Бэрээ дамка болго.", "White to play. Promote your man to a king."];
const CAPTURE_PROMOTE_PROMPT: Bi = ["Цагаанаар тоглож байна. Цохиод дамка бол.", "White to play. Capture and promote."];
const KING_PROMPT: Bi = ["Цагаанаар тоглож байна. Дамкаараа цохи.", "White to play. Capture with your king."];
const EXCHANGE_PROMPT: Bi = [
  "Цагаанаар тоглож байна. Чулуугаа өгөөд буцааж ав — солилцоо хий.",
  "White to play. Give a piece and take one back — make an exchange.",
];
const LONG_COMBO_PROMPT: Bi = [
  "Цагаанаар тоглож байна. Тулгуураа өгөөд, цувааг эцэс хүртэл нь хий.",
  "White to play. Give the setup piece and play the sequence to the end.",
];

// --- Тайлбар --------------------------------------------------------------

const QUIET_EXPLAIN: Bi = [
  "Энэ байрлалд ердөө нэг л хууль ёсны нүүдэл байна — бэр урагш ташуу.",
  "There is only one legal move here — the man steps diagonally forward.",
];
const ONLY_EXPLAIN: Bi = [
  "Албадмал байрлал: өөр сонголт байхгүй. Ийм байрлалд орохоос нүүдэл бүрээрээ сэргийл.",
  "A forced position: there is no choice. Avoid drifting into these with every move you make.",
];
const BACK_EXPLAIN: Bi = [
  "Бэр НҮҮХДЭЭ зөвхөн урагш, харин ИДЭХДЭЭ хойш ч үсэрч болно.",
  "A man MOVES only forward, but it may CAPTURE backwards too.",
];
const MAJORITY_EXPLAIN: Bi = [
  "Хэд хэдэн цохилт байвал хамгийн олон чулуу иддэг цувааг заавал сонгоно. Цохилт бүрийг тоолж хар.",
  "When several captures exist you must take the one that captures the most pieces. Count every option.",
];
const PROMOTE_EXPLAIN: Bi = [
  "Сүүлийн эгнээнд хүрсэн бэр дамка болно — дараа нь хойш ч нүүж чадна.",
  "Reaching the last row promotes the man — afterwards it can also move backwards.",
];
const CAPTURE_PROMOTE_EXPLAIN: Bi = [
  "Хамгийн хүчтэй цохилт нь материал ба дамка хоёуланг зэрэг өгдөг нь.",
  "The strongest strike wins material and a king at the same time.",
];
const KING_EXPLAIN: Bi = [
  "Дамка холоос цохино: идсэн чулууны цаана хоосон нүд байвал аль ч зайд буух боломжтой.",
  "A king captures from a distance: it may land on any empty square beyond the captured piece.",
];
const ENDGAME_KING_EXPLAIN: Bi = [
  "Төгсгөлийн техник нь нарийн тооцоо: дамка холоос цохиж чадна.",
  "Endgame technique is precise calculation: the king strikes from a distance.",
];
const EXCHANGE_EXPLAIN: Bi = [
  "Солилцоо: чулуугаа өгөөд, яг тэр тооны чулууг буцааж авна. Идэлт заавал тул хар тал сонголтгүй.",
  "An exchange: you give pieces and take back the same number. Capture is compulsory, so Black has no choice.",
];
const LONG_COMBO_EXPLAIN: Bi = [
  "Урт комбинаци: эхний нүүдэл тулгуур, дараагийн бүх хариу албадмал. Эцэст нь цагаан илүү чулуу авна.",
  "A long combination: the first move is the setup, every reply after it is forced, and White ends up ahead.",
];

// --- Хичээлүүд ------------------------------------------------------------

export const EXTRA_LEVEL_1: SeedLesson[] = [
  {
    seedKey: "L1.moves-practice",
    title: ["Нүүдлийн дадлага", "Moving practice"],
    xp: 10,
    exercises: [gen(QUIET_PROMPT, QUIET_EXPLAIN, 12, { type: "move", quietOnly: true, byMan: true, pieces: { whites: 2, blacks: 2 } })],
  },
  {
    seedKey: "L1.capture-practice-1",
    title: ["Цохилтын дадлага 1", "Capture practice 1"],
    xp: 15,
    exercises: [gen(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 12, { type: "move", minCaptures: 1, maxCaptures: 1, pieces: { whites: 2, blacks: 3 } })],
  },
  {
    seedKey: "L1.capture-practice-2",
    title: ["Цохилтын дадлага 2", "Capture practice 2"],
    xp: 15,
    exercises: [gen(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 12, { type: "move", minCaptures: 1, maxCaptures: 1, pieces: { whites: 3, blacks: 4 } })],
  },
  {
    seedKey: "L1.backward",
    title: ["Хойш цохих", "Capturing backwards"],
    xp: 15,
    exercises: [gen(BACK_PROMPT, BACK_EXPLAIN, 12, { type: "move", backward: true, maxCaptures: 1, pieces: { whites: 3, blacks: 3 } })],
  },
  {
    seedKey: "L1.promotion-practice",
    title: ["Дамка болох дадлага", "Promotion practice"],
    xp: 15,
    exercises: [gen(PROMOTE_PROMPT, PROMOTE_EXPLAIN, 12, { type: "move", mustPromote: true, quietOnly: true, pieces: { whites: 2, blacks: 3 } })],
  },
  {
    seedKey: "L1.double-capture",
    title: ["Дараалсан цохилтын дадлага", "Multiple capture practice"],
    xp: 20,
    exercises: [gen(TWO_PROMPT, CHAIN_EXPLAIN, 12, { type: "move", minCaptures: 2, maxCaptures: 2, pieces: { whites: 3, blacks: 5 } })],
  },
  {
    seedKey: "L1.king-capture",
    title: ["Дамканы цохилтын дадлага", "King capture practice"],
    xp: 15,
    exercises: [gen(KING_PROMPT, KING_EXPLAIN, 12, { type: "move", byKing: true, minCaptures: 1, pieces: { whites: 1, blacks: 3, whiteKings: 1 } })],
  },
  {
    seedKey: "L1.review",
    title: ["Level 1 давтлага", "Level 1 review"],
    xp: 20,
    exercises: [
      gen(QUIET_PROMPT, QUIET_EXPLAIN, 3, { type: "move", quietOnly: true, byMan: true, pieces: { whites: 3, blacks: 2 } }),
      gen(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 4, { type: "move", minCaptures: 1, maxCaptures: 1, pieces: { whites: 3, blacks: 4 } }),
      gen(CHAIN2_PROMPT, CHAIN_EXPLAIN, 3, { type: "move", minCaptures: 2, pieces: { whites: 3, blacks: 5 } }),
      gen(PROMOTE_PROMPT, PROMOTE_EXPLAIN, 2, { type: "move", mustPromote: true, quietOnly: true, pieces: { whites: 2, blacks: 3 } }),
    ],
  },
];

export const EXTRA_LEVEL_2: SeedLesson[] = [
  {
    seedKey: "L2.majority",
    title: ["Хамгийн олон чулуу", "Most pieces wins"],
    xp: 20,
    exercises: [gen(MAJORITY_PROMPT, MAJORITY_EXPLAIN, 12, { type: "move", majority: true, pieces: { whites: 4, blacks: 5 } })],
  },
  {
    seedKey: "L2.backward-practice",
    title: ["Хойш цохилтын дадлага", "Backward capture practice"],
    xp: 20,
    exercises: [gen(BACK_PROMPT, BACK_EXPLAIN, 12, { type: "move", backward: true, pieces: { whites: 3, blacks: 5 } })],
  },
  {
    seedKey: "L2.two-at-once",
    title: ["Хоёр чулуу нэг дор", "Two pieces at once"],
    xp: 20,
    exercises: [gen(TWO_PROMPT, CHAIN_EXPLAIN, 12, { type: "move", minCaptures: 2, maxCaptures: 2, pieces: { whites: 4, blacks: 5 } })],
  },
  {
    seedKey: "L2.setup-practice-1",
    title: ["Тулгуурын дадлага 1", "Setup practice 1"],
    xp: 20,
    exercises: [gen(COMBO_PROMPT, COMBO_EXPLAIN, 12, { type: "combo", pieces: { whites: 4, blacks: 4 } })],
  },
  {
    seedKey: "L2.setup-practice-2",
    title: ["Тулгуурын дадлага 2", "Setup practice 2"],
    xp: 20,
    exercises: [gen(COMBO_PROMPT, COMBO_EXPLAIN, 12, { type: "combo", pieces: { whites: 4, blacks: 5 } })],
  },
  {
    seedKey: "L2.review",
    title: ["Level 2 давтлага", "Level 2 review"],
    xp: 25,
    exercises: [
      gen(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 4, { type: "move", minCaptures: 1, pieces: { whites: 4, blacks: 4 } }),
      gen(MAJORITY_PROMPT, MAJORITY_EXPLAIN, 4, { type: "move", majority: true, pieces: { whites: 4, blacks: 5 } }),
      gen(COMBO_PROMPT, COMBO_EXPLAIN, 4, { type: "combo", pieces: { whites: 4, blacks: 4 } }),
    ],
  },
];

export const EXTRA_LEVEL_3: SeedLesson[] = [
  {
    seedKey: "L3.drawing-practice",
    title: ["Чулуу татах дадлага", "Drawing practice"],
    xp: 20,
    exercises: [gen(COMBO_PROMPT, COMBO_EXPLAIN, 12, { type: "combo", pieces: { whites: 4, blacks: 5 } })],
  },
  {
    seedKey: "L3.clearing-practice",
    title: ["Зам чөлөөлөх дадлага", "Path-clearing practice"],
    xp: 20,
    exercises: [gen(COMBO_PROMPT, COMBO_EXPLAIN, 12, { type: "combo", pieces: { whites: 5, blacks: 4 } })],
  },
  {
    seedKey: "L3.breakthrough",
    title: ["Цоолж дамка гарах", "Break through to promote"],
    xp: 20,
    exercises: [gen(PROMOTE_PROMPT, PROMOTE_EXPLAIN, 12, { type: "move", mustPromote: true, pieces: { whites: 3, blacks: 5 } })],
  },
  {
    seedKey: "L3.sacrifice-practice",
    title: ["Золиосын дадлага", "Sacrifice practice"],
    xp: 25,
    exercises: [gen(COMBO_PROMPT, COMBO_EXPLAIN, 12, { type: "combo", pieces: { whites: 5, blacks: 5 } })],
  },
  {
    seedKey: "L3.trap-practice",
    title: ["Урхины дадлага", "Trap practice"],
    xp: 25,
    exercises: [gen(COMBO_PROMPT, COMBO_EXPLAIN, 12, { type: "combo", minGain: 2, pieces: { whites: 5, blacks: 6 } })],
  },
  {
    seedKey: "L3.review",
    title: ["Level 3 давтлага", "Level 3 review"],
    xp: 25,
    exercises: [
      gen(COMBO_PROMPT, COMBO_EXPLAIN, 6, { type: "combo", pieces: { whites: 5, blacks: 5 } }),
      gen(CHAIN2_PROMPT, CHAIN_EXPLAIN, 6, { type: "move", minCaptures: 2, pieces: { whites: 4, blacks: 5 } }),
    ],
  },
];

export const EXTRA_LEVEL_4: SeedLesson[] = [
  {
    seedKey: "L4.combo-practice",
    title: ["Комбинацийн дадлага", "Combination practice"],
    xp: 25,
    exercises: [gen(COMBO_PROMPT, COMBO_EXPLAIN, 12, { type: "combo", pieces: { whites: 4, blacks: 4 } })],
  },
  {
    seedKey: "L4.big-gain",
    title: ["Том ашигтай комбинаци", "Big-gain combinations"],
    xp: 30,
    exercises: [gen(COMBO_PROMPT, COMBO_EXPLAIN, 8, { type: "combo", minGain: 3, pieces: { whites: 5, blacks: 6 } })],
  },
  {
    seedKey: "L4.three-chain",
    title: ["Гурван чулууны цуваа", "Three-piece sequences"],
    xp: 25,
    exercises: [gen(CHAIN3_PROMPT, CHAIN_EXPLAIN, 12, { type: "move", minCaptures: 3, maxCaptures: 3, pieces: { whites: 3, blacks: 6 } })],
  },
  {
    seedKey: "L4.four-chain",
    title: ["Дөрвөн чулууны цуваа", "Four-piece sequences"],
    xp: 30,
    exercises: [gen(CHAIN4_PROMPT, CHAIN_EXPLAIN, 12, { type: "move", minCaptures: 4, pieces: { whites: 3, blacks: 8 } })],
  },
  {
    seedKey: "L4.long-combo",
    title: ["Урт комбинаци", "Long combinations"],
    xp: 30,
    exercises: [gen(LONG_COMBO_PROMPT, LONG_COMBO_EXPLAIN, 8, { type: "combo3", pieces: { whites: 5, blacks: 5 } })],
  },
  {
    seedKey: "L4.capture-promote",
    title: ["Цохиод дамка болох", "Capture into promotion"],
    xp: 30,
    exercises: [gen(CAPTURE_PROMOTE_PROMPT, CAPTURE_PROMOTE_EXPLAIN, 12, { type: "move", minCaptures: 1, mustPromote: true, pieces: { whites: 3, blacks: 5 } })],
  },
  {
    seedKey: "L4.review",
    title: ["Level 4 давтлага", "Level 4 review"],
    xp: 30,
    exercises: [
      gen(COMBO_PROMPT, COMBO_EXPLAIN, 4, { type: "combo", pieces: { whites: 5, blacks: 5 } }),
      gen(CHAIN3_PROMPT, CHAIN_EXPLAIN, 4, { type: "move", minCaptures: 3, pieces: { whites: 4, blacks: 6 } }),
      gen(CAPTURE_PROMOTE_PROMPT, CAPTURE_PROMOTE_EXPLAIN, 4, { type: "move", minCaptures: 1, mustPromote: true, pieces: { whites: 3, blacks: 4 } }),
    ],
  },
];

export const EXTRA_LEVEL_5: SeedLesson[] = [
  {
    seedKey: "L5.quick-2",
    title: ["Хурдан цохилт 2", "Quick strikes 2"],
    xp: 25,
    exercises: [gen(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 12, { type: "move", minCaptures: 1, pieces: { whites: 5, blacks: 6 } })],
  },
  {
    seedKey: "L5.long-2",
    title: ["Урт цуваа 2", "Long sequences 2"],
    xp: 30,
    exercises: [gen(CHAIN3_PROMPT, CHAIN_EXPLAIN, 12, { type: "move", minCaptures: 3, pieces: { whites: 4, blacks: 7 } })],
  },
  {
    seedKey: "L5.setup-2",
    title: ["Тулгуур хайх 2", "Finding the setup 2"],
    xp: 30,
    exercises: [gen(COMBO_PROMPT, COMBO_EXPLAIN, 12, { type: "combo", pieces: { whites: 5, blacks: 5 } })],
  },
  {
    seedKey: "L5.king-2",
    title: ["Дамканы тактик 2", "King tactics 2"],
    xp: 30,
    exercises: [gen(KING_PROMPT, KING_EXPLAIN, 12, { type: "move", byKing: true, minCaptures: 2, pieces: { whites: 2, blacks: 5, whiteKings: 1 } })],
  },
  {
    seedKey: "L5.majority",
    title: ["Хамгийн их идэлтийн дүрэм", "The maximum capture rule"],
    xp: 30,
    exercises: [gen(MAJORITY_PROMPT, MAJORITY_EXPLAIN, 12, { type: "move", majority: true, pieces: { whites: 4, blacks: 6 } })],
  },
  {
    seedKey: "L5.mixed-2",
    title: ["Холимог сорил 2", "Mixed challenge 2"],
    xp: 35,
    exercises: [
      gen(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 4, { type: "move", minCaptures: 1, pieces: { whites: 5, blacks: 5 } }),
      gen(MAJORITY_PROMPT, MAJORITY_EXPLAIN, 4, { type: "move", majority: true, pieces: { whites: 4, blacks: 6 } }),
      gen(COMBO_PROMPT, COMBO_EXPLAIN, 4, { type: "combo", pieces: { whites: 5, blacks: 5 } }),
    ],
  },
  {
    seedKey: "L5.mixed-3",
    title: ["Холимог сорил 3", "Mixed challenge 3"],
    xp: 35,
    exercises: [
      gen(CHAIN3_PROMPT, CHAIN_EXPLAIN, 4, { type: "move", minCaptures: 3, pieces: { whites: 4, blacks: 7 } }),
      gen(KING_PROMPT, KING_EXPLAIN, 4, { type: "move", byKing: true, minCaptures: 1, pieces: { whites: 1, blacks: 4, whiteKings: 1 } }),
      gen(COMBO_PROMPT, COMBO_EXPLAIN, 4, { type: "combo", minGain: 2, pieces: { whites: 5, blacks: 6 } }),
    ],
  },
];

export const EXTRA_LEVEL_6: SeedLesson[] = [
  {
    seedKey: "L6.only-move",
    title: ["Цорын ганц нүүдэл", "The only move"],
    xp: 25,
    exercises: [gen(ONLY_PROMPT, ONLY_EXPLAIN, 12, { type: "move", quietOnly: true, pieces: { whites: 3, blacks: 4 } })],
  },
  {
    seedKey: "L6.exchange",
    title: ["Солилцоо хийх", "Making an exchange"],
    xp: 25,
    exercises: [gen(EXCHANGE_PROMPT, EXCHANGE_EXPLAIN, 12, { type: "combo", exchange: true, pieces: { whites: 4, blacks: 4 } })],
  },
  {
    seedKey: "L6.exchange-practice",
    title: ["Солилцооны дадлага", "Exchange practice"],
    xp: 25,
    exercises: [gen(EXCHANGE_PROMPT, EXCHANGE_EXPLAIN, 12, { type: "combo", exchange: true, pieces: { whites: 5, blacks: 5 } })],
  },
  {
    seedKey: "L6.weakness",
    title: ["Сул талыг ашиглах", "Exploiting a weakness"],
    xp: 25,
    exercises: [gen(COMBO_PROMPT, COMBO_EXPLAIN, 12, { type: "combo", pieces: { whites: 5, blacks: 5 } })],
  },
  {
    seedKey: "L6.attack",
    title: ["Довтолгооны дадлага", "Attack practice"],
    xp: 25,
    exercises: [gen(COMBO_PROMPT, COMBO_EXPLAIN, 12, { type: "combo", minGain: 2, pieces: { whites: 5, blacks: 6 } })],
  },
  {
    seedKey: "L6.defence",
    title: ["Хамгаалалтын дадлага", "Defence practice"],
    xp: 25,
    exercises: [gen(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 12, { type: "move", minCaptures: 1, pieces: { whites: 5, blacks: 5 } })],
  },
  {
    seedKey: "L6.king-endgame",
    title: ["Дамканы төгсгөл", "King endgames"],
    xp: 30,
    exercises: [gen(KING_PROMPT, ENDGAME_KING_EXPLAIN, 12, { type: "move", byKing: true, minCaptures: 1, pieces: { whites: 1, blacks: 4, whiteKings: 1 } })],
  },
  {
    seedKey: "L6.endgame-promotion",
    title: ["Төгсгөлд дамка гаргах", "Promoting in the endgame"],
    xp: 30,
    exercises: [gen(PROMOTE_PROMPT, PROMOTE_EXPLAIN, 12, { type: "move", mustPromote: true, pieces: { whites: 2, blacks: 4 } })],
  },
];

export const EXTRA_LEVEL_9: SeedLesson[] = [
  {
    seedKey: "L9.scan",
    title: ["Scan — дадлага", "Scan — practice"],
    xp: 30,
    exercises: [gen(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 12, { type: "move", minCaptures: 1, pieces: { whites: 5, blacks: 6 } })],
  },
  {
    seedKey: "L9.calculate",
    title: ["Calculate — дадлага", "Calculate — practice"],
    xp: 30,
    exercises: [gen(COMBO_PROMPT, COMBO_EXPLAIN, 12, { type: "combo", minGain: 2, pieces: { whites: 5, blacks: 5 } })],
  },
  {
    seedKey: "L9.evaluate",
    title: ["Evaluate — дадлага", "Evaluate — practice"],
    xp: 30,
    exercises: [gen(MAJORITY_PROMPT, MAJORITY_EXPLAIN, 12, { type: "move", majority: true, pieces: { whites: 5, blacks: 6 } })],
  },
  {
    seedKey: "L9.move",
    title: ["Move — дадлага", "Move — practice"],
    xp: 30,
    exercises: [gen(CHAIN2_PROMPT, CHAIN_EXPLAIN, 12, { type: "move", minCaptures: 2, pieces: { whites: 4, blacks: 6 } })],
  },
  {
    seedKey: "L9.full-cycle",
    title: ["Бүтэн дугуй: Scan → Move", "Full cycle: Scan → Move"],
    xp: 35,
    exercises: [
      gen(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 4, { type: "move", minCaptures: 1, pieces: { whites: 5, blacks: 6 } }),
      gen(EXCHANGE_PROMPT, EXCHANGE_EXPLAIN, 4, { type: "combo", exchange: true, pieces: { whites: 5, blacks: 5 } }),
      gen(COMBO_PROMPT, COMBO_EXPLAIN, 4, { type: "combo", pieces: { whites: 5, blacks: 6 } }),
    ],
  },
];

export const EXTRA_LEVEL_10: SeedLesson[] = [
  {
    seedKey: "L10.master-chains",
    title: ["Мастерын цуваа", "Master sequences"],
    xp: 35,
    exercises: [gen(CHAIN3_PROMPT, CHAIN_EXPLAIN, 12, { type: "move", minCaptures: 3, pieces: { whites: 5, blacks: 8 } })],
  },
  {
    seedKey: "L10.master-combos",
    title: ["Мастерын комбинаци", "Master combinations"],
    xp: 35,
    exercises: [gen(COMBO_PROMPT, COMBO_EXPLAIN, 12, { type: "combo", minGain: 3, pieces: { whites: 5, blacks: 6 } })],
  },
  {
    seedKey: "L10.master-long-combos",
    title: ["Мастерын урт комбинаци", "Master long combinations"],
    xp: 40,
    exercises: [gen(LONG_COMBO_PROMPT, LONG_COMBO_EXPLAIN, 8, { type: "combo3", pieces: { whites: 6, blacks: 6 } })],
  },
  {
    seedKey: "L10.master-king",
    title: ["Дамканы мастер цохилт", "Master king strikes"],
    xp: 35,
    exercises: [gen(KING_PROMPT, KING_EXPLAIN, 12, { type: "move", byKing: true, minCaptures: 2, pieces: { whites: 2, blacks: 6, whiteKings: 1 } })],
  },
  {
    seedKey: "L10.timed-2",
    title: ["Хугацаатай сорил 2", "Timed challenge 2"],
    xp: 40,
    exercises: [gen(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 15, { type: "move", minCaptures: 1, pieces: { whites: 5, blacks: 6 } })],
  },
  {
    seedKey: "L10.master-test-1",
    title: ["Мастерын сорил 1", "Master test 1"],
    xp: 45,
    exercises: [
      gen(MAJORITY_PROMPT, MAJORITY_EXPLAIN, 5, { type: "move", majority: true, pieces: { whites: 5, blacks: 7 } }),
      gen(LONG_COMBO_PROMPT, LONG_COMBO_EXPLAIN, 5, { type: "combo3", pieces: { whites: 5, blacks: 5 } }),
      gen(CHAIN3_PROMPT, CHAIN_EXPLAIN, 5, { type: "move", minCaptures: 3, pieces: { whites: 5, blacks: 8 } }),
    ],
  },
  {
    seedKey: "L10.master-test-2",
    title: ["Мастерын сорил 2", "Master test 2"],
    xp: 45,
    exercises: [
      gen(EXCHANGE_PROMPT, EXCHANGE_EXPLAIN, 5, { type: "combo", exchange: true, pieces: { whites: 5, blacks: 6 } }),
      gen(COMBO_PROMPT, COMBO_EXPLAIN, 5, { type: "combo", minGain: 2, pieces: { whites: 6, blacks: 6 } }),
      gen(KING_PROMPT, KING_EXPLAIN, 5, { type: "move", byKing: true, minCaptures: 2, pieces: { whites: 2, blacks: 5, whiteKings: 1 } }),
    ],
  },
];
