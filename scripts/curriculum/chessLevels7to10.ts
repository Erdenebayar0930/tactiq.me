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

export const LEVEL_9: SeedUnit = {
  title: ["Эндшпиль", "Endgames"],
  seedKey: "Шатар Level 9 — Эндшпиль",
  color: "lime",
  lessons: [
    {
      title: ["Оппозици", "The opposition"],
      xp: 20,
      exercises: [
        q(
          ["«Оппозици» гэж юу вэ?", "What is the opposition?"],
          [["Хаад нэг нүд завсартай нүүр тулах — нүүх ээлжтэй тал ухардаг", "Kings face each other one square apart — the side to move must give way"], ["Хоёр бэрс солилцох", "Trading queens"], ["Ноён буланд нуугдах", "Hiding the king in a corner"]],
          0,
          ["Оппозици авсан ноён өрсөлдөгчийн ноёныг түлхэж, хүүдээ зам гаргана.", "The king with the opposition pushes the other king back and clears the way for the pawn."]
        ),
        gen(oppositionTask(), 12),
      ],
    },
    {
      title: ["Квадратын дүрэм", "The rule of the square"],
      xp: 20,
      exercises: [
        q(
          ["Хар ноён хүүг гүйцэх эсэхийг хэрхэн хурдан мэдэх вэ?", "How can you quickly tell if the black king catches a pawn?"],
          [["Хүүгээс сүүлийн эгнээ хүртэл квадрат зурж, ноён дотор нь орж чадах эсэхийг харах", "Draw a square from the pawn to the last rank and see if the king can step inside"], ["Нүд тоолох шаардлагагүй", "No need to count"], ["Ноён ямагт гүйцнэ", "The king always catches it"]],
          0,
          ["Квадрат дотор орж чадвал гүйцнэ, чадахгүй бол хүү бэрс болно.", "If the king can enter the square it catches the pawn; if not, the pawn queens."]
        ),
        gen(runnerTask(), 10),
      ],
    },
    {
      title: ["Бэрсээр мад хийх", "Mating with the queen"],
      xp: 20,
      exercises: [
        gen(mateTask(MATE_SPECS.queenKing, 1, { explain: MATE_KQ() }), 8),
        gen(mateTask(MATE_SPECS.queenKing, 2, { explain: MATE_KQ() }), 6),
      ],
    },
    {
      title: ["Тэргээр мад хийх", "Mating with the rook"],
      xp: 25,
      exercises: [
        gen(
          mateTask(MATE_SPECS.rookKing, 1, {
            explain: [
              "Тэрэг ба ноён хамтарч л мад хийнэ: хаад нүүр тулж, тэрэг захын шугамаар шаг өгнө.",
              "Rook and king work together: the kings face each other and the rook checks along the edge.",
            ],
          }),
          8
        ),
        gen(mateTask(MATE_SPECS.rookKing, 2, { explain: MATE2_IDEA }), 6),
      ],
    },
    {
      title: ["Пат бүү хий!", "Don't stalemate!"],
      xp: 25,
      exercises: [
        q(
          ["Их илүү материалтай үедээ юуг хамгийн түрүүнд анхаарах вэ?", "When you are far ahead, what must you watch out for?"],
          [["Пат хийхгүй байх — хар ноёнд нүүдэл үлдээх", "Avoid stalemate — leave the black king a move"], ["Бэрсээ хурдан солих", "Trade queens quickly"], ["Ноёноо буланд нуух", "Hide your king in a corner"]],
          0,
          ["Хожих байрлалыг пат хийгээд тэнцээ болгох нь эхлэгчдийн хамгийн гунигтай алдаа.", "Turning a won game into a stalemate draw is the saddest beginner mistake."]
        ),
        gen(mateTask(MATE_SPECS.queenKing, 1, { explain: STALEMATE_TRAP, requireStalemateTrap: true }), 12),
      ],
    },
    {
      title: ["Хүү бэрс болгох", "Promoting the pawn"],
      xp: 20,
      exercises: [gen(promoteTask(true), 5), gen(runnerTask(), 5)],
    },
    {
      title: ["Оппозици давтлага", "Opposition review"],
      xp: 20,
      exercises: [gen(oppositionTask(), 12)],
    },
    {
      title: ["Хүүгийн уралдаан", "Pawn races"],
      xp: 20,
      exercises: [gen(runnerTask(), 10)],
    },
    {
      title: ["Эндшпиль — Challenge", "Endgames — Challenge"],
      xp: 30,
      exercises: [
        gen(
          anyOf(
            oppositionTask(),
            runnerTask(),
            mateTask(MATE_SPECS.rookKing, 2, { explain: MATE2_IDEA }),
            mateTask(MATE_SPECS.queenKing, 1, { explain: STALEMATE_TRAP, requireStalemateTrap: true })
          ),
          14
        ),
      ],
    },
  ],
};

function MATE_KQ(): Bi {
  return [
    "Бэрс хар ноёныг зах руу шахаж, цагаан ноён ойртож ирээд мад хийнэ.",
    "The queen pushes the black king to the edge, the white king comes closer, and then it's mate.",
  ];
}

/** SAN мөрийн дараах байрлал — нээлтийн бодлогыг бодит тоглолтоос. */
const fenAfter = (line: string) => {
  const chess = new Chess();
  for (const san of line.split(" ")) chess.move(san);
  return chess.fen();
};

const TRAP_PROMPT: Bi = [
  "Хар тал нээлтэд алдаа хийлээ. Нэг нүүдлээр мад хий!",
  "Black made an opening mistake. Checkmate in one!",
];

export const LEVEL_10: SeedUnit = {
  title: ["Нээлтийн зарчим", "Opening principles"],
  seedKey: "Шатар Level 10 — Нээлтийн зарчим",
  color: "cyan",
  lessons: [
    {
      title: ["Төвийг эзэл", "Take the centre"],
      xp: 20,
      exercises: [
        q(
          ["Хөлгийн «төв» аль нүднүүд вэ?", "Which squares are the 'centre'?"],
          [["e4, d4, e5, d5", "e4, d4, e5, d5"], ["a1, h1, a8, h8", "a1, h1, a8, h8"], ["Бэрс ба ноёны нүд", "The king and queen squares"]],
          0,
          ["Төвийн дөрвөн нүд — эндээс дүрсүүд хамгийн олон чиглэлд ажиллана.", "The four centre squares — pieces there work in the most directions."]
        ),
        q(
          ["Нээлтийн эхний нүүдэлд аль нь хамгийн сайн вэ?", "Which is the best kind of first move?"],
          [["Төвийн хүү (e4 эсвэл d4)", "A centre pawn (e4 or d4)"], ["Захын хүү (a4 эсвэл h4)", "An edge pawn (a4 or h4)"], ["Бэрсээ гаргах", "Bring out the queen"]],
          0,
          ["Төвийн хүү төвийг эзэлж, тэмээ, бэрст зам нээнэ.", "A centre pawn takes space and opens lines for the bishop and queen."]
        ),
        gen(openingTask("center"), 10),
      ],
    },
    {
      title: ["Дүрсээ хөгжүүл", "Develop your pieces"],
      xp: 20,
      exercises: [
        q(
          ["Нээлтэд бэрсээ ЭРТ гаргах нь яагаад муу вэ?", "Why is bringing the queen out EARLY a bad idea?"],
          [["Хөнгөн дүрсүүд дайрч, бэрс олон удаа зугтах болж цаг алдана", "Minor pieces attack her and you waste time running away"], ["Бэрс нүүж чадахгүй", "The queen can't move yet"], ["Хууль бус", "It is illegal"]],
          0,
          ["Эхлээд морь, тэмээ, дараа нь рокировка, бэрс нь сүүлд.", "Knights and bishops first, then castle, and the queen later."]
        ),
        q(
          ["«Морь захад — гашуудал» гэдэг яагаад вэ?", "Why do people say 'a knight on the rim is dim'?"],
          [["Захад морь цөөн нүдэнд хүрдэг", "On the edge a knight reaches few squares"], ["Захад морь идэгдэхгүй", "On the edge a knight can't be captured"], ["Хууль бус нүд", "It is an illegal square"]],
          0,
          ["Төвд морь 8 нүд, буланд ердөө 2 нүдийг дайрна.", "In the centre a knight attacks 8 squares, in the corner only 2."]
        ),
        gen(openingTask("develop"), 14),
      ],
    },
    {
      title: ["Рокировка нээлтэд", "Castle early"],
      xp: 20,
      exercises: [
        q(
          ["Нээлтэд хэзээ рокировка хийх вэ?", "When should you castle in the opening?"],
          [["Хөнгөн дүрсээ гаргасны дараа, ЭРТ", "EARLY, soon after developing your minor pieces"], ["Хэзээ ч үгүй", "Never"], ["Эндшпильд", "In the endgame"]],
          0,
          ["Ноён аюулгүй, тэрэгнүүд холбогдоно — хоёр ашиг нэг нүүдлээр.", "The king is safe and the rooks connect — two benefits in one move."]
        ),
        gen(openingTask("castle"), 10),
      ],
    },
    {
      title: ["Нээлтийн урхи", "Opening traps"],
      xp: 25,
      exercises: [
        q(
          ["Нээлтэд хар талын хамгийн сул нүд аль вэ?", "Which is Black's weakest square in the opening?"],
          [["f7 — зөвхөн ноён хамгаалдаг", "f7 — only the king defends it"], ["e5", "e5"], ["a7", "a7"]],
          0,
          ["f7 (цагааны хувьд f2) нь нээлтэд зөвхөн ноёноор хамгаалагддаг — олон урхи тэнд.", "f7 (f2 for White) is guarded only by the king early on — many traps target it."]
        ),
        fixedPuzzle(fenAfter("e4 e5 Bc4 Nc6 Qh5 Nf6"), "h5f7", { kind: "mate" }, TRAP_PROMPT, [
          "«Сурагчийн мад»: бэрс тэмээний хамгаалалттай f7-г иднэ. Хар тал Qe7 эсвэл g6-аар хамгаалах ёстой байв.",
          "'Scholar's mate': the queen takes f7, protected by the bishop. Black should have defended with ...Qe7 or ...g6.",
        ]),
        fixedPuzzle(fenAfter("e4 e5 Qh5 Ke7"), "h5e5", { kind: "mate" }, TRAP_PROMPT, [
          "Ноёноо нээлтэд төвд урагшлуулах нь аюултай — бэрс e5-ыг идэж мад хийнэ.",
          "Walking the king forward in the opening is dangerous — the queen takes e5 with mate.",
        ]),
        fixedPuzzle(fenAfter("e4 e5 Nf3 d6 Bc4 Bg4 Nc3 g6 Nxe5 Bxd1 Bxf7+ Ke7"), "c3d5", { kind: "mate" }, TRAP_PROMPT, [
          "«Легалийн мад»: цагаан бэрсээ өгч, хөнгөн дүрсүүдээр мад хийлээ. Бэрсээс илүү мад чухал!",
          "'Légal's mate': White gave up the queen and mated with the minor pieces. Mate beats material!",
        ]),
      ],
    },
    {
      title: ["Нээлтийн алдаанууд", "Opening mistakes"],
      xp: 15,
      exercises: [
        q(
          ["Нээлтэд нэг дүрсээр олон удаа нүүх нь яагаад муу вэ?", "Why is moving the same piece many times in the opening bad?"],
          [["Бусад дүрс гарахгүй хоцорно", "Your other pieces stay at home"], ["Хууль бус", "It is illegal"], ["Дүрс ядарна", "The piece gets tired"]],
          0,
          ["Нэг нүүдэл — нэг шинэ дүрс. Хөгжүүлэлтээр хоцорвол довтолгоонд өртнө.", "One move — one new piece. Falling behind in development invites an attack."]
        ),
        q(
          ["f2, g2, h2 хүүг эрт түлхвэл юу болох вэ?", "What happens if you push the f-, g- and h-pawns early?"],
          [["Ноёны хамгаалалт суларна", "Your king's shelter gets weaker"], ["Ноён хүчтэй болно", "Your king gets stronger"], ["Юу ч болохгүй", "Nothing happens"]],
          0,
          ["«Тэнэгийн мад» (1.f3 e5 2.g4 Qh4#) — ноёны өмнөх хүүг болгоомжгүй хөдөлгөсний үр дүн.", "'Fool's mate' (1.f3 e5 2.g4 Qh4#) shows what careless pawn moves near the king can do."]
        ),
        q(
          ["Өрсөлдөгч «үнэгүй» дүрс өгвөл юу хийх вэ?", "What should you do if the opponent offers a 'free' piece?"],
          [["Идэхээс өмнө урхи байгаа эсэхийг шалгах", "Check for a trap before taking"], ["Шууд идэх", "Take it immediately"], ["Хэзээ ч идэхгүй", "Never take it"]],
          0,
          ["Легалийн мад шиг урхинд бэрс «үнэгүй» мэт харагддаг.", "In traps like Légal's mate the queen looks 'free'."]
        ),
        gen(openingTask("develop"), 10),
      ],
    },
    {
      title: ["Нээлт — Challenge", "Openings — Challenge"],
      xp: 30,
      exercises: [gen(anyOf(openingTask("center"), openingTask("develop"), openingTask("castle")), 12)],
    },
  ],
};
