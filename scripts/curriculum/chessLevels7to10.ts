/**
 * ШАТАР LEVEL 7–10 — тактик, 2 нүүдэлд мад, эндшпиль, нээлтийн зарчим.
 *
 * ⚠ Тактикийн бодлого (сэрээ, хүлээс, рентген) мадаар төгсдөггүй тул
 * `auditWinLine`-аар шалгана: эхний ба хоёр дахь нүүдэл ЦОРЫН ГАНЦ, хар
 * тал ХАМГИЙН САЙН хамгаалалт хийсэн ч материал хожигдоно.
 *
 * ⚠ Нээлтийн зарчмыг «ганц зөв нүүдэл»-ээр шалгах нь аюултай (нээлтэд
 * олон сайн нүүдэл байдаг). Тиймээс нээлтийн хөлгийн даалгавар нь ЯГ ЯМАР
 * нүүдэл хийхийг нэрлэнэ («морио f3 рүү гарга»), зарчмыг нь асуултаар шалгана.
 */
import { Chess } from "chess.js";

import {
  MATE_SPECS,
  anyOf,
  discoveredTask,
  knightForkTask,
  mateTask,
  openingTask,
  oppositionTask,
  pawnForkTask,
  pinTask,
  promoteTask,
  queenForkTask,
  runnerTask,
  skewerTask,
  winMaterialTask,
} from "./chessGenerators";
import { fixedPuzzle, gen, q, type Bi, type SeedUnit } from "./chessShared";

const MATE2_IDEA: Bi = [
  "Эхний нүүдэл нь хар ноёны зугтах замыг хааж эсвэл хүчээр нүүлгэнэ, хоёр дахь нь мад. Хар талын бүх хариуг бод.",
  "The first move cuts off escape squares or forces the king's reply; the second is mate. Consider every Black reply.",
];

export const LEVEL_7: SeedUnit = {
  title: ["Тактик", "Tactics"],
  seedKey: "Шатар Level 7 — Тактик",
  color: "indigo",
  lessons: [
    {
      title: ["Морины сэрээ", "Knight forks"],
      xp: 20,
      exercises: [
        q(
          ["«Сэрээ» гэж юу вэ?", "What is a fork?"],
          [["Нэг дүрс хоёр ба түүнээс дээш дүрсийг зэрэг дайрах", "One piece attacking two or more pieces at once"], ["Хоёр дүрс нэг дүрсийг дайрах", "Two pieces attacking one"], ["Дүрсээ ухраах", "Retreating a piece"]],
          0,
          ["Өрсөлдөгч нэг нүүдлээр хоёр дүрсээ зэрэг аварч чадахгүй.", "The opponent can't save both pieces in one move."]
        ),
        gen(knightForkTask("r"), 11),
      ],
    },
    {
      title: ["Бэрсийг сэрээдэх", "Forking the queen"],
      xp: 20,
      exercises: [gen(knightForkTask("q"), 11)],
    },
    {
      title: ["Бэрсийн сэрээ", "Queen forks"],
      xp: 20,
      exercises: [gen(queenForkTask(), 11)],
    },
    {
      title: ["Хүүгийн сэрээ", "Pawn forks"],
      xp: 20,
      exercises: [gen(pawnForkTask(), 11)],
    },
    {
      title: ["Хүлээс", "Pins"],
      xp: 25,
      exercises: [
        q(
          ["«Хүлээс» гэж юу вэ?", "What is a pin?"],
          [["Ард нь үнэтэй дүрс байгаа тул нүүж чадахгүй болсон дүрс", "A piece that can't move because a more valuable piece is behind it"], ["Идэгдсэн дүрс", "A captured piece"], ["Хоёр хүү хөрш зогсох", "Two pawns side by side"]],
          0,
          ["Ард нь НОЁН байвал хүлээстэй дүрс огт нүүж чадахгүй (хууль бус).", "If the KING is behind it, the pinned piece may not move at all (illegal)."]
        ),
        gen(pinTask(), 11),
      ],
    },
    {
      title: ["Рентген", "Skewers"],
      xp: 25,
      exercises: [
        q(
          ["Рентген ба хүлээсийн ялгаа юу вэ?", "What is the difference between a skewer and a pin?"],
          [["Рентгенд үнэтэй дүрс нь урдаа, хүлээсэнд ард нь", "In a skewer the valuable piece is in front, in a pin it is behind"], ["Ялгаа алга", "No difference"], ["Рентгенийг зөвхөн морь хийдэг", "Only knights skewer"]],
          0,
          ["Рентгенд урдах дүрс (ихэвчлэн ноён) зайлах ёстой, ард нь байгаа дүрс идэгдэнэ.", "In a skewer the front piece (often the king) must move and the one behind is captured."]
        ),
        gen(skewerTask(), 11),
      ],
    },
    {
      title: ["Нээлттэй дайралт", "Discovered attacks"],
      xp: 25,
      exercises: [
        q(
          ["«Нээлттэй шаг» гэж юу вэ?", "What is a discovered check?"],
          [["Урдах дүрс нүүж, ард нь байгаа дүрс шаг өгөх", "A piece moves away and the piece behind it gives check"], ["Шагийг хаах", "Blocking a check"], ["Хоёр удаа шаг өгөх", "Checking twice in a row"]],
          0,
          ["Нүүсэн дүрс өөр газар дайрч чадна — өрсөлдөгч шагаас гарах ёстой тул түүнийг зогсоож чадахгүй.", "The moving piece is free to attack elsewhere — the opponent must deal with the check first."]
        ),
        gen(discoveredTask(), 11),
      ],
    },
    {
      title: ["Сэрээ давтлага", "Forks review"],
      xp: 25,
      exercises: [gen(anyOf(knightForkTask("r"), knightForkTask("q"), pawnForkTask()), 12)],
    },
    {
      title: ["Тактик — Challenge", "Tactics — Challenge"],
      xp: 30,
      exercises: [
        gen(
          anyOf(knightForkTask("r"), knightForkTask("q"), queenForkTask(), pawnForkTask(), pinTask(), skewerTask(), discoveredTask(), winMaterialTask()),
          16
        ),
      ],
    },
  ],
};

export const LEVEL_8: SeedUnit = {
  title: ["Хоёр нүүдэлд мад", "Mate in two"],
  seedKey: "Шатар Level 8 — Хоёр нүүдэлд мад",
  color: "amber",
  lessons: [
    {
      title: ["Бэрс, ноён — 2 нүүдэл", "Queen and king — mate in two"],
      xp: 25,
      exercises: [
        q(
          ["2 нүүдэлд мадын бодлогыг хэрхэн бодох вэ?", "How do you solve a mate-in-two?"],
          [["Эхний нүүдлийн дараа хар талын БҮХ хариуг шалгах", "After the first move, check EVERY Black reply"], ["Эхний шагийг шууд хийх", "Always play the first check"], ["Хамгийн их дүрс идэх", "Capture as much as possible"]],
          0,
          ["Хар тал хамгийн сайн хамгаалалтаа хийнэ гэж бод. Заримдаа эхний нүүдэл нь шаг ч биш!", "Assume Black finds the best defence. Sometimes the first move isn't even a check!"]
        ),
        gen(mateTask(MATE_SPECS.queenKing, 2, { explain: MATE2_IDEA }), 11),
      ],
    },
    {
      title: ["Хоёр тэрэг — 2 нүүдэл", "Two rooks — mate in two"],
      xp: 25,
      exercises: [gen(mateTask(MATE_SPECS.twoRooks, 2, { explain: MATE2_IDEA }), 12)],
    },
    {
      title: ["Бэрс ба тэрэг — 2 нүүдэл", "Queen and rook — mate in two"],
      xp: 25,
      exercises: [gen(mateTask(MATE_SPECS.queenRook, 2, { explain: MATE2_IDEA }), 12)],
    },
    {
      title: ["Сүүлийн эгнээ — 2 нүүдэл", "Back rank — mate in two"],
      xp: 25,
      exercises: [gen(mateTask(MATE_SPECS.backRankDefended, 2, { explain: MATE2_IDEA }), 12)],
    },
    {
      title: ["Морь ба бэрс — 2 нүүдэл", "Knight and queen — mate in two"],
      xp: 30,
      exercises: [gen(mateTask(MATE_SPECS.knightQueen, 2, { explain: MATE2_IDEA }), 12)],
    },
    {
      title: ["Хосолсон довтолгоо", "Combined attacks"],
      xp: 30,
      exercises: [gen(mateTask(MATE_SPECS.mixed, 2, { explain: MATE2_IDEA }), 12)],
    },
    {
      title: ["Материал хожих комбинаци", "Winning combinations"],
      xp: 30,
      exercises: [gen(winMaterialTask(), 12)],
    },
    {
      title: ["Тэрэг, ноён — 2 нүүдэл", "Rook and king — mate in two"],
      xp: 30,
      exercises: [gen(mateTask(MATE_SPECS.rookKing, 2, { explain: MATE2_IDEA }), 10)],
    },
    {
      title: ["Хоёр нүүдэлд мад — Challenge", "Mate in two — Challenge"],
      xp: 35,
      exercises: [
        gen(
          anyOf(
            mateTask(MATE_SPECS.queenRook, 2, { explain: MATE2_IDEA }),
            mateTask(MATE_SPECS.twoRooks, 2, { explain: MATE2_IDEA }),
            mateTask(MATE_SPECS.mixed, 2, { explain: MATE2_IDEA }),
            mateTask(MATE_SPECS.minors, 2, { explain: MATE2_IDEA })
          ),
          15
        ),
      ],
    },
  ],
};

const STALEMATE_TRAP: Bi = [
  "Анхаар: зарим нүүдэл хар ноёныг ПАТ-д оруулна (тэнцээ). Ноён шагт байгаа эсэхийг шалгаж, мадыг ол.",
  "Careful: some moves STALEMATE the black king (a draw). Make sure your move gives check — find the mate.",
];
