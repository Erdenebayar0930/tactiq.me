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
          ["Төвийн хүү яагаад хүчтэй вэ?", "Why is a piece in the centre strong?"],
          [
            ["Илүү олон ташуу шугамд нөлөөлж, илүү олон идэлтэд оролцдог", "It touches more diagonals and takes part in more strikes"],
            ["Идэгдэхээс хамгаалагдсан учраас", "Because it cannot be captured"],
            ["Илүү хурдан нүүдэг учраас", "Because it moves faster"],
          ],
          0,
          [
            "Захын хүү хоёр чигт, төвийн хүү дөрвөн чигт ажиллана — тиймээс төв нь хүч.",
            "An edge piece works in two directions, a central piece in four — that is why the centre means power.",
          ]
        ),
        q(
          ["Зах руу түрэгдсэн хүү ямар дутагдалтай вэ?", "What is the drawback of being pushed to the edge?"],
          [
            ["Идэлтэд оролцох боломж, нүүдлийн эрх бага", "Fewer strikes and fewer moves available"],
            ["Даам болж чадахгүй", "It can never promote"],
            ["Хамгаалалтад хэрэггүй", "It is useless in defence"],
          ],
          0,
          [
            "Захын хүү хамгаалалтад хэрэгтэй ч, довтолгооны хүч нь бага — тиймээс БҮХ хүүгээ зах руу түрүүлэхээс сэргийл.",
            "Edge pieces help in defence but attack poorly — so avoid letting all your pieces drift to the rim.",
          ]
        ),
        move(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 4, { minCaptures: 2 }, { whites: 4, blacks: 5 }),
      ],
    },
    {
      title: ["Хүүгийн бүтэц", "Piece structure"],
      xp: 25,
      exercises: [
        q(
          ["Сайн бүтэц гэж ямар байдаг вэ?", "What does a good structure look like?"],
          [
            ["Хүүнүүд бие биеэ хамгаалж, цоорхой үлдээдэггүй", "Pieces defend each other and leave no holes"],
            ["Бүх хүү нэг эгнээнд", "All pieces on one row"],
            ["Хүүнүүд хоорондоо хол", "Pieces spread far apart"],
          ],
          0,
          [
            "Хамгаалалтгүй цоорхой нь тулгууртай цохилтын үндсэн бай болдог.",
            "An undefended hole is exactly what a setup sacrifice aims at.",
          ]
        ),
        q(
          ["Хоцорсон хүү (хойд эгнээнд үлдсэн) ямар үүрэгтэй вэ?", "What about a piece left behind on the back row?"],
          [
            ["Хамгаалалтад хэрэгтэй ч хэтэрвэл хүчээ хэрэглэхгүй үлдэнэ", "Useful in defence, but too many means wasted force"],
            ["Ямагт алдаа", "Always a mistake"],
            ["Ямагт хүчтэй", "Always strong"],
          ],
          0,
          [
            "Хойд эгнээ нь даам гаргахыг хаадаг тул хэрэгтэй — гэхдээ тоглолт нь урагшилж байхад тэнд олон хүү суулгах нь хүчээ хаях гэсэн үг.",
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
            ["Хамгаалалтгүй хүү, хоосон нүд, албадмал нүүдлийг хайх", "Look for undefended pieces, holes and forced moves"],
            ["Хүүгийн тоог тоолох", "Count the pieces"],
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
            "Даамд «нүүх боломжгүй» нь тэнцээ. Илүү материалтай байсан ч тэндээ ороод хожлоо алдаж болно — тиймээс чөлөөт нүүдлийн тоо материалтай адил чухал.",
            "In draughts having no move is a draw. You can be ahead in material and still throw the win away, so the number of free moves matters as much as material.",
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
            "Солилцоо нь хүүгийн тоог биш, БАЙРЛАЛЫГ өөрчилдөг — тэгвэл л шийдвэр утгатай болно.",
            "An exchange changes the position, not just the count — that is what makes it a decision.",
          ]
        ),
        q(
          ["Материалаар илүү үед юу зөв вэ?", "When you are ahead in material, what is right?"],
          [
            ["Солилцож байрлалыг хялбаршуулах", "Simplify by exchanging"],
            ["Солилцохоос зайлсхийх", "Avoid all exchanges"],
            ["Бүх хүүгээ довтолгоонд гаргах", "Throw everything into attack"],
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
      title: ["Төлөвлөгөө", "Making a plan"],
      xp: 25,
      exercises: [
        q(
          ["Төлөвлөгөө гэж юу вэ?", "What is a plan?"],
          [
            ["Хэд хэдэн нүүдлийн зорилго — жишээ нь даам гаргах зам бэлдэх", "A goal spanning several moves — e.g. preparing a path to promotion"],
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
            ["Материал, бүтэц, төв, нүүдлийн эрх, даам гарах зам", "Material, structure, centre, freedom of movement, promotion paths"],
            ["Зөвхөн хүүгийн тоо", "Only the piece count"],
            ["Зөвхөн даамын тоо", "Only the number of kings"],
          ],
          0,
          [
            "Хүү тэнцүү байрлал ч нэг талдаа илт таатай байж болно — тиймээс тооллоор зогсохгүй.",
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
          ["Төгсгөлд даам хэр үнэтэй вэ?", "How valuable is a king in the endgame?"],
          [
            ["Маш үнэтэй — бүх самбарыг ташуугаар хянана", "Very — it controls whole diagonals across the board"],
            ["Хүүтэй адил", "The same as a man"],
            ["Ач холбогдолгүй", "Not important"],
          ],
          0,
          [
            "Хүү бага үлдэхэд даам нь тодорхойлогч хүч болдог — тиймээс төгсгөл рүү даам гаргах зам бэлд.",
            "With few pieces left the king becomes the decisive force — so prepare a promotion path before the endgame.",
          ]
        ),
        move(
          ["Цагаанаар тоглож байна. Даамаараа идэж дүрс хож.", "White to play. Win material with your king."],
          [
            "Төгсгөлийн техник нь нарийн тооцоо: даам холоос идэж чадна.",
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
