/**
 * LEVEL 1–2 — дүрэм, эхний цохилтууд (7–9 нас).
 *
 * Хичээл бүр ОЙЛГОЛТ (сонголттой асуулт) + ДАДЛАГА (хөлөг дээрх бодит
 * байрлал) хоёроос бүрдэнэ: зөвхөн асуулт бол хүүхэд дүрмийг «мэддэг» ч
 * хөлөг дээр хийж чаддаггүй, зөвхөн дасгал бол яагаад гэдгийг мэдэхгүй.
 */
import {
  CAPTURE_EXPLAIN,
  CAPTURE_PROMPT,
  CHAIN_EXPLAIN,
  COMBO_EXPLAIN,
  COMBO_PROMPT,
  QUIET_PROMPT,
  combo,
  move,
  q,
  type SeedUnit,
} from "./draughtsShared";

export const LEVEL_1: SeedUnit = {
  title: ["Level 1 — Даамын үндэс", "Level 1 — Draughts basics"],
  color: "emerald",
  lessons: [
    {
      title: ["Самбартай танилцах", "Meet the board"],
      xp: 10,
      exercises: [
        q(
          ["Олон улсын даам ямар хэмжээтэй самбар дээр тоглогддог вэ?", "What size board is international draughts played on?"],
          [
            ["10×10 — 100 нүд", "10×10 — 100 squares"],
            ["8×8 — 64 нүд", "8×8 — 64 squares"],
            ["12×12 — 144 нүд", "12×12 — 144 squares"],
          ],
          0,
          [
            "Олон улсын даам 10×10 самбар дээр, тал бүр 20 чулуутай тоглогдоно.",
            "International draughts uses a 10×10 board with 20 pieces per side.",
          ]
        ),
        q(
          ["Чулуунууд самбарын ямар нүдэн дээр байрлах вэ?", "Which squares do the pieces stand on?"],
          [
            ["Зөвхөн ХАР (бараан) нүдэн дээр", "Only on the dark squares"],
            ["Зөвхөн цагаан нүдэн дээр", "Only on the light squares"],
            ["Аль ч нүдэн дээр", "On any square"],
          ],
          0,
          [
            "Бүх тоглолт бараан нүднүүдээр явагдана. Тиймээс албан ёсны дугаарлалт (1–50) нь зөвхөн бараан нүдийг тоолдог.",
            "All play happens on the dark squares. That is why the official numbering (1–50) counts only dark squares.",
          ]
        ),
        q(
          ["Хэн эхэлж нүүдэг вэ?", "Who moves first?"],
          [
            ["Цагаан", "White"],
            ["Хар", "Black"],
            ["Сугалаагаар", "By lot"],
          ],
          0,
          ["Даамд ямагт цагаан эхэлнэ.", "In draughts White always moves first."]
        ),
      ],
    },
    {
      title: ["Чулуугаа зөв байрлуулах", "Setting up correctly"],
      xp: 10,
      exercises: [
        q(
          ["Тал бүр хэдэн чулуутай эхлэх вэ?", "How many pieces does each side start with?"],
          [
            ["20", "20"],
            ["12", "12"],
            ["15", "15"],
          ],
          0,
          [
            "Тал бүр 20 чулуу — өөрийн талын дөрвөн эгнээг дүүргэнэ.",
            "Each side has 20 pieces, filling the four rows on its own side.",
          ]
        ),
        q(
          ["Эхлэх байрлалд хэдэн нүд хоосон үлдэх вэ?", "How many dark squares stay empty at the start?"],
          [
            ["10 — самбарын дундах хоёр эгнээ", "10 — the two middle rows"],
            ["4", "4"],
            ["Хоосон нүд байхгүй", "None"],
          ],
          0,
          [
            "50 бараан нүднээс 40 нь дүүрч, дундах 10 нүд хоосон байна. Тэр хоосон зай нь тоглолтын «талбай».",
            "Of the 50 dark squares 40 are filled, leaving 10 empty in the middle — the playing space.",
          ]
        ),
      ],
    },
    {
      title: ["Энгийн нүүдэл", "Simple moves"],
      xp: 10,
      exercises: [
        q(
          ["Энгийн бэр хэрхэн нүүдэг вэ?", "How does a man move?"],
          [
            ["Ташуу, УРАГШ, нэг нүд", "Diagonally FORWARD, one square"],
            ["Ташуу, аль ч чигт, нэг нүд", "Diagonally in any direction, one square"],
            ["Шулуун урагш, нэг нүд", "Straight forward, one square"],
          ],
          0,
          [
            "Бэр зөвхөн урагш ташуу нүүнэ. Хойш нүүх эрх нь дамка (хаан) болсны дараа гарна.",
            "A man moves only diagonally forward. Moving backwards comes only after it becomes a king.",
          ]
        ),
        move(
          QUIET_PROMPT,
          [
            "Энэ байрлалд ердөө нэг л хууль ёсны нүүдэл байна — бэр урагш ташуу.",
            "There is only one legal move here — the man steps diagonally forward.",
          ],
          4,
          { quietOnly: true },
          { whites: 2, blacks: 2 }
        ),
      ],
    },
    {
      title: ["Цохилт", "Capturing"],
      xp: 15,
      exercises: [
        q(
          ["Бэр хэрхэн ид вэ?", "How does a man capture?"],
          [
            ["Дайсны чулуун дээгүүр үсэрч, ДАРААХ хоосон нүдэнд буух", "By jumping over an enemy piece to the empty square beyond"],
            ["Дайсны чулуу дээр суух", "By landing on the enemy piece"],
            ["Хажуугаар гарах", "By passing beside it"],
          ],
          0,
          [
            "Идэхдээ дайсны чулуун дээгүүр үсэрнэ — цаана нь ХООСОН нүд байх ёстой.",
            "To capture you jump over the enemy piece — the square behind it must be empty.",
          ]
        ),
        move(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 6, { minCaptures: 1, maxCaptures: 1 }, { whites: 3, blacks: 3 }),
      ],
    },
    {
      title: ["Заавал цохих", "Capture is compulsory"],
      xp: 15,
      exercises: [
        q(
          ["Идэх боломж байхад өөр нүүдэл хийж болох уу?", "If a capture is available, may you play something else?"],
          [
            ["Болохгүй — идэлт ЗААВАЛ", "No — the capture is compulsory"],
            ["Болно, хүссэнээ сонгоно", "Yes, you may choose freely"],
            ["Зөвхөн дамка байвал болно", "Only if you have a king"],
          ],
          0,
          [
            "Идэлт заавал байдаг нь даамын гол дүрэм — тактикийн бүх санаа үүн дээр тогтдог.",
            "Compulsory capture is the core rule of draughts — every tactic is built on it.",
          ]
        ),
        q(
          ["Хоёр өөр идэлт байвал аль нь вэ?", "If two captures are possible, which must you play?"],
          [
            ["Хамгийн ОЛОН чулуу идэх цуваа", "The sequence that captures the MOST pieces"],
            ["Хамгийн ойрхон нь", "The nearest one"],
            ["Хүссэнээ", "Either one"],
          ],
          0,
          [
            "Олон улсын даамд хамгийн урт цуваа заавал сонгогдоно — тиймээс заримдаа ганц л нүүдэл хууль ёсны болно.",
            "International draughts requires the longest sequence — which is why sometimes only one move is legal.",
          ]
        ),
        move(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 5, { minCaptures: 1, maxCaptures: 1 }, { whites: 3, blacks: 4 }),
      ],
    },
    {
      title: ["Дараалсан цохилт", "Multiple captures"],
      xp: 20,
      exercises: [
        move(
          ["Цагаанаар тоглож байна. Нэг нүүдлээр хоёроос дээш чулуу ид.", "White to play. Capture two or more pieces in one move."],
          CHAIN_EXPLAIN,
          8,
          { minCaptures: 2 },
          { whites: 3, blacks: 5 }
        ),
      ],
    },
    {
      title: ["Дамка", "The king"],
      xp: 15,
      exercises: [
        q(
          ["Бэр хэзээ дамка болох вэ?", "When does a man become a king?"],
          [
            ["Өрсөлдөгчийн сүүлийн эгнээнд хүрэх үед", "When it reaches the opponent's last row"],
            ["Таван чулуу идсэн үед", "After capturing five pieces"],
            ["Тоглолтын дундуур", "Halfway through the game"],
          ],
          0,
          [
            "Сүүлийн эгнээнд хүрсэн бэр тэр дор дамка болно.",
            "A man that reaches the far row is promoted to a king immediately.",
          ]
        ),
        move(
          ["Цагаанаар тоглож байна. Бэрээ дамка болго.", "White to play. Promote your man to a king."],
          [
            "Сүүлийн эгнээнд хүрсэн бэр дамка болно — дараа нь хойш ч нүүж чадна.",
            "Reaching the last row promotes the man — afterwards it can also move backwards.",
          ],
          5,
          { mustPromote: true },
          { whites: 2, blacks: 3 }
        ),
      ],
    },
    {
      title: ["Дамканы нүүдэл", "How the king moves"],
      xp: 15,
      exercises: [
        q(
          ["Дамка хэрхэн нүүдэг вэ?", "How does a king move?"],
          [
            ["Ташуу, аль ч чигт, хэдэн ч нүд", "Diagonally, any direction, any distance"],
            ["Ташуу, зөвхөн нэг нүд", "Diagonally, one square only"],
            ["Шулуун, хэдэн ч нүд", "Straight, any distance"],
          ],
          0,
          [
            "Дамка ташуу шугамаар урагш, хойш хэдэн ч нүд явна — тиймээс бэрээс хамаагүй хүчтэй.",
            "A king slides any number of squares along a diagonal, forwards or backwards — far stronger than a man.",
          ]
        ),
        move(
          ["Цагаанаар тоглож байна. Дамкаараа цохи.", "White to play. Capture with your king."],
          [
            "Дамка холоос цохино: идсэн чулууны цаана хоосон нүд байвал аль ч зайд буух боломжтой.",
            "A king captures from a distance: it may land on any empty square beyond the captured piece.",
          ],
          5,
          { minCaptures: 1 },
          { whites: 1, blacks: 3, whiteKings: 1 }
        ),
      ],
    },
    {
      title: ["Хожил", "Winning"],
      xp: 10,
      exercises: [
        q(
          ["Тоглолтыг хэрхэн хожих вэ?", "How do you win a game?"],
          [
            ["Өрсөлдөгчийн бүх чулууг идэх, эсвэл нүүх боломжгүй болгох", "Capture all the opponent's pieces, or leave them with no legal move"],
            ["Илүү олон дамка гаргах", "Make more kings"],
            ["Самбарын төвийг эзлэх", "Occupy the centre"],
          ],
          0,
          [
            "Нүүх боломжгүй болсон тал хожигдоно — чулуу нь үлдсэн ч гэсэн.",
            "A side with no legal move loses, even if it still has pieces.",
          ]
        ),
        move(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 4, { minCaptures: 2 }, { whites: 2, blacks: 4 }),
      ],
    },
    {
      title: ["Тэнцээ", "Draws"],
      xp: 10,
      exercises: [
        q(
          ["Тэнцээ хэзээ болох вэ?", "When is the game a draw?"],
          [
            ["Хоёр тал ч хожиж чадахгүй байрлалд, эсвэл тохиролцсон үед", "When neither side can win, or by agreement"],
            ["Чулуу тэнцүү үлдэхэд", "Whenever the material is equal"],
            ["Дамка хоёулаа гарахад", "As soon as both sides have a king"],
          ],
          0,
          [
            "Хоёр тал ахиц гаргаж чадахгүй болбол тэнцээ. Чулуу тэнцүү байх нь өөрөө тэнцээ гэсэн үг биш.",
            "If neither side can make progress it is a draw. Equal material by itself is not a draw.",
          ]
        ),
      ],
    },
  ],
};

export const LEVEL_2: SeedUnit = {
  title: ["Level 2 — Эхний тактик", "Level 2 — First tactics"],
  color: "sky",
  lessons: [
    {
      title: ["Шууд цохилт", "Direct capture"],
      xp: 15,
      exercises: [
        move(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 8, { minCaptures: 1, maxCaptures: 1 }, { whites: 3, blacks: 4 }),
      ],
    },
    {
      title: ["1 нүүдлийн цохилт", "One-move strike"],
      xp: 15,
      exercises: [
        move(
          ["Цагаанаар тоглож байна. Нэг нүүдлээр хамгийн их чулуу ид.", "White to play. Win as much material as you can in one move."],
          CHAIN_EXPLAIN,
          8,
          { minCaptures: 2 },
          { whites: 3, blacks: 5 }
        ),
      ],
    },
    {
      title: ["Аль чулуу цохих вэ?", "Which piece captures?"],
      xp: 15,
      exercises: [
        q(
          ["Хоёр чулуу идэж чадвал аль нь идэх ёстой вэ?", "If two of your pieces can capture, which one must?"],
          [
            ["Илүү ОЛОН чулуу идэж чаддаг нь", "The one that captures MORE pieces"],
            ["Аль нь ч болно", "Either of them"],
            ["Дамка нь л", "Only the king"],
          ],
          0,
          [
            "Хамгийн урт цувааны дүрэм аль чулуу идэхийг ч шийднэ — тиймээс бүх боломжийг тоолж хар.",
            "The longest-sequence rule also decides which piece captures — so count every option.",
          ]
        ),
        move(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 6, { minCaptures: 2 }, { whites: 4, blacks: 5 }),
      ],
    },
    {
      title: ["Цохилтын чиглэл", "Direction of the strike"],
      xp: 15,
      exercises: [
        q(
          ["Бэр хойш нь ид чадах уу?", "Can a man capture backwards?"],
          [
            ["Олон улсын даамд ТИЙМ — идэхдээ хойш ч үсэрнэ", "In international draughts YES — captures may go backwards"],
            ["Үгүй, хэзээ ч", "No, never"],
            ["Зөвхөн дамка болсны дараа", "Only after promotion"],
          ],
          0,
          [
            "Энэ бол хамгийн их андуурдаг дүрэм: НҮҮХДЭЭ бэр зөвхөн урагш, харин ИДЭХДЭЭ хойш ч үсэрч болно.",
            "This is the most misunderstood rule: a man MOVES only forward, but it may CAPTURE backwards too.",
          ]
        ),
        move(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 6, { minCaptures: 1 }, { whites: 3, blacks: 4 }),
      ],
    },
    {
      title: ["Тулгууртай цохилт", "Setup sacrifice"],
      xp: 20,
      exercises: [combo(COMBO_PROMPT, COMBO_EXPLAIN, 6, { whites: 4, blacks: 4 })],
    },
    {
      title: ["Хамгаалалт", "Defence"],
      xp: 15,
      exercises: [
        q(
          ["Өрсөлдөгч чулуу өгөх гэж байвал юу хийх ёстой вэ?", "When the opponent offers a piece, what should you do?"],
          [
            ["Идсэний дараа ЮУ болохыг тооцох", "Calculate what happens AFTER you take"],
            ["Ямагт шууд идэх", "Always take at once"],
            ["Хэзээ ч идэхгүй", "Never take"],
          ],
          0,
          [
            "Идэлт заавал байдаг тул «өгөх» нь урхи байж болно. Идсэний дараах байрлалыг эхлээд тооц.",
            "Because capture is compulsory, an offer can be a trap. Always look at the position after the capture.",
          ]
        ),
        move(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 5, { minCaptures: 1 }, { whites: 4, blacks: 4 }),
      ],
    },
    {
      title: ["Буцаан цохилт", "Counter-strike"],
      xp: 20,
      exercises: [
        combo(
          ["Цагаанаар тоглож байна. Чулуугаа өгөөд илүүг эргүүлж ав.", "White to play. Give a piece and win more back."],
          COMBO_EXPLAIN,
          6,
          { whites: 4, blacks: 5 },
          2
        ),
      ],
    },
    {
      title: ["Цохилтын дараах байрлал", "The position after the strike"],
      xp: 20,
      exercises: [
        q(
          ["Цохилтын дараа юуг хамгийн түрүүнд шалгах вэ?", "After a strike, what do you check first?"],
          [
            ["Өрсөлдөгч эргээд цохих боломжтой эсэхийг", "Whether the opponent now has a counter-capture"],
            ["Хэдэн чулуу үлдснийг", "How many pieces are left"],
            ["Цаг хэр их үлдснийг", "How much time is left"],
          ],
          0,
          [
            "Цохилт дууссаны дараа дүрс нь ил үлддэг. Тиймээс «идээд дараа нь юу?» гэдгийг ямагт тооцно.",
            "After a capture your piece often stands exposed. Always ask: and then what?",
          ]
        ),
        combo(COMBO_PROMPT, COMBO_EXPLAIN, 5, { whites: 4, blacks: 4 }),
      ],
    },
    {
      title: ["Цохилтыг урьдчилан харах", "Seeing the strike in advance"],
      xp: 20,
      exercises: [
        move(CAPTURE_PROMPT, CHAIN_EXPLAIN, 6, { minCaptures: 3 }, { whites: 3, blacks: 6 }),
      ],
    },
    {
      title: ["10 бодлогын Challenge", "10-puzzle challenge"],
      xp: 30,
      exercises: [
        move(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 5, { minCaptures: 1 }, { whites: 3, blacks: 4 }),
        move(CAPTURE_PROMPT, CHAIN_EXPLAIN, 3, { minCaptures: 2 }, { whites: 3, blacks: 5 }),
        combo(COMBO_PROMPT, COMBO_EXPLAIN, 2, { whites: 4, blacks: 4 }),
      ],
    },
  ],
};
