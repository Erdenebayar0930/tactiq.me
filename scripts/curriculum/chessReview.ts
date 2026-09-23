/**
 * «ДАВТЛАГА» БҮЛЭГ — ШАТРЫН 170 ДАСГАЛ, СЭДВЭЭР НЬ БАГЦЛАВ.
 *
 * ⚠ ЭНЭ БҮЛЭГ ЮУГААРАА ӨӨР ВЭ: өмнөх 8 бүлэг нь ШИНЭ санаа заадаг
 * (дүрсийн нүүдэл, шаг, мад, тактик). Энд ШИНЭ санаа АЛГА — зөвхөн
 * ДАВТАЛТ. Тиймээс онолын асуулт огт байхгүй, бүгд хөлөгт дасгал.
 *
 * ⚠ БАГЦЛАЛТ НЬ КУРСИЙН БҮЛГҮҮДИЙГ ДАГАНА. Хичээл бүр өмнөх нэг
 * бүлгийн сэдвийг давтана — сурагч «аль сэдвээ давтаж байгаагаа»
 * гарчгаас нь шууд мэднэ:
 *
 *   Дүрсийн нүүдэл  ← Бүлэг 2      Нэг нүүдэлд мад ← Бүлэг 6
 *   Идэлт           ← Бүлэг 3      Сэрээ           ← Бүлэг 7
 *   Шаг             ← Бүлэг 4      Хүлээс, рентген ← Бүлэг 7
 *   Онцгой дүрэм    ← Бүлэг 5      Хоёр нүүдэлд мад← Бүлэг 8
 *
 * ⚠ ШИНЭ ҮҮСГЭГЧ БИЧСЭНГҮЙ. Хичээл бүр нь хөтөлбөрт АЛЬ ХЭДИЙН байгаа
 * үүсгэгчийг дууддаг. Шалтгаан: тэдгээр нь `validateTask`-аар хатуу
 * шалгагддаг бөгөөд саяхан нэмэгдсэн дүрмүүд (дүрсийн тоо, шаг өгөөд
 * дүрсээ идүүлэхгүй, амласан дүрсээрээ тоглох) бүгд тэднээр дамжина.
 * Шинэ үүсгэгч бичвэл тэр хамгаалалтуудыг дахин бүтээх шаардлагатай.
 *
 * ⚠ ДАВХАРДАЛГҮЙ: seeder (`seed-chess-curriculum.ts`) нь байрлалыг
 * хөтөлбөр даяар харьцуулдаг тул эдгээр 170 байрлал хуучин 834-тэй ч,
 * бие биетэйгээ ч давхцахгүй.
 *
 * ⚠ `seedKey` ЗААВАЛ: үр нь гарчгаас биш түлхүүрээс гарна. Хичээлийн
 * нэрийг хожим засахад агуулга өөрчлөгдөхгүй.
 */
import {
  MATE_SPECS,
  anyOf,
  blockTask,
  captureCheckerTask,
  captureTypeTask,
  castleTask,
  discoveredTask,
  enPassantTask,
  giveCheckTask,
  kingEscapeTask,
  mateTask,
  knightForkTask,
  pawnForkTask,
  pinTask,
  promoteTask,
  queenForkTask,
  reachTask,
  safeCaptureTask,
  skewerTask,
  winMaterialTask,
} from "./chessGenerators";
import { gen } from "./chessShared";

import type { MateSpec } from "./chessGenerators";
import type { Bi, Generator, SeedLesson, SeedUnit } from "./chessShared";

/**
 * МАДЫН ДАВТЛАГА — тайлбар нь ХАЙХ АРГЫГ сануулна, дүрмийг биш.
 *
 * ⚠ Давтлага дээр сурагч дүрмийг нь аль хэдийн мэднэ —
 * хэрэгтэй нь АЖИЛГАЛГА («юунаас эхлэж хайх вэ?»).
 */
const MATE1_HINT: Bi = [
  "Шаг өгч болох НҮҮДЭЛ БҮРИЙГ шалга: тэдний аль нь хар ноёнд ЗАЙЛАХ ЗАМ үлдээхгүй вэ.",
  "Check every move that gives check: which one leaves the black king no escape square?",
];

const MATE2_HINT: Bi = [
  "Эхний нүүдэл нь харын ноёны ЗАЙЛАХ НҮДИЙГ бооно. Хар яах аргагүй нүүсний дараа мад бууна.",
  "The first move takes away the king's escape squares. Black is forced to move, and then the mate lands.",
];

const mate1 = (spec: MateSpec): Generator => mateTask(spec, 1, { explain: MATE1_HINT });
const mate2 = (spec: MateSpec): Generator => mateTask(spec, 2, { explain: MATE2_HINT });

export const REVIEW_UNIT_TITLE = "Давтлага";

/*
 * ⚠ ҮР НЬ БҮЛГИЙН `seedKey` + ХИЧЭЭЛИЙН ГАРЧГААС гарна
 * (`seed-chess-curriculum.ts`). Даамаас өөр нь шатрын `SeedLesson` өөртөө
 * түлхүүр авдаггүй — хичээлийн НЭРИЙГ соливол агуулга нь
 * өөрчлөгдөнө.
 */
const review = (title: Bi, xp: number, count: number, generator: Generator): SeedLesson => ({
  title,
  xp,
  exercises: [gen(generator, count)],
});

export const REVIEW_UNIT: SeedUnit = {
  title: [REVIEW_UNIT_TITLE, "Review"],
  /*
   * ⚠ Найман өнгө бүгд ашиглагдсан тул давхардахаас өөр аргагүй.
   * Хөрш бүлэг нь `amber` учраас түүнээс ХАМГИЙН ХОЛ өнгийг авав.
   */
  color: "emerald",
  seedKey: "Шатар — Давтлага",
  lessons: [
    /*
     * ⚠ КУРСИЙН ДАРААЛЛААР: хялбараас хүнд рүү. Давтлага гэдэг нь
     * санамсаргүй холимог биш — сурагч эхнээс нь дахин алхана.
     */
    review(
      ["Дүрсийн нүүдэл — давтлага", "Piece moves — review"],
      20,
      18,
      anyOf(
        reachTask("r", { ownBlockers: 2, enemies: 1 }),
        reachTask("b", { ownBlockers: 2, enemies: 1 }),
        reachTask("n", { ownBlockers: 3, enemies: 1 }),
        reachTask("q", { ownBlockers: 2, enemies: 1 }),
        reachTask("k", { ownBlockers: 1, enemies: 1 })
      )
    ),
    review(
      ["Идэлт — давтлага", "Captures — review"],
      20,
      20,
      /*
       * ⚠ ХОЁР ӨӨР ЧАДВАР: «заасан дүрсийг ид» нь дүрсийн нүүдлийг,
       * «хамгаалалтгүйг нь ид» нь хариу идэлтийг тоолох чадварыг
       * шалгана. Давтлагад хоёуланг нь холино.
       */
      anyOf(
        captureTypeTask(["n", "b"], "r", 2),
        captureTypeTask(["r", "p"], "b", 2),
        captureTypeTask(["q", "n"], "r", 2),
        safeCaptureTask(3, 3),
        safeCaptureTask(3, 4, 2)
      )
    ),
    review(
      ["Шаг — давтлага", "Check — review"],
      20,
      20,
      /*
       * ⚠ ШАГИЙН ДӨРВӨН ТАЛ: өгөх, ноёноо зайлуулах, хаах, шаг өгсөн
       * дүрсийг идэх. Бодит тоглолтод эдгээр нь холилдож ирдэг тул
       * давтлага ч холимог байх нь зөв.
       */
      anyOf(
        giveCheckTask(["r"]),
        giveCheckTask(["b"]),
        giveCheckTask(["n"]),
        giveCheckTask(["q"], 2),
        kingEscapeTask(),
        blockTask(),
        captureCheckerTask()
      )
    ),
    review(
      ["Онцгой дүрэм — давтлага", "Special rules — review"],
      20,
      16,
      anyOf(castleTask("choose"), castleTask("one"), enPassantTask(), promoteTask(false), promoteTask(true))
    ),
    review(
      ["Нэг нүүдэлд мад — давтлага", "Mate in one — review"],
      25,
      20,
      anyOf(
        mate1(MATE_SPECS.backRankRook),
        mate1(MATE_SPECS.backRankQueen),
        mate1(MATE_SPECS.queenKing),
        mate1(MATE_SPECS.rookKing),
        mate1(MATE_SPECS.twoRooks)
      )
    ),
    review(
      ["Сэрээ — давтлага", "Forks — review"],
      25,
      20,
      anyOf(knightForkTask("r"), knightForkTask("q"), queenForkTask(), pawnForkTask())
    ),
    review(
      ["Хүлээс ба рентген — давтлага", "Pins and skewers — review"],
      25,
      20,
      anyOf(pinTask(), skewerTask(), discoveredTask())
    ),
    review(
      ["Хоёр нүүдэлд мад — давтлага", "Mate in two — review"],
      30,
      20,
      anyOf(
        mate2(MATE_SPECS.queenKing),
        mate2(MATE_SPECS.twoRooks),
        mate2(MATE_SPECS.queenRook),
        mate2(MATE_SPECS.backRankDefended),
        mate2(MATE_SPECS.knightQueen)
      )
    ),
    /*
     * ⚠ СҮҮЛИЙН ХИЧЭЭЛ НЬ ХОЛИМОГ: сэдвээ УРЬДЧИЛАН мэдэхгүй байх нь
     * бодит тоглолттой хамгийн ойр. Өмнөх хичээлүүд сэдвээ гарчигтаа
     * хэлдэг тул сурагч «одоо сэрээ хайна» гэж бэлддэг — энд болохгүй.
     */
    review(
      ["Холимог сорил", "Mixed challenge"],
      30,
      16,
      anyOf(
        winMaterialTask(),
        knightForkTask("q"),
        pinTask(),
        skewerTask(),
        mate2(MATE_SPECS.mixed),
        giveCheckTask(["q"], 2),
        safeCaptureTask(3, 4, 2)
      )
    ),
  ],
};
