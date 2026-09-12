/**
 * LEVEL 6–10 — байрлалын сэтгэлгээ, тоглолтын ухаан (13+, Competition).
 *
 * ⚠ ЭНЭ ТҮВШНИЙ ХИЧЭЭЛҮҮД БОДЛОГООС ИЛҮҮ ШИЙДВЭР ГАРГАХАД чиглэнэ: төв,
 * бүтэц, солилцоо, төлөвлөгөө гэх мэт ойлголтыг «зөв нүүдэл» гэж ганцаар
 * шалгаж болохгүй (байрлалын сонголт нь ихэвчлэн хоёр ч зөв байж болно).
 * Тиймээс эдгээрт сонголттой асуулт зонхилж, тактикийн дадлага нь
 * тухайн ойлголтыг БАТАЛГААЖУУЛАХ зорилгоор хамт явна.
 */
import {
  CAPTURE_EXPLAIN,
  CAPTURE_PROMPT,
  CHAIN_EXPLAIN,
  COMBO_EXPLAIN,
  COMBO_PROMPT,
  combo,
  move,
  q,
  type SeedUnit,
} from "./draughtsShared";

export const LEVEL_6: SeedUnit = {
  title: ["Level 6–8 — Байрлалын сэтгэлгээ", "Level 6–8 — Positional thinking"],
  color: "teal",
  lessons: [
    {
      title: ["Төвийн хяналт", "Control of the centre"],
      xp: 25,
      exercises: [
        q(
          ["Төвийн чулуу яагаад хүчтэй вэ?", "Why is a piece in the centre strong?"],
          [
            ["Илүү олон ташуу шугамд нөлөөлж, илүү олон цохилтод оролцдог", "It touches more diagonals and takes part in more strikes"],
            ["Идэгдэхээс хамгаалагдсан учраас", "Because it cannot be captured"],
            ["Илүү хурдан нүүдэг учраас", "Because it moves faster"],
          ],
          0,
          [
            "Захын чулуу хоёр чигт, төвийн чулуу дөрвөн чигт ажиллана — тиймээс төв нь хүч.",
            "An edge piece works in two directions, a central piece in four — that is why the centre means power.",
          ]
        ),
        q(
          ["Зах руу түрэгдсэн чулуу ямар дутагдалтай вэ?", "What is the drawback of being pushed to the edge?"],
          [
            ["Цохилтод оролцох боломж, нүүдлийн эрх бага", "Fewer strikes and fewer moves available"],
            ["Дамка болж чадахгүй", "It can never promote"],
            ["Хамгаалалтад хэрэггүй", "It is useless in defence"],
          ],
          0,
          [
            "Захын чулуу хамгаалалтад хэрэгтэй ч, довтолгооны хүч нь бага — тиймээс БҮХ чулуугаа зах руу түрүүлэхээс сэргийл.",
            "Edge pieces help in defence but attack poorly — so avoid letting all your pieces drift to the rim.",
          ]
        ),
        move(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 4, { minCaptures: 2 }, { whites: 4, blacks: 5 }),
      ],
    },
    {
      title: ["Чулууны бүтэц", "Piece structure"],
      xp: 25,
      exercises: [
        q(
          ["Сайн бүтэц гэж ямар байдаг вэ?", "What does a good structure look like?"],
          [
            ["Чулуунууд бие биеэ хамгаалж, цоорхой үлдээдэггүй", "Pieces defend each other and leave no holes"],
            ["Бүх чулуу нэг эгнээнд", "All pieces on one row"],
            ["Чулуунууд хоорондоо хол", "Pieces spread far apart"],
          ],
          0,
          [
            "Хамгаалалтгүй цоорхой нь тулгууртай цохилтын үндсэн бай болдог.",
            "An undefended hole is exactly what a setup sacrifice aims at.",
          ]
        ),
        q(
          ["Хоцорсон чулуу (хойд эгнээнд үлдсэн) ямар үүрэгтэй вэ?", "What about a piece left behind on the back row?"],
          [
            ["Хамгаалалтад хэрэгтэй ч хэтэрвэл хүчээ хэрэглэхгүй үлдэнэ", "Useful in defence, but too many means wasted force"],
            ["Ямагт алдаа", "Always a mistake"],
            ["Ямагт хүчтэй", "Always strong"],
          ],
          0,
          [
            "Хойд эгнээ нь дамка гаргахыг хаадаг тул хэрэгтэй — гэхдээ тоглолт нь урагшилж байхад тэнд олон чулуу суулгах нь хүчээ хаях гэсэн үг.",
            "The back row stops promotions, so it matters — but parking many pieces there wastes your force.",
          ]
        ),
      ],
    },
    {
      title: ["Сул тал", "Weaknesses"],
      xp: 25,
      exercises: [
        q(
          ["Байрлал дахь сул талыг хэрхэн олох вэ?", "How do you find a weakness in a position?"],
          [
            ["Хамгаалалтгүй чулуу, хоосон нүд, албадмал нүүдлийг хайх", "Look for undefended pieces, holes and forced moves"],
            ["Чулууны тоог тоолох", "Count the pieces"],
            ["Цагийг харах", "Check the clock"],
          ],
          0,
          [
            "Сул тал бол тактикийн «хаяг»: цохилт ямагт хамгаалалтгүй зүйл дээр тогтдог.",
            "A weakness is the address of a tactic: strikes always land on something undefended.",
          ]
        ),
        combo(COMBO_PROMPT, COMBO_EXPLAIN, 4, { whites: 5, blacks: 5 }),
      ],
    },
    {
      title: ["Хөдөлгөөний эрх чөлөө", "Freedom of movement"],
      xp: 25,
      exercises: [
        q(
          ["Хөдөлгөөний эрх чөлөө яагаад чухал вэ?", "Why does freedom of movement matter?"],
          [
            ["Нүүдэл дуусвал албадмал байрлалд орж, хожигдож болно", "If you run out of moves you are forced — and can lose"],
            ["Гоё харагддаг учраас", "Because it looks nice"],
            ["Цаг хэмнэдэг учраас", "Because it saves time"],
          ],
          0,
          [
            "Даамд «нүүх боломжгүй» нь хожигдол. Тиймээс чөлөөтэй нүүдлийн тоо нь материалтай адил хүчин зүйл.",
            "In draughts having no move means losing. The number of free moves matters as much as material.",
          ]
        ),
        move(
          ["Цагаанаар тоглож байна. Цорын ганц нүүдлээ ол.", "White to play. Find your only move."],
          [
            "Албадмал байрлал: өөр сонголт байхгүй. Ийм байрлалд орохоос нүүдэл бүрээрээ сэргийл.",
            "A forced position: there is no choice. Avoid drifting into these with every move you make.",
          ],
          4,
          { quietOnly: true },
          { whites: 3, blacks: 4 }
        ),
      ],
    },
    {
      title: ["Солилцооны шийдвэр", "Deciding on exchanges"],
      xp: 25,
      exercises: [
        q(
          ["Солилцоо хэзээ таатай вэ?", "When is an exchange good for you?"],
          [
            ["Бүтцээ сайжруулж, дайсны сул талыг нэмэгдүүлж байвал", "When it improves your structure or increases the opponent's weaknesses"],
            ["Ямагт таатай", "Always"],
            ["Хэзээ ч биш", "Never"],
          ],
          0,
          [
            "Солилцоо нь чулууны тоог биш, БАЙРЛАЛЫГ өөрчилдөг — тэгвэл л шийдвэр утгатай болно.",
            "An exchange changes the position, not just the count — that is what makes it a decision.",
          ]
        ),
        q(
          ["Материалаар илүү үед юу зөв вэ?", "When you are ahead in material, what is right?"],
          [
            ["Солилцож байрлалыг хялбаршуулах", "Simplify by exchanging"],
            ["Солилцохоос зайлсхийх", "Avoid all exchanges"],
            ["Бүх чулуугаа довтолгоонд гаргах", "Throw everything into attack"],
          ],
          0,
          [
            "Илүү материалтай тал солилцох тусам хожил ойртоно — энэ бол төгсгөлийн техникийн үндсэн зарчим.",
            "With extra material, each exchange brings the win closer — the basic principle of endgame technique.",
          ]
        ),
      ],
    },
    {
      title: ["Довтолгоо", "Attack"],
      xp: 25,
      exercises: [
        q(
          ["Довтолгоог хэзээ эхлүүлэх вэ?", "When should you start an attack?"],
          [
            ["Хүч илүү цуглуулсны дараа, тодорхой сул тал руу", "After gathering more force, against a concrete weakness"],
            ["Тоглолтын хамгийн эхэнд", "Right at the start of the game"],
            ["Санамсаргүй, хүссэн үед", "Whenever you feel like it"],
          ],
          0,
          [
            "Хэрэггүй довтолгоо нь зөвхөн өөрийн бүтцийг сулруулна. Сул тал байхгүй бол эхлээд бэлтгэ.",
            "An unprepared attack only loosens your own structure. With no target, prepare first.",
          ]
        ),
        combo(COMBO_PROMPT, COMBO_EXPLAIN, 4, { whites: 5, blacks: 5 }, 2),
      ],
    },
    {
      title: ["Хамгаалалт", "Defence"],
      xp: 25,
      exercises: [
        q(
          ["Хамгаалахдаа хамгийн чухал нь юу вэ?", "What matters most when defending?"],
          [
            ["Албадмал цохилтуудыг тоолж, цоорхойгоо хаах", "Counting forced captures and closing your holes"],
            ["Чулуугаа бүгдийг хойш татах", "Pulling every piece back"],
            ["Хурдан нүүх", "Moving quickly"],
          ],
          0,
          [
            "Хамгаалалт нь хүлээх биш ТООЦОХ: өрсөлдөгчийн боломжит цуваа бүрийг нүүдэл хийхээсээ өмнө тоол.",
            "Defence is not waiting but calculating: count every sequence the opponent has before you move.",
          ]
        ),
        move(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 4, { minCaptures: 1 }, { whites: 5, blacks: 5 }),
      ],
    },
    {
      title: ["Төлөвлөгөө", "Making a plan"],
      xp: 25,
      exercises: [
        q(
          ["Төлөвлөгөө гэж юу вэ?", "What is a plan?"],
          [
            ["Хэд хэдэн нүүдлийн зорилго — жишээ нь дамка гаргах зам бэлдэх", "A goal spanning several moves — e.g. preparing a path to promotion"],
            ["Дараагийн нэг нүүдэл", "Just your next move"],
            ["Өрсөлдөгчийг хуулбарлах", "Copying the opponent"],
          ],
          0,
          [
            "Төлөвлөгөөгүй тоглоом нь нүүдлийн цуглуулга болдог. Зорилго байвал нүүдэл бүр түүнд ажиллана.",
            "Without a plan a game is just a pile of moves. With a goal, every move serves it.",
          ]
        ),
        q(
          ["Төлөвлөгөөг хэзээ солих вэ?", "When should you change the plan?"],
          [
            ["Байрлал өөрчлөгдөж, зорилго нь бодитой бус болоход", "When the position changes and the goal is no longer realistic"],
            ["Хэзээ ч солихгүй", "Never"],
            ["Нүүдэл бүрд", "Every move"],
          ],
          0,
          [
            "Төлөвлөгөө нь байрлалаас гардаг. Байрлал өөрчлөгдвөл төлөвлөгөө ч дагаж өөрчлөгдөх ёстой.",
            "A plan grows out of the position. When the position changes, the plan must follow.",
          ]
        ),
      ],
    },
    {
      title: ["Байрлалын үнэлгээ", "Evaluating a position"],
      xp: 30,
      exercises: [
        q(
          ["Байрлалыг үнэлэхэд юуг тоолох вэ?", "What do you weigh when evaluating?"],
          [
            ["Материал, бүтэц, төв, нүүдлийн эрх, дамка гарах зам", "Material, structure, centre, freedom of movement, promotion paths"],
            ["Зөвхөн чулууны тоо", "Only the piece count"],
            ["Зөвхөн дамканы тоо", "Only the number of kings"],
          ],
          0,
          [
            "Чулуу тэнцүү байрлал ч нэг талдаа илт таатай байж болно — тиймээс тооллоор зогсохгүй.",
            "A position with equal material can still be clearly better for one side — so do not stop at counting.",
          ]
        ),
        combo(COMBO_PROMPT, COMBO_EXPLAIN, 4, { whites: 5, blacks: 6 }, 2),
      ],
    },
    {
      title: ["Төгсгөлийн техник", "Endgame technique"],
      xp: 30,
      exercises: [
        q(
          ["Төгсгөлд дамка хэр үнэтэй вэ?", "How valuable is a king in the endgame?"],
          [
            ["Маш үнэтэй — бүх самбарыг ташуугаар хянана", "Very — it controls whole diagonals across the board"],
            ["Бэртэй адил", "The same as a man"],
            ["Ач холбогдолгүй", "Not important"],
          ],
          0,
          [
            "Чулуу бага үлдэхэд дамка нь тодорхойлогч хүч болдог — тиймээс төгсгөл рүү дамка гаргах зам бэлд.",
            "With few pieces left the king becomes the decisive force — so prepare a promotion path before the endgame.",
          ]
        ),
        move(
          ["Цагаанаар тоглож байна. Дамкаараа цохиж дүрс хож.", "White to play. Win material with your king."],
          [
            "Төгсгөлийн техник нь нарийн тооцоо: дамка холоос цохиж чадна.",
            "Endgame technique is precise calculation: the king strikes from a distance.",
          ],
          6,
          { minCaptures: 1 },
          { whites: 1, blacks: 4, whiteKings: 1 }
        ),
      ],
    },
  ],
};

export const LEVEL_9: SeedUnit = {
  title: ["Level 9 — Match Intelligence", "Level 9 — Match Intelligence"],
  color: "indigo",
  lessons: [
    {
      title: ["Scan — байрлалыг хар", "Scan — read the position"],
      xp: 30,
      exercises: [
        q(
          ["Scan алхамд юуг хайх вэ?", "What do you look for in the Scan step?"],
          [
            ["Бүх идэлт, бүх албадмал нүүдэл, хамгаалалтгүй чулуу", "Every capture, every forced move, every undefended piece"],
            ["Хамгийн гоё нүүдэл", "The prettiest move"],
            ["Өрсөлдөгчийн нүүр", "The opponent's face"],
          ],
          0,
          [
            "Scan нь ШИЙДВЭР биш, МЭДЭЭЛЭЛ цуглуулах алхам: юу байгааг бүрэн харалгүй тооцож болохгүй.",
            "Scan is not a decision but data gathering: you cannot calculate what you have not seen.",
          ]
        ),
        move(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 5, { minCaptures: 1 }, { whites: 5, blacks: 6 }),
      ],
    },
    {
      title: ["Calculate — тооц", "Calculate — work it out"],
      xp: 30,
      exercises: [
        q(
          ["Тооцоолохдоо ямар нүүдлээс эхлэх вэ?", "Which moves do you calculate first?"],
          [
            ["АЛБАДМАЛ нүүдлээс — идэлт, цорын ганц хариу", "The FORCED ones — captures and only-moves"],
            ["Тайван нүүдлээс", "The quiet ones"],
            ["Санамсаргүй", "At random"],
          ],
          0,
          [
            "Албадмал нүүдэл нь шугамыг хязгаарладаг тул тооцоолол хамгийн хямд, хамгийн тодорхой болно.",
            "Forced moves narrow the tree, making the calculation cheapest and clearest.",
          ]
        ),
        combo(COMBO_PROMPT, COMBO_EXPLAIN, 5, { whites: 5, blacks: 5 }, 2),
      ],
    },
    {
      title: ["Evaluate — үнэл", "Evaluate — judge it"],
      xp: 30,
      exercises: [
        q(
          ["Тооцооллын ТӨГСГӨЛД ямар байрлал таатай вэ?", "At the END of a calculation, which position is better?"],
          [
            ["Материал, бүтэц, дамканы зам нь илүү нь", "The one with better material, structure and promotion paths"],
            ["Илүү олон нүүдэлтэй нь", "The one with more moves played"],
            ["Хурдан олдсон нь", "The one you found first"],
          ],
          0,
          [
            "Тооцоолол нь зөвхөн замыг харуулна — аль зам дээр гарахыг үнэлгээ шийднэ.",
            "Calculation shows the paths; evaluation decides which path to take.",
          ]
        ),
      ],
    },
    {
      title: ["Move — шийдвэр гарга", "Move — commit"],
      xp: 30,
      exercises: [
        q(
          ["Нүүдлээ хийхээсээ ӨМНӨ сүүлчийн шалгалт юу вэ?", "What is the final check BEFORE you move?"],
          [
            ["«Нүүсний дараа өрсөлдөгч юу цохих вэ?»", "\"After my move, what can the opponent capture?\""],
            ["«Цаг хэр үлдсэн?»", "\"How much time is left?\""],
            ["«Харагдац сайн уу?»", "\"Does it look nice?\""],
          ],
          0,
          [
            "Нэг секундийн шалгалт нь нэг тоглолтыг авардаг: нүүдэл бүрийн дараах албадмал цохилтыг тоол.",
            "A one-second check saves whole games: count the forced captures after your move.",
          ]
        ),
        move(CAPTURE_PROMPT, CHAIN_EXPLAIN, 5, { minCaptures: 2 }, { whites: 4, blacks: 6 }),
      ],
    },
  ],
};

export const LEVEL_10: SeedUnit = {
  title: ["Level 10 — Master Challenge", "Level 10 — Master Challenge"],
  color: "amber",
  lessons: [
    {
      title: ["Тактикийн бодлого", "Tactical puzzles"],
      xp: 35,
      exercises: [
        move(CAPTURE_PROMPT, CHAIN_EXPLAIN, 6, { minCaptures: 3 }, { whites: 4, blacks: 7 }),
        combo(COMBO_PROMPT, COMBO_EXPLAIN, 4, { whites: 5, blacks: 6 }, 2),
      ],
    },
    {
      title: ["Байрлалын бодлого", "Positional puzzles"],
      xp: 35,
      exercises: [
        q(
          ["Хоёр нүүдэл хоёулаа чулуу хождог бол аль нь вэ?", "If two moves both win a piece, which do you choose?"],
          [
            ["Дараа нь илүү САЙН байрлал үлдээдэг нь", "The one that leaves the better position afterwards"],
            ["Түрүүлж олдсон нь", "The one you saw first"],
            ["Илүү хол нүүдэг нь", "The one that moves further"],
          ],
          0,
          [
            "Мастерын шийдвэр нь «чулуу хожих» биш «дараа нь юу болох» дээр тогтдог.",
            "A master's decision rests not on winning a piece but on what comes after.",
          ]
        ),
        move(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 5, { minCaptures: 2 }, { whites: 5, blacks: 6 }),
      ],
    },
    {
      title: ["Төгсгөлийн бодлого", "Endgame puzzles"],
      xp: 35,
      exercises: [
        move(
          ["Цагаанаар тоглож байна. Төгсгөлд дүрс хож.", "White to play. Win material in the endgame."],
          [
            "Чулуу бага үед нүүдэл бүр шийдвэрлэх — дамканы ташуу шугамыг тоол.",
            "With few pieces every move is decisive — count the king's diagonals.",
          ],
          6,
          { minCaptures: 1 },
          { whites: 1, blacks: 3, whiteKings: 1 }
        ),
        move(
          ["Цагаанаар тоглож байна. Дамка бол.", "White to play. Make a king."],
          [
            "Төгсгөлийн гол зорилт — дамка. Зам нь хаагдахаас өмнө гар.",
            "The main endgame goal is promotion. Get through before the lane closes.",
          ],
          4,
          { mustPromote: true },
          { whites: 2, blacks: 3 }
        ),
      ],
    },
    {
      title: ["Хугацаатай сорил", "Timed challenge"],
      xp: 40,
      exercises: [
        move(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 12, { minCaptures: 1 }, { whites: 4, blacks: 5 }),
      ],
    },
    {
      title: ["AI Match — ботын эсрэг", "AI Match — play the bot"],
      xp: 30,
      exercises: [
        q(
          ["Ботын эсрэг тоглохын гол ач холбогдол юу вэ?", "What is the main value of playing the bot?"],
          [
            ["Сурсан тактикаа ЖИНХЭНЭ тоглолтод хэрэглэж үзэх", "Trying your tactics in a REAL game"],
            ["Зөвхөн оноо цуглуулах", "Just collecting points"],
            ["Цаг нөгцөөх", "Passing time"],
          ],
          0,
          [
            "Бодлого нь тактикийг сургана, тоглолт нь ШИЙДВЭР гаргахыг сургана. «Тоглох» хэсгээс даамын ботыг сонгоорой.",
            "Puzzles teach tactics; games teach decisions. Pick the draughts bot in the Play section.",
          ]
        ),
      ],
    },
    {
      title: ["Player Match — хүний эсрэг", "Player Match — play a human"],
      xp: 30,
      exercises: [
        q(
          ["Хүний эсрэг тоглолтод юуг онцгой анхаарах вэ?", "What needs extra care against a human?"],
          [
            ["Өрсөлдөгчийн тулгуур, урхийг нүүдэл бүрд шалгах", "Checking for setups and traps on every move"],
            ["Хурдан нүүх", "Moving fast"],
            ["Дамка хэдэн болохыг тоолох", "Counting how many kings exist"],
          ],
          0,
          [
            "Хүн санаатай урхи тавина. Нүүдэл бүрийн дараах албадмал цохилтыг тоолох дадал нь хамгийн сайн хамгаалалт.",
            "A human sets deliberate traps. The habit of counting forced captures after each move is your best defence.",
          ]
        ),
      ],
    },
    {
      /**
       * ⚠ НЭМЭЛТ БАГЦ: хөтөлбөрийн нийт дасгалыг бүтэн 400 болгоход
       * дутуу байсан 6 бодлого. Тусдаа хичээл болгосон нь зориуд —
       * байгаа хичээлийн дасгалын тоог өөрчилвөл seeder нь тэр хичээлийг
       * «аль хэдийн байна» гэж алгасах тул шинэ бодлогууд санд ОРОХГҮЙ.
       */
      title: ["Мастерын 6 бодлого", "Master's six puzzles"],
      xp: 40,
      exercises: [
        move(CAPTURE_PROMPT, CHAIN_EXPLAIN, 3, { minCaptures: 3 }, { whites: 4, blacks: 7 }),
        combo(COMBO_PROMPT, COMBO_EXPLAIN, 3, { whites: 5, blacks: 6 }, 3),
      ],
    },
    {
      title: ["Final Exam", "Final Exam"],
      xp: 60,
      exercises: [
        move(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 4, { minCaptures: 1 }, { whites: 4, blacks: 5 }),
        move(CAPTURE_PROMPT, CHAIN_EXPLAIN, 4, { minCaptures: 3 }, { whites: 4, blacks: 7 }),
        combo(COMBO_PROMPT, COMBO_EXPLAIN, 4, { whites: 5, blacks: 5 }, 2),
        move(
          ["Цагаанаар тоглож байна. Дамка бол.", "White to play. Make a king."],
          [
            "Сүүлийн шалгалт: цохилт, комбинаци, дамка — гурвууланг нэг дор.",
            "Final check: strikes, combinations and promotion — all in one.",
          ],
          3,
          { mustPromote: true },
          { whites: 2, blacks: 3 }
        ),
      ],
    },
  ],
};
