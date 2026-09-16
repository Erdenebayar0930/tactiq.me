/**
 * ШАТАР LEVEL 4–6 — шаг, рокировка ба онцгой дүрэм, 1 нүүдэлд мад.
 *
 * ⚠ «Шаг өг», «шагаас гар» даалгаврын байрлал бүр ГАНЦ зөв хариулттай:
 * тоглуулагч хадгалсан нэг нүүдэлтэй л жишдэг тул хоёр өөр зөв хариулт
 * байвал хүүхэд зөв хийгээд «буруу» гэж сонсоно.
 */
import {
  MATE_SPECS,
  anyOf,
  blockTask,
  captureCheckerTask,
  castleTask,
  enPassantTask,
  giveCheckTask,
  kingEscapeTask,
  mateTask,
  promoteTask,
} from "./chessGenerators";
import { gen, q, type Bi, type SeedUnit } from "./chessShared";

/**
 * ⚠ Файлын ДЭЭД хэсэгт байх ёстой: `LEVEL_*` объектууд модуль ачаалах
 * үед шууд бүтээгддэг тул доор тодорхойлсон тогтмолыг хэрэглэвэл
 * «initialization-ээс өмнө хандсан» алдаа гарна.
 */
const STALEMATE_WARN: Bi = [
  "Нүүдлийн дараа хар ноён ШАТАНД байх ёстой. Шаггүй, нүүдэлгүй бол пат — тэнцээ.",
  "After your move the black king must be IN CHECK. No check and no moves means stalemate — a draw.",
];

export const LEVEL_4: SeedUnit = {
  title: ["Шаг", "Check"],
  seedKey: "Шатар Level 4 — Шаг",
  color: "rose",
  lessons: [
    {
      title: ["Шаг гэж юу вэ?", "What is check?"],
      xp: 10,
      exercises: [
        q(
          ["«Шаг» гэж юу вэ?", "What is 'check'?"],
          [["Ноён дайрагдаж байгаа байдал", "The king is being attacked"], ["Бэрс дайрагдах", "The queen is attacked"], ["Тоглолт тэнцээ болох", "The game is a draw"]],
          0,
          ["Ноён дайрагдвал «шаг». Шагт байгаа тал ЗААВАЛ дараагийн нүүдлээрээ шагаас гарна.", "When the king is attacked it is 'check'. The side in check MUST get out of it next move."]
        ),
        q(
          ["Өөрийн ноёныг шагт оруулах нүүдэл хийж болох уу?", "May you make a move that puts your own king in check?"],
          [["Үгүй — хууль бус нүүдэл", "No — it is an illegal move"], ["Тийм", "Yes"], ["Зөвхөн эхний нүүдэлд", "Only on the first move"]],
          0,
          ["Өөрийн ноёныг дайралтад үлдээх нүүдэл хэзээ ч болохгүй.", "You may never leave your own king under attack."]
        ),
        gen(giveCheckTask(["r"]), 9),
      ],
    },
    {
      title: ["Шаг өгөх", "Giving check"],
      xp: 15,
      exercises: [
        gen(giveCheckTask(["b"]), 5),
        gen(giveCheckTask(["n"]), 5),
        gen(giveCheckTask(["r", "n"], 2), 5),
      ],
    },
    {
      title: ["Шагаас гарах гурван арга", "Three ways out of check"],
      xp: 10,
      exercises: [
        q(
          ["Шагаас гарах гурван арга аль нь вэ?", "What are the three ways out of check?"],
          [["Ноёноо нүүлгэх, хаах, шаг өгсөн дүрсийг идэх", "Move the king, block, capture the checker"], ["Ноёноо нүүлгэх, рокировка, пат", "Move the king, castle, stalemate"], ["Бэрсээ өгөх, хүлээх, бууж өгөх", "Give the queen, wait, resign"]],
          0,
          ["Нүүх, хаах, идэх — энэ гурваас өөр арга байхгүй.", "Move, block, capture — there is no other way."]
        ),
        q(
          ["Шагт байхдаа рокировка хийж болох уу?", "Can you castle while in check?"],
          [["Үгүй", "No"], ["Тийм", "Yes"], ["Зөвхөн урт рокировка", "Only long castling"]],
          0,
          ["Рокировкоор шагаас гарч болохгүй.", "Castling is not a way out of check."]
        ),
        q(
          ["Морины шагийг хааж болох уу?", "Can a knight's check be blocked?"],
          [["Үгүй — морь үсэрдэг", "No — the knight jumps"], ["Тийм, хүүгээр", "Yes, with a pawn"], ["Тийм, бэрсээр", "Yes, with the queen"]],
          0,
          ["Морь дүрсний дээгүүр үсэрдэг тул түүний шагийг ХААХ боломжгүй — нүүх эсвэл идэх л үлдэнэ.", "A knight jumps, so its check can't be blocked — you must move the king or capture."]
        ),
        gen(anyOf(kingEscapeTask(), captureCheckerTask()), 6),
      ],
    },
    {
      title: ["Ноёноо зайлуул", "Move the king away"],
      xp: 15,
      exercises: [gen(kingEscapeTask(), 12)],
    },
    {
      title: ["Шагийг хаа", "Block the check"],
      xp: 15,
      exercises: [gen(blockTask(), 11)],
    },
    {
      title: ["Шаг өгсөн дүрсийг ид", "Capture the checker"],
      xp: 15,
      exercises: [gen(captureCheckerTask(), 11)],
    },
    {
      title: ["Бэрсээр шаг өгөх", "Checking with the queen"],
      xp: 15,
      exercises: [gen(giveCheckTask(["q"], 2), 10)],
    },
    {
      title: ["Шаг — Challenge", "Check — Challenge"],
      xp: 25,
      exercises: [gen(anyOf(kingEscapeTask(), blockTask(), captureCheckerTask(), giveCheckTask(["q"], 2)), 15)],
    },
  ],
};

export const LEVEL_5: SeedUnit = {
  title: ["Рокировка ба онцгой дүрэм", "Castling and special rules"],
  seedKey: "Шатар Level 5 — Рокировка ба онцгой дүрэм",
  color: "orange",
  lessons: [
    {
      title: ["Рокировка", "Castling"],
      xp: 15,
      exercises: [
        q(
          ["Рокировкод ноён хэдэн нүд нүүх вэ?", "How many squares does the king move when castling?"],
          [["Хоёр нүд, тэрэг тийш", "Two squares towards the rook"], ["Нэг нүд", "One square"], ["Булан хүртэл", "All the way to the corner"]],
          0,
          ["Ноён тэрэг тийш 2 нүд нүүж, тэрэг ноёны нөгөө талд үсэрч ирнэ.", "The king moves two squares towards the rook, and the rook hops to the other side of the king."]
        ),
        q(
          ["Рокировка ямар зорилготой вэ?", "What is castling for?"],
          [["Ноёныг аюулгүй болгож, тэргийг тоглолтод оруулах", "Tuck the king to safety and bring the rook into play"], ["Бэрсийг хамгаалах", "Protect the queen"], ["Хүү бэрс болгох", "Promote a pawn"]],
          0,
          ["Нэг нүүдлээр хоёр ажил: ноён буланд нуугдаж, тэрэг төв рүү гарна.", "Two jobs in one move: the king hides in the corner and the rook comes to the centre."]
        ),
        gen(castleTask("one"), 12),
      ],
    },
    {
      title: ["Рокировка хийж болохгүй үе", "When you can't castle"],
      xp: 20,
      exercises: [
        q(
          ["Аль үед рокировка хийж БОЛОХГҮЙ вэ?", "When is castling NOT allowed?"],
          [["Ноён эсвэл тэрэг аль хэдийн нүүсэн бол", "If the king or that rook has already moved"], ["Бэрс нүүсэн бол", "If the queen has moved"], ["Тоглолтын 10-р нүүдлээс хойш", "After move 10"]],
          0,
          ["Ноён ба тэр тэрэг огт нүүгээгүй, завсар нь хоосон байх ёстой.", "The king and that rook must never have moved, and the squares between must be empty."]
        ),
        q(
          ["Ноён дайрагдсан нүдийг ДАМЖИЖ рокировка хийж болох уу?", "May the king castle THROUGH an attacked square?"],
          [["Үгүй", "No"], ["Тийм", "Yes"], ["Зөвхөн богино рокировкод", "Only when castling short"]],
          0,
          ["Ноён шагт байж, дайрагдсан нүдийг дамжиж, дайрагдсан нүдэнд буух — гурвуулаа хориотой.", "Out of check, through check, into check — all three are forbidden."]
        ),
        gen(castleTask("choose"), 14),
      ],
    },
    {
      title: ["Хувиргалт ба en passant давтлага", "Promotion and en passant review"],
      xp: 15,
      exercises: [gen(promoteTask(true), 5), gen(promoteTask(false), 3), gen(enPassantTask(), 6)],
    },
    {
      title: ["Пат", "Stalemate"],
      xp: 10,
      exercises: [
        q(
          ["«Пат» гэж юу вэ?", "What is stalemate?"],
          [["Нүүх ээлжтэй тал шаггүй ч ямар ч хууль ёсны нүүдэлгүй — тэнцээ", "The side to move is not in check but has no legal move — a draw"], ["Ноён шагт, нүүдэлгүй — хожил", "The king is in check with no moves — a win"], ["Хоёр ноён хөрш зогсох", "The kings stand next to each other"]],
          0,
          ["Пат бол ТЭНЦЭЭ. Их илүү материалтай үедээ пат хийчихвэл хожлоо алдана!", "Stalemate is a DRAW. Stalemating when you are far ahead throws the win away!"]
        ),
        q(
          ["Мад ба патын ялгаа юу вэ?", "What is the difference between checkmate and stalemate?"],
          [["Мадад ноён шагт, патад шаггүй", "In checkmate the king is in check, in stalemate it is not"], ["Ялгаа байхгүй", "There is no difference"], ["Пат нь хожил", "Stalemate is a win"]],
          0,
          ["Хоёуланд нь нүүдэл байхгүй. Шаг байвал МАД (хожил), шаггүй бол ПАТ (тэнцээ).", "Both have no legal moves. With check it is MATE (a win), without check it is STALEMATE (a draw)."]
        ),
        q(
          ["Пат хийсэн тал хожих уу?", "Does the side that gives stalemate win?"],
          [["Үгүй — тэнцээ", "No — it is a draw"], ["Тийм", "Yes"], ["Хагас оноо хасагдана", "They lose half a point"]],
          0,
          ["Пат нь хоёр талд хагас оноо өгнө.", "Stalemate gives each side half a point."]
        ),
        gen(
          mateTask(MATE_SPECS.queenKing, 1, {
            prompt: [
              "Мад хий — гэхдээ ПАТ хийж болохгүй! Зарим нүүдэл тэнцээ болгоно.",
              "Give mate — but DON'T stalemate! Some moves only draw.",
            ],
            explain: STALEMATE_WARN,
            requireStalemateTrap: true,
          }),
          9
        ),
      ],
    },
    {
      title: ["Тэнцээний дүрэм", "Draw rules"],
      xp: 10,
      exercises: [
        q(
          ["Ижил байрлал ГУРВАН удаа давтагдвал юу болох вэ?", "What happens if the same position occurs THREE times?"],
          [["Тэнцээ", "Draw"], ["Цагаан хожно", "White wins"], ["Дахин эхэлнэ", "The game restarts"]],
          0,
          ["Гурван удаагийн давталт — тэнцээ.", "Threefold repetition — draw."]
        ),
        q(
          ["Хоёр ноён л үлдвэл юу болох вэ?", "What happens if only the two kings are left?"],
          [["Тэнцээ — мад хийх материал алга", "Draw — nobody can give mate"], ["Нүүсэн тал хожно", "The side to move wins"], ["Тоглолт үргэлжилнэ", "The game goes on"]],
          0,
          ["Ноён ноёноо ганцаараа мад хийж чадахгүй.", "A king alone can never checkmate."]
        ),
        q(
          ["Ноён + нэг МОРЬ хар ноёнд мад хийж чадах уу?", "Can king + one KNIGHT checkmate a lone king?"],
          [["Үгүй — хангалтгүй материал", "No — insufficient material"], ["Тийм, ямагт", "Yes, always"], ["Зөвхөн буланд", "Only in the corner"]],
          0,
          ["Ноён + морь эсвэл ноён + тэмээ нь мад хийхэд хүрэлцэхгүй.", "King + knight or king + bishop is not enough to force mate."]
        ),
        gen(
          mateTask(MATE_SPECS.rookKing, 1, {
            prompt: [
              "Хожлоо тэнцээ болгож болохгүй! Пат биш, МАД хий.",
              "Don't turn a win into a draw! Give MATE, not stalemate.",
            ],
            explain: STALEMATE_WARN,
            requireStalemateTrap: true,
          }),
          8
        ),
      ],
    },
    {
      title: ["Рокировка давтлага", "Castling review"],
      xp: 15,
      exercises: [gen(castleTask("one"), 5), gen(castleTask("choose"), 5)],
    },
    {
      title: ["Онцгой дүрэм — Challenge", "Special rules — Challenge"],
      xp: 25,
      exercises: [gen(anyOf(castleTask("choose"), castleTask("one"), enPassantTask(), promoteTask(true)), 14)],
    },
  ],
};

const MATE_IDEA: Bi = [
  "Мад = шаг + зугтах нүд алга + хаах, идэх боломж алга. Хар ноёны нүд бүрийг шалга.",
  "Mate = check + no escape square + no block or capture. Check every square around the black king.",
];

export const LEVEL_6: SeedUnit = {
  title: ["Нэг нүүдэлд мад", "Mate in one"],
  seedKey: "Шатар Level 6 — Нэг нүүдэлд мад",
  color: "teal",
  lessons: [
    {
      title: ["Мад гэж юу вэ?", "What is checkmate?"],
      xp: 15,
      exercises: [
        q(
          ["«Мад» гэж юу вэ?", "What is checkmate?"],
          [["Ноён шагт, гарах арга огт алга — тоглолт дуусна", "The king is in check with no way out — the game ends"], ["Бэрс идэгдэх", "The queen gets captured"], ["Шаг өгөх бүр", "Every check"]],
          0,
          ["Мад хийсэн тал ХОЖНО. Шатрын зорилго бол мад.", "The side giving mate WINS. Checkmate is the goal of chess."]
        ),
        q(
          ["Хар ноён буланд, цагаан бэрс хажууд нь хамгаалагдсан байвал?", "The black king is in the corner and a protected white queen stands next to it. What is it?"],
          [["Мад — ноён бэрсийг идэж чадахгүй", "Mate — the king can't take the protected queen"], ["Пат", "Stalemate"], ["Шаг ч биш", "Not even check"]],
          0,
          ["Хамгаалагдсан бэрсийг ноён идэж чадахгүй. «Бэрсийн үнсэлт» мад гэж нэрлэдэг.", "The king can't take a protected queen. This is called the 'kiss of death' mate."]
        ),
        gen(mateTask(MATE_SPECS.queenKing, 1, { explain: MATE_IDEA }), 9),
      ],
    },
    {
      title: ["Сүүлийн эгнээний мад", "Back-rank mate"],
      xp: 20,
      exercises: [
        gen(
          mateTask(MATE_SPECS.backRankRook, 1, {
            explain: [
              "Хар ноёны өмнөх хүүнүүд өөрсдөө хана болж, ноён сүүлийн эгнээнээс гарч чадахгүй.",
              "Black's own pawns form a wall, so the king can't leave the back rank.",
            ],
          }),
          12
        ),
        gen(mateTask(MATE_SPECS.backRankQueen, 1, { explain: MATE_IDEA }), 6),
      ],
    },
    {
      title: ["Бэрс ба ноёны мад", "Queen and king mate"],
      xp: 20,
      exercises: [gen(mateTask(MATE_SPECS.queenKing, 1, { explain: MATE_IDEA }), 14)],
    },
    {
      title: ["Тэрэг ба ноёны мад", "Rook and king mate"],
      xp: 20,
      exercises: [
        gen(
          mateTask(MATE_SPECS.rookKing, 1, {
            explain: [
              "Цагаан ноён хар ноёны зугтах нүдийг хааж, тэрэг захын шугамаар мад хийнэ.",
              "The white king takes away the escape squares and the rook mates along the edge.",
            ],
          }),
          14
        ),
      ],
    },
    {
      title: ["Хоёр тэргийн мад", "Two-rook mate"],
      xp: 20,
      exercises: [
        gen(
          mateTask(MATE_SPECS.twoRooks, 1, {
            explain: [
              "Нэг тэрэг эгнээг хааж, нөгөө нь мад хийнэ — «шатны мад».",
              "One rook guards a line while the other gives mate — the 'ladder mate'.",
            ],
          }),
          12
        ),
      ],
    },
    {
      title: ["Бэрс ба тэрэг", "Queen and rook"],
      xp: 20,
      exercises: [gen(mateTask(MATE_SPECS.queenRook, 1, { explain: MATE_IDEA }), 12)],
    },
    {
      title: ["Морь, тэмээний мад", "Knight and bishop mates"],
      xp: 25,
      exercises: [
        gen(
          mateTask(MATE_SPECS.minors, 1, {
            explain: [
              "Хөнгөн дүрсүүд ч мад хийнэ: морь үсэрч шаг өгч, тэмээ ба ноён зугтах нүдийг хаана.",
              "Minor pieces can mate too: the knight jumps in with check while bishop and king cover the escapes.",
            ],
          }),
          // ⚠ 7: ноён + морь + тэмээний ГАНЦ шийдэлтэй мад ховор (dry-run-д
          // оролдлогын хязгаарт 7 л олдсон) — дутууг бэрс + морины мадаар нөхнө.
          7
        ),
        gen(mateTask(MATE_SPECS.knightQueen, 1, { explain: MATE_IDEA }), 10),
      ],
    },
    {
      title: ["Хамгаалагдсан сүүлийн эгнээ", "A defended back rank"],
      xp: 25,
      exercises: [
        gen(
          mateTask(MATE_SPECS.backRankDefended, 1, {
            explain: [
              "Хар тэрэг ганцаараа хоёр довтлогчийг хамгаалж чадахгүй. Аль шугам хамгаалалтгүй байгааг ол.",
              "One black rook can't hold off two attackers. Find the line that is not covered.",
            ],
          }),
          12
        ),
      ],
    },
    {
      title: ["Нэг нүүдэлд мад — Challenge", "Mate in one — Challenge"],
      xp: 30,
      exercises: [
        gen(
          anyOf(
            mateTask(MATE_SPECS.mixed, 1, { explain: MATE_IDEA }),
            mateTask(MATE_SPECS.knightQueen, 1, { explain: MATE_IDEA }),
            mateTask(MATE_SPECS.queenRook, 1, { explain: MATE_IDEA }),
            mateTask(MATE_SPECS.backRankDefended, 1, { explain: MATE_IDEA })
          ),
          16
        ),
      ],
    },
  ],
};
