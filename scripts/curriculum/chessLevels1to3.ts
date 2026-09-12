/**
 * ШАТАР LEVEL 1–3 — хөлөг, дүрсийн нүүдэл, идэлт (огт мэдэхгүй хүүхдээс).
 *
 * Даамын хөтөлбөртэй ижил зарчим: хичээл бүр ОЙЛГОЛТ (богино асуулт) +
 * ДАДЛАГА (хөлөг дээрх бодит нүүдэл). Гэхдээ шатарт дадлага нь ЗОНХИЛНО —
 * координат, дүрсийн нүүдлийг зөвхөн хөлөг дээр хийж байж сурдаг.
 *
 * ⚠ Хөлөг дээрх дасгал бүр `chessGenerators.ts`-ээс гарч, `validateTask`-аар
 * «ганц зөв хариулттай» гэдгийг нь шалгуулна.
 */
import {
  anyOf,
  captureTypeTask,
  enPassantTask,
  openingTask,
  promoteTask,
  reachTask,
  safeCaptureTask,
} from "./chessGenerators";
import { gen, q, type SeedUnit } from "./chessShared";

const COORD_EXPLAIN: [string, string] = [
  "Нүдний нэр = БАГАНА (a–h, зүүнээс баруун) + ЭГНЭЭ (1–8, цагаан талаас). Жишээ нь e4.",
  "A square's name = FILE (a–h, left to right) + RANK (1–8, from White's side). For example e4.",
];

export const LEVEL_1: SeedUnit = {
  title: ["Хөлөг ба нүд", "The board and squares"],
  seedKey: "Шатар Level 1 — Хөлөг ба нүд",
  color: "emerald",
  lessons: [
    {
      title: ["Шатрын хөлөгтэй танилцах", "Meet the chessboard"],
      xp: 10,
      exercises: [
        q(
          ["Шатрын хөлөг хэдэн нүдтэй вэ?", "How many squares does a chessboard have?"],
          [["64 (8×8)", "64 (8×8)"], ["100 (10×10)", "100 (10×10)"], ["36 (6×6)", "36 (6×6)"]],
          0,
          ["Шатрын хөлөг 8 багана × 8 эгнээ = 64 нүд.", "A chessboard has 8 files × 8 ranks = 64 squares."]
        ),
        q(
          ["Хөлгийг зөв тавихад баруун доод булан ямар өнгөтэй вэ?", "When the board is set up correctly, what colour is the bottom-right corner?"],
          [["Цагаан (цайвар)", "Light"], ["Хар (бараан)", "Dark"], ["Аль нь ч болно", "It doesn't matter"]],
          0,
          ["«Баруун гарт цагаан» — баруун доод нүд ямагт цайвар.", "'Light on the right' — the bottom-right square is always light."]
        ),
        q(
          ["Хэн эхэлж нүүдэг вэ?", "Who moves first?"],
          [["Цагаан", "White"], ["Хар", "Black"], ["Сугалаагаар", "By lot"]],
          0,
          ["Шатарт ямагт цагаан эхэлнэ.", "In chess White always moves first."]
        ),
        q(
          ["Тал бүр хэдэн дүрстэй эхлэх вэ?", "How many pieces does each side start with?"],
          [["16", "16"], ["20", "20"], ["12", "12"]],
          0,
          ["8 хүү + 8 том дүрс (ноён, бэрс, 2 тэрэг, 2 тэмээ, 2 морь) = 16.", "8 pawns + 8 pieces (king, queen, 2 rooks, 2 bishops, 2 knights) = 16."]
        ),
        gen(reachTask("k", { explain: COORD_EXPLAIN }), 8),
      ],
    },
    {
      title: ["Багана: a–h", "Files: a to h"],
      xp: 10,
      exercises: [
        q(
          ["Босоо шугамыг юу гэдэг вэ, яаж нэрлэдэг вэ?", "What are the vertical lines called and how are they named?"],
          [["Багана — a-аас h хүртэл үсгээр", "Files — letters a to h"], ["Эгнээ — 1-ээс 8 хүртэл", "Ranks — numbers 1 to 8"], ["Ташуу — өнгөөр", "Diagonals — by colour"]],
          0,
          ["Босоо шугам = БАГАНА, цагаан талаас харахад зүүнээс a, b, c … h.", "Vertical lines are FILES: a, b, c … h from left to right (seen from White)."]
        ),
        gen(reachTask("r", { explain: COORD_EXPLAIN, minDistance: 2 }), 11),
      ],
    },
    {
      title: ["Эгнээ: 1–8", "Ranks: 1 to 8"],
      xp: 10,
      exercises: [
        q(
          ["Цагаан дүрсүүд аль эгнээнүүдэд эхэлдэг вэ?", "On which ranks do the white pieces start?"],
          [["1 ба 2", "1 and 2"], ["7 ба 8", "7 and 8"], ["4 ба 5", "4 and 5"]],
          0,
          ["Цагаан 1–2-р эгнээнд, хар 7–8-р эгнээнд эхэлнэ.", "White starts on ranks 1–2, Black on ranks 7–8."]
        ),
        gen(reachTask("r", { explain: COORD_EXPLAIN, ownBlockers: 1 }), 11),
      ],
    },
    {
      title: ["Нүдний нэр", "Naming squares"],
      xp: 10,
      exercises: [
        q(
          ["«e4» нүд аль багана, аль эгнээнд вэ?", "Where is the square 'e4'?"],
          [["e багана, 4-р эгнээ", "File e, rank 4"], ["4-р багана, e эгнээ", "File 4, rank e"], ["e эгнээ, 4-р ташуу", "Rank e, diagonal 4"]],
          0,
          COORD_EXPLAIN
        ),
        q(
          ["Цагаан ноён эхлэхдээ аль нүдэнд байдаг вэ?", "On which square does the white king start?"],
          [["e1", "e1"], ["d1", "d1"], ["e8", "e8"]],
          0,
          ["Цагаан ноён e1, хар ноён e8 — хаад нүүр тулж зогсоно.", "The white king starts on e1 and the black king on e8 — facing each other."]
        ),
        gen(reachTask("q", { explain: COORD_EXPLAIN, minDistance: 2 }), 11),
      ],
    },
    {
      title: ["Эхлэх байрлал", "The starting position"],
      xp: 10,
      exercises: [
        q(
          ["Бэрс эхлэхдээ ямар нүдэнд зогсдог вэ?", "Where does the queen start?"],
          [["Өөрийн өнгийн нүдэнд (цагаан бэрс d1)", "On her own colour (white queen on d1)"], ["Ноёны баруун талд", "To the right of the king"], ["Буланд", "In the corner"]],
          0,
          ["«Бэрс өнгөө сонгоно»: цагаан бэрс цагаан нүд d1, хар бэрс хар нүд d8.", "'Queen on her colour': the white queen on light d1, the black queen on dark d8."]
        ),
        q(
          ["Буланд ямар дүрс зогсдог вэ?", "Which piece stands in the corners?"],
          [["Тэрэг", "Rook"], ["Морь", "Knight"], ["Тэмээ", "Bishop"]],
          0,
          ["Булангаас дотогш: тэрэг, морь, тэмээ, дараа нь бэрс ба ноён.", "From the corner inwards: rook, knight, bishop, then queen and king."]
        ),
        q(
          ["Хүүнүүд эхлэхдээ хаана байдаг вэ?", "Where do the pawns start?"],
          [["Цагаан 2-р, хар 7-р эгнээнд", "White on rank 2, Black on rank 7"], ["Цагаан 1-р эгнээнд", "White on rank 1"], ["Хөлгийн голд", "In the middle"]],
          0,
          ["Хүүнүүд том дүрсүүдийн өмнө хамгаалалтын хана болж зогсоно.", "Pawns stand in front of the pieces like a wall."]
        ),
        gen(openingTask("center"), 5),
        gen(reachTask("k", { explain: COORD_EXPLAIN, ownBlockers: 2 }), 5),
      ],
    },
    {
      title: ["Координат давтлага", "Coordinates review"],
      xp: 15,
      exercises: [
        gen(reachTask("q", { explain: COORD_EXPLAIN, ownBlockers: 2, minDistance: 3 }), 6),
        gen(reachTask("r", { explain: COORD_EXPLAIN, ownBlockers: 2, minDistance: 3 }), 6),
      ],
    },
    {
      title: ["Нүдийг ол — Challenge", "Find the square — Challenge"],
      xp: 20,
      exercises: [
        gen(anyOf(reachTask("k", { explain: COORD_EXPLAIN }), reachTask("r", { explain: COORD_EXPLAIN }), reachTask("q", { explain: COORD_EXPLAIN })), 14),
      ],
    },
  ],
};

export const LEVEL_2: SeedUnit = {
  title: ["Дүрсүүд хэрхэн нүүдэг вэ", "How the pieces move"],
  seedKey: "Шатар Level 2 — Дүрсүүд хэрхэн нүүдэг вэ",
  color: "sky",
  lessons: [
    {
      title: ["Тэрэг", "The rook"],
      xp: 10,
      exercises: [
        q(
          ["Тэрэг хэрхэн нүүдэг вэ?", "How does the rook move?"],
          [["Шулуун: босоо, хэвтээ, хэдэн ч нүд", "Straight: up, down, sideways, any distance"], ["Ташуу, хэдэн ч нүд", "Diagonally, any distance"], ["«Г» хэлбэрээр", "In an L shape"]],
          0,
          ["Тэрэг шулуун шугамаар явна, дүрсний дээгүүр үсэрдэггүй.", "The rook moves in straight lines and never jumps over pieces."]
        ),
        gen(reachTask("r", { ownBlockers: 2, minDistance: 2 }), 10),
      ],
    },
    {
      title: ["Тэмээ", "The bishop"],
      xp: 10,
      exercises: [
        q(
          ["Цайвар нүдэнд эхэлсэн тэмээ бараан нүдэнд очиж чадах уу?", "Can a bishop that starts on a light square ever reach a dark square?"],
          [["Үгүй — ташуу явдаг тул ямагт нэг өнгөн дээр", "No — it moves diagonally, so it stays on one colour"], ["Тийм, хоёр нүүдлээр", "Yes, in two moves"], ["Зөвхөн идэхдээ", "Only when capturing"]],
          0,
          ["Тэмээ ташуу явдаг тул өнгөө хэзээ ч солихгүй.", "A bishop moves diagonally, so it never changes colour."]
        ),
        gen(reachTask("b", { ownBlockers: 1, minDistance: 2 }), 10),
      ],
    },
    {
      title: ["Бэрс", "The queen"],
      xp: 10,
      exercises: [
        q(
          ["Хамгийн хүчтэй дүрс аль нь вэ?", "Which is the most powerful piece?"],
          [["Бэрс", "The queen"], ["Ноён", "The king"], ["Тэрэг", "The rook"]],
          0,
          ["Бэрс тэрэг шиг шулуун, тэмээ шиг ташуу явна — хамгийн олон нүдэнд хүрнэ.", "The queen moves like a rook and a bishop together — she reaches the most squares."]
        ),
        gen(reachTask("q", { ownBlockers: 2, minDistance: 2 }), 10),
      ],
    },
    {
      title: ["Ноён", "The king"],
      xp: 10,
      exercises: [
        q(
          ["Ноён нэг нүүдлээр хэдэн нүд явах вэ?", "How far can the king move in one turn?"],
          [["Нэг нүд, аль ч чиглэлд", "One square in any direction"], ["Хоёр нүд", "Two squares"], ["Хэдэн ч нүд", "Any distance"]],
          0,
          ["Ноён удаан ч маш чухал — түүнийг алдвал тоглолт дуусна.", "The king is slow but vital — lose him and the game is over."]
        ),
        gen(reachTask("k", { ownBlockers: 2, enemies: 1 }), 10),
      ],
    },
    {
      title: ["Морь", "The knight"],
      xp: 15,
      exercises: [
        q(
          ["Морины онцлог юу вэ?", "What is special about the knight?"],
          [["Дүрсний дээгүүр ҮСЭРЧ чадна", "It can JUMP over pieces"], ["Хойшоо явж чадахгүй", "It cannot move backwards"], ["Зөвхөн идэхдээ нүүнэ", "It moves only to capture"]],
          0,
          MOVE_RULE_N()
        ),
        gen(reachTask("n"), 6),
        gen(
          reachTask("n", {
            ownBlockers: 4,
            prompt: ["Морь үсэрнэ! {your} {to} нүд рүү нүү.", "Knights jump! Move {youren} to {to}."],
          }),
          7
        ),
      ],
    },
    {
      title: ["Хүү", "The pawn"],
      xp: 15,
      exercises: [
        q(
          ["Хүү хэрхэн нүүж, хэрхэн иддэг вэ?", "How does a pawn move and capture?"],
          [["Шулуун урагш нүүж, ТАШУУ урагш иднэ", "Moves straight forward, captures DIAGONALLY forward"], ["Ташуу нүүж, шулуун иднэ", "Moves diagonally, captures straight"], ["Аль ч чиглэлд нэг нүд", "One square in any direction"]],
          0,
          ["Хүү хэзээ ч ухрахгүй. Нүүхдээ шулуун, идэхдээ ташуу.", "A pawn never moves backwards. It moves straight but captures diagonally."]
        ),
        gen(reachTask("p", { enemies: 2 }), 6),
        gen(
          reachTask("p", {
            pawnDouble: true,
            prompt: ["Эхний нүүдэл: хүүгээ ХОЁР нүд урагшлуулж {to} рүү нүү.", "First move: push your pawn TWO squares to {to}."],
          }),
          6
        ),
      ],
    },
    {
      title: ["Хүү бэрс болох нь", "Pawn promotion"],
      xp: 15,
      exercises: [
        q(
          ["Хүү сүүлийн эгнээнд хүрвэл юу болох вэ?", "What happens when a pawn reaches the last rank?"],
          [["Ноёноос бусад дурын дүрс болно (ихэвчлэн бэрс)", "It becomes any piece except a king (usually a queen)"], ["Хөлгөөс гарна", "It leaves the board"], ["Буцаад эхлэл рүүгээ очно", "It goes back to the start"]],
          0,
          ["Энэ бол хувиргалт. Ихэнхдээ хамгийн хүчтэй дүрс — бэрсийг сонгоно.", "This is promotion. Most of the time you choose the strongest piece — a queen."]
        ),
        gen(promoteTask(false), 6),
        gen(promoteTask(true), 6),
      ],
    },
    {
      title: ["En passant — өнгөрөхөд нь идэх", "En passant"],
      xp: 20,
      exercises: [
        q(
          ["En passant-аар хэзээ идэж болох вэ?", "When can you capture en passant?"],
          [["Хажуугийн хар хүү ДӨНГӨЖ хоёр нүд нүүсэн даруйд", "Right after an enemy pawn beside you has JUST moved two squares"], ["Хүссэн үедээ", "Whenever you like"], ["Зөвхөн бэрс болохын өмнө", "Only before promoting"]],
          0,
          ["Энэ боломж ганцхан нүүдэл үргэлжилнэ — дараа нь алга болно.", "The chance lasts only one move — then it is gone."]
        ),
        gen(enPassantTask(), 9),
      ],
    },
    {
      title: ["Морины аялал", "Knight journeys"],
      xp: 15,
      exercises: [
        gen(
          reachTask("n", {
            ownBlockers: 4,
            enemies: 2,
            prompt: ["Морь үсэрнэ! {your} {to} нүд рүү нүү.", "Knights jump! Move {youren} to {to}."],
          }),
          10
        ),
      ],
    },
    {
      title: ["Дүрсүүд — Challenge", "All the pieces — Challenge"],
      xp: 25,
      exercises: [
        gen(
          anyOf(
            reachTask("r", { ownBlockers: 2, enemies: 1, minDistance: 2 }),
            reachTask("b", { ownBlockers: 2, enemies: 1, minDistance: 2 }),
            reachTask("q", { ownBlockers: 2, enemies: 2, minDistance: 2 }),
            reachTask("n", { ownBlockers: 3, enemies: 1 }),
            promoteTask(true),
            enPassantTask()
          ),
          15
        ),
      ],
    },
  ],
};

function MOVE_RULE_N(): [string, string] {
  return [
    "Морь «Г» үсгээр: хоёр нүд шулуун + нэг нүд хажуу. Замд нь дүрс байсан ч үсэрч гарна.",
    "The knight moves in an L: two squares straight + one to the side, jumping over anything in the way.",
  ];
}

export const LEVEL_3: SeedUnit = {
  title: ["Идэлт ба аюулгүй нүд", "Captures and safe squares"],
  seedKey: "Шатар Level 3 — Идэлт ба аюулгүй нүд",
  color: "violet",
  lessons: [
    {
      title: ["Дүрсийн үнэ цэнэ", "What pieces are worth"],
      xp: 10,
      exercises: [
        q(
          ["Хүүг 1 гэвэл морь хэдтэй тэнцэх вэ?", "If a pawn is worth 1, what is a knight worth?"],
          [["3", "3"], ["5", "5"], ["9", "9"]],
          0,
          ["Хүү 1, морь 3, тэмээ 3, тэрэг 5, бэрс 9.", "Pawn 1, knight 3, bishop 3, rook 5, queen 9."]
        ),
        q(
          ["Тэрэг хэдтэй тэнцэх вэ?", "What is a rook worth?"],
          [["5", "5"], ["3", "3"], ["9", "9"]],
          0,
          ["Тэрэг 5 — хөнгөн дүрс (морь, тэмээ)-ээс илүү.", "A rook is worth 5 — more than a minor piece (knight or bishop)."]
        ),
        q(
          ["Аль солилцоо ТАНД ашигтай вэ?", "Which trade is GOOD for you?"],
          [["Морио өгөөд тэрэг авах", "Give a knight, get a rook"], ["Бэрсээ өгөөд тэрэг авах", "Give a queen, get a rook"], ["Тэргээ өгөөд хүү авах", "Give a rook, get a pawn"]],
          0,
          ["3-ыг өгөөд 5-ыг авбал +2 хожно.", "Giving 3 to get 5 wins you +2."]
        ),
        q(
          ["Ноён хэдтэй тэнцэх вэ?", "What is the king worth?"],
          [["Үнэлж баршгүй — алдвал тоглолт дуусна", "Priceless — lose it and the game is over"], ["10", "10"], ["1", "1"]],
          0,
          ["Ноёныг хэзээ ч солилцдоггүй — түүнийг хамгаалах нь хамгийн чухал.", "The king is never traded — protecting it matters most."]
        ),
        gen(captureTypeTask(["q"], "r"), 6),
      ],
    },
    {
      title: ["Тэрэг, тэмээгээр идэх", "Capturing with rook and bishop"],
      xp: 15,
      exercises: [
        gen(captureTypeTask(["r"], "n"), 6),
        gen(captureTypeTask(["b"], "r"), 6),
      ],
    },
    {
      title: ["Морь, хүүгээр идэх", "Capturing with knight and pawn"],
      xp: 15,
      exercises: [
        q(
          ["Хүү ямар чиглэлд иддэг вэ?", "In which direction does a pawn capture?"],
          [["Ташуу урагш", "Diagonally forward"], ["Шулуун урагш", "Straight forward"], ["Хажуу тийш", "Sideways"]],
          0,
          ["Хүү нүүхдээ шулуун, харин идэхдээ ТАШУУ урагш.", "A pawn moves straight but captures DIAGONALLY forward."]
        ),
        gen(captureTypeTask(["n"], "q"), 6),
        gen(captureTypeTask(["p"], "n"), 6),
      ],
    },
    {
      title: ["Аль дүрсээр идэх вэ?", "Which piece captures?"],
      xp: 15,
      exercises: [
        gen(captureTypeTask(["n", "b"], "r", 2), 6),
        gen(captureTypeTask(["r", "p"], "b", 2), 6),
      ],
    },
    {
      title: ["Хамгаалалтгүй дүрс", "Undefended pieces"],
      xp: 15,
      exercises: [
        q(
          ["«Хамгаалалтгүй» дүрс гэж юу вэ?", "What is an 'undefended' piece?"],
          [["Идвэл өрсөлдөгч хариу идэж чадахгүй дүрс", "A piece the opponent cannot recapture if you take it"], ["Хөдөлж чадахгүй дүрс", "A piece that cannot move"], ["Хөлгийн захад байгаа дүрс", "A piece on the edge"]],
          0,
          ["Хамгаалалтгүй дүрсийг идэх нь үнэгүй бэлэг.", "Taking an undefended piece is a free gift."]
        ),
        gen(safeCaptureTask(2, 2), 11),
      ],
    },
    {
      title: ["Хамгаалагдсан дүрсийг бүү ид", "Don't take protected pieces"],
      xp: 20,
      exercises: [
        q(
          ["Бэрсээрээ ХҮҮГЭЭР хамгаалагдсан морийг идвэл яах вэ?", "What happens if your queen takes a knight protected by a pawn?"],
          [["Бэрсээ (9) алдаж, морь (3) авна — муу солилцоо", "You lose the queen (9) for a knight (3) — a bad trade"], ["Үнэгүй морь авна", "You win a free knight"], ["Юу ч болохгүй", "Nothing happens"]],
          0,
          ["Идэхийн өмнө «хариу идэлт байна уу?» гэж ямагт шалга.", "Before capturing, always check: can they take back?"]
        ),
        gen(safeCaptureTask(3, 3), 11),
      ],
    },
    {
      title: ["Аюулгүй идэлт давтлага", "Safe captures review"],
      xp: 20,
      exercises: [gen(safeCaptureTask(2, 3), 12)],
    },
    {
      title: ["Идэлт — Challenge", "Captures — Challenge"],
      xp: 25,
      exercises: [gen(anyOf(safeCaptureTask(3, 3, 3), safeCaptureTask(3, 4, 2), captureTypeTask(["q", "n"], "r", 2)), 15)],
    },
  ],
};
