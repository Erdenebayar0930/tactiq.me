/**
 * LEVEL 3–5 — тактик ба комбинаци (10–12 нас, Advanced Junior).
 *
 * Энэ түвшнээс сурагч «цохилт хай» гэсэн даалгавраас «ЯАГААД тэр цохилт
 * гарсан» гэсэн ойлголт руу шилжинэ: чулуу татах, зам чөлөөлөх, золиос
 * зэрэг АРГУУД нь бүгд нэг зорилготой — өрсөлдөгчийг албадах.
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

export const LEVEL_3: SeedUnit = {
  title: ["Level 3 — Тактикийн аргууд", "Level 3 — Tactical devices"],
  color: "violet",
  lessons: [
    {
      title: ["Чулуу татах", "Drawing a piece"],
      xp: 20,
      exercises: [
        q(
          ["«Чулуу татах» гэдэг нь юу вэ?", "What does it mean to draw a piece?"],
          [
            ["Өрсөлдөгчийн чулууг хүссэн нүдэнд ирэхийг албадах", "Forcing an enemy piece onto the square you need"],
            ["Чулуугаа хойш татах", "Pulling your own piece back"],
            ["Дамка гаргах", "Making a king"],
          ],
          0,
          [
            "Идэлт заавал тул чулуу өгөх нь өрсөлдөгчийн чулууг ТОДОРХОЙ нүдэнд «татах» хамгийн хүчтэй арга.",
            "Because capture is compulsory, offering a piece is the strongest way to pull an enemy piece onto a chosen square.",
          ]
        ),
        combo(COMBO_PROMPT, COMBO_EXPLAIN, 6, { whites: 4, blacks: 4 }),
      ],
    },
    {
      title: ["Цохилтод татах", "Drawing into a strike"],
      xp: 20,
      exercises: [combo(COMBO_PROMPT, COMBO_EXPLAIN, 6, { whites: 4, blacks: 5 }, 2)],
    },
    {
      title: ["Завсраар өгөх", "Offering in between"],
      xp: 20,
      exercises: [
        q(
          ["Завсрын золиос юуны төлөө хийгддэг вэ?", "Why play an in-between sacrifice?"],
          [
            ["Цуваа урт болох нүдийг чөлөөлөх/дүүргэх", "To free or fill the square that makes the sequence longer"],
            ["Цаг хожихын төлөө", "To gain time on the clock"],
            ["Чулуу хасахын төлөө", "Just to reduce material"],
          ],
          0,
          [
            "Нэг чулуу өгөөд цуваа нь хоёр, гурав дахин урт болвол золиос нь хамаагүй хямд.",
            "Giving one piece is cheap if it makes your own sequence two or three times longer.",
          ]
        ),
        combo(COMBO_PROMPT, COMBO_EXPLAIN, 5, { whites: 5, blacks: 5 }, 2),
      ],
    },
    {
      title: ["Зам чөлөөлөх", "Clearing the path"],
      xp: 20,
      exercises: [
        q(
          ["Өөрийн чулуу цохилтод саад болвол юу хийх вэ?", "What if your own piece blocks the strike?"],
          [
            ["Түүнийг зайлуулах (золиослох, нүүлгэх) нүүдлийг эхлээд хийх", "Play a move that removes it first — move it away or sacrifice it"],
            ["Цохилтоо болих", "Give up on the strike"],
            ["Дайсны чулууг хүлээх", "Wait for the opponent"],
          ],
          0,
          [
            "Цохилтын зам дээрх ӨӨРИЙН чулуу нь хамгийн их анзаарагддаггүй саад. Түүнийг зайлуулбал цуваа нээгдэнэ.",
            "Your own piece in the landing path is the most easily missed obstacle. Remove it and the sequence opens.",
          ]
        ),
        combo(COMBO_PROMPT, COMBO_EXPLAIN, 5, { whites: 5, blacks: 4 }),
      ],
    },
    {
      title: ["Зам хаах", "Blocking the path"],
      xp: 20,
      exercises: [
        move(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 6, { minCaptures: 2 }, { whites: 4, blacks: 5 }),
      ],
    },
    {
      title: ["Цоолох", "Breaking through"],
      xp: 20,
      exercises: [
        q(
          ["«Цоолох» гэж юу вэ?", "What is a breakthrough?"],
          [
            ["Золиосоор дайсны эгнээг нээж, дамка руу гарах", "Sacrificing to open a lane and reach promotion"],
            ["Бүх чулуугаа идүүлэх", "Letting all your pieces be taken"],
            ["Хамгаалалтад суух", "Sitting back on defence"],
          ],
          0,
          [
            "Цоолох нь материалын бус ЗАМЫН тооцоо: хоёр чулуу өгөөд дамка гарвал хожил ойртоно.",
            "A breakthrough is about the lane, not material: give two pieces to make a king and the win comes closer.",
          ]
        ),
        move(
          ["Цагаанаар тоглож байна. Дамка руу гарах нүүдлийг ол.", "White to play. Find the move that promotes."],
          [
            "Дамка нь ердийн бэрээс хүчтэй тул түүнд хүрэх зам нь материалаас илүү үнэтэй байж болно.",
            "A king is far stronger than a man, so the road to promotion can be worth more than material.",
          ],
          5,
          { mustPromote: true },
          { whites: 3, blacks: 4 }
        ),
      ],
    },
    {
      title: ["Хамгаалалт задлах", "Breaking the defence"],
      xp: 20,
      exercises: [combo(COMBO_PROMPT, COMBO_EXPLAIN, 6, { whites: 5, blacks: 5 }, 2)],
    },
    {
      title: ["Сул нүд ашиглах", "Using a weak square"],
      xp: 20,
      exercises: [
        q(
          ["Сул нүд гэж юу вэ?", "What is a weak square?"],
          [
            ["Хамгаалагдаагүй, дайсан чөлөөтэй хэрэглэж болох нүд", "An unprotected square the opponent can use freely"],
            ["Самбарын захын нүд", "Any square on the edge"],
            ["Хоосон нүд бүр", "Every empty square"],
          ],
          0,
          [
            "Сул нүд нь ихэвчлэн чулуу хөдөлсний дараа үүсдэг — тиймээс нүүдэл бүр ЯМАР нүдийг сулруулж байгааг хар.",
            "Weak squares usually appear after a piece moves — so ask what each move leaves unguarded.",
          ]
        ),
        move(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 5, { minCaptures: 1 }, { whites: 4, blacks: 5 }),
      ],
    },
    {
      title: ["Золиос", "Sacrifice"],
      xp: 25,
      exercises: [combo(COMBO_PROMPT, COMBO_EXPLAIN, 7, { whites: 5, blacks: 5 })],
    },
    {
      title: ["Урхи", "Traps"],
      xp: 25,
      exercises: [
        q(
          ["Урхи яагаад ажилладаг вэ?", "Why do traps work?"],
          [
            ["Идэлт заавал тул өрсөлдөгч сонголтгүй болдог", "Capture is compulsory, so the opponent has no choice"],
            ["Өрсөлдөгч анзаардаггүй учраас", "Because the opponent is careless"],
            ["Цаг нь дууссан учраас", "Because of the clock"],
          ],
          0,
          [
            "Даамын урхи нь «мэхлэх» биш, АЛБАДАХ арга: дүрэм өөрөө өрсөлдөгчийг хүссэн нүүдэл хийхэд хүргэнэ.",
            "A draughts trap is not a trick but a forcing device: the rules themselves make the opponent play your move.",
          ]
        ),
        combo(COMBO_PROMPT, COMBO_EXPLAIN, 6, { whites: 5, blacks: 6 }, 2),
      ],
    },
  ],
};

export const LEVEL_4: SeedUnit = {
  title: ["Level 4 — Комбинаци", "Level 4 — Combinations"],
  color: "rose",
  lessons: [
    {
      title: ["2 нүүдлийн комбинаци", "Two-move combination"],
      xp: 25,
      exercises: [combo(COMBO_PROMPT, COMBO_EXPLAIN, 8, { whites: 4, blacks: 4 })],
    },
    {
      title: ["3 нүүдлийн комбинаци", "Three-move combination"],
      xp: 30,
      exercises: [combo(COMBO_PROMPT, COMBO_EXPLAIN, 6, { whites: 5, blacks: 6 }, 3)],
    },
    {
      title: ["Дараалсан комбинаци", "Consecutive combinations"],
      xp: 25,
      exercises: [
        move(CAPTURE_PROMPT, CHAIN_EXPLAIN, 6, { minCaptures: 3 }, { whites: 3, blacks: 6 }),
      ],
    },
    {
      title: ["Гинжин комбинаци", "Chain combinations"],
      xp: 30,
      exercises: [
        move(CAPTURE_PROMPT, CHAIN_EXPLAIN, 5, { minCaptures: 4 }, { whites: 3, blacks: 7 }),
      ],
    },
    {
      title: ["Давхар боломж", "Double threat"],
      xp: 25,
      exercises: [
        q(
          ["Давхар боломж гэж юу вэ?", "What is a double threat?"],
          [
            ["Нэг нүүдлээр ХОЁР сүрдүүлэл зэрэг үүсгэх", "Creating TWO threats with one move"],
            ["Хоёр чулуугаар нүүх", "Moving two pieces"],
            ["Хоёр дамка гаргах", "Making two kings"],
          ],
          0,
          [
            "Өрсөлдөгч хоёр сүрдүүллийн зөвхөн нэгийг хаана — нөгөө нь ажиллана.",
            "The opponent can answer only one of the two threats — the other one lands.",
          ]
        ),
        combo(COMBO_PROMPT, COMBO_EXPLAIN, 6, { whites: 5, blacks: 5 }, 2),
      ],
    },
    {
      title: ["Хүчээр цохилт хийлгэх", "Forcing the opponent to capture"],
      xp: 25,
      exercises: [combo(COMBO_PROMPT, COMBO_EXPLAIN, 6, { whites: 4, blacks: 5 })],
    },
    {
      title: ["Дамка руу комбинаци", "Combination to promotion"],
      xp: 30,
      exercises: [
        move(
          ["Цагаанаар тоглож байна. Цохиод дамка бол.", "White to play. Capture and promote."],
          [
            "Хамгийн хүчтэй цохилт нь материал ба дамка хоёуланг зэрэг өгдөг нь.",
            "The strongest strike wins material and a king at the same time.",
          ],
          5,
          { minCaptures: 1, mustPromote: true },
          { whites: 3, blacks: 4 }
        ),
        combo(COMBO_PROMPT, COMBO_EXPLAIN, 4, { whites: 4, blacks: 4 }),
      ],
    },
  ],
};

export const LEVEL_5: SeedUnit = {
  title: ["Level 5 — Тактикийн сорил", "Level 5 — Tactics workout"],
  color: "orange",
  lessons: [
    {
      title: ["Хурдан цохилт — 1 нүүдэл", "Quick strikes — one move"],
      xp: 25,
      exercises: [
        move(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 10, { minCaptures: 1 }, { whites: 4, blacks: 5 }),
      ],
    },
    {
      title: ["Урт цуваа", "Long sequences"],
      xp: 30,
      exercises: [
        move(CAPTURE_PROMPT, CHAIN_EXPLAIN, 8, { minCaptures: 3 }, { whites: 3, blacks: 7 }),
      ],
    },
    {
      title: ["Тулгуур хайх", "Finding the setup"],
      xp: 30,
      exercises: [combo(COMBO_PROMPT, COMBO_EXPLAIN, 8, { whites: 5, blacks: 5 })],
    },
    {
      title: ["Дамканы тактик", "King tactics"],
      xp: 30,
      exercises: [
        move(
          ["Цагаанаар тоглож байна. Дамкаараа цохи.", "White to play. Strike with the king."],
          [
            "Дамка нь урт ташуу шугамаар цохидог тул цуваа нь ихэвчлэн хамгийн урт болдог.",
            "A king strikes along long diagonals, so its sequence is often the longest one available.",
          ],
          8,
          { minCaptures: 2 },
          { whites: 1, blacks: 5, whiteKings: 1 }
        ),
      ],
    },
    {
      title: ["Холимог сорил", "Mixed challenge"],
      xp: 35,
      exercises: [
        move(CAPTURE_PROMPT, CAPTURE_EXPLAIN, 4, { minCaptures: 1 }, { whites: 4, blacks: 5 }),
        move(CAPTURE_PROMPT, CHAIN_EXPLAIN, 4, { minCaptures: 2 }, { whites: 3, blacks: 6 }),
        combo(COMBO_PROMPT, COMBO_EXPLAIN, 4, { whites: 5, blacks: 5 }),
      ],
    },
  ],
};
