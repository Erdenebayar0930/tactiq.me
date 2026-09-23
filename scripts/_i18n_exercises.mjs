/**
 * ДАСГАЛЫН АНГЛИ ХУВИЛБАРЫГ БӨГЛӨНӨ (`prompt_en`, `explanation_en`).
 *
 * ⚠ ЯАГААД МӨРӨӨР ТААРУУЛЖ БАЙНА: 571 дасгал ч ӨӨР бичвэр нь 76 асуулт,
 * 244 тайлбар л байна (ижил асуулт олон дасгалд давтагдана). Тиймээс
 * орчуулгыг НЭГ Л удаа бичиж, бүх мөрөнд хэрэглэнэ — 571 гараар бичихэд
 * гарах зөрүү (нэг асуулт хоёр өөр англи хувилбартай болох) бүрэн
 * хаагдана.
 *
 * ⚠ ТООНУУДЫГ ХӨНДӨХГҮЙ: «Шийдэл: 12+5=17.» гэсэн тайлбар нь 182 өөр
 * тэгшитгэлтэй боловч бүтэц ижил тул `Шийдэл:` → `Solution:` гэсэн НЭГ
 * дүрэм + гурван зөвлөмжийн орчуулга нь бүгдийг хамарна. Тэгшитгэлийг
 * гараар хуулбал нэг цифр зөрөхөд сурагч ЗӨВ хариултаа буруу гэж уншина.
 *
 * ⚠ ШАТРЫН НЭР ТОМЪЁО: ноён=king, бэрс=queen, тэрэг=rook, тэмээ=bishop,
 * морь=knight, хүү=pawn, мад=mate, эгнээ=rank, багана=file. Нүүдлийн
 * бичиглэл (Kf2, Rh7#) нь ОЛОН УЛСЫН тул хөрвүүлэхгүй.
 *
 * Ажиллуулах:  node scripts/_i18n_exercises.mjs [--apply]
 */
import fs from "node:fs";
import pg from "pg";

const url = (fs.readFileSync(".env.local", "utf8").match(/^DATABASE_URL=(.*)$/m) || [])[1].trim();

/** Асуултууд — 76 өөр мөр. */
const PROMPTS = new Map([
  ["1-ээс 4 хүртэлх тоог бөглө.", "Fill in the numbers from 1 to 4."],
  ["1-ээс 6 хүртэлх тоог бөглө.", "Fill in the numbers from 1 to 6."],
  ["1-ээс 9 хүртэлх тоог бөглө.", "Fill in the numbers from 1 to 9."],
  ["Эхний судоку. 4×4 — 1-ээс 4 хүртэлх тоог бөглө.", "Your first sudoku. 4×4 — fill in the numbers from 1 to 4."],
  ["Хайрцаг бүрийг шалгаж бөглө.", "Check every box and fill it in."],

  // --- Санах ой: асах нүднүүд ---
  ["3 нүд асна — ижил ДАРААЛЛААР нь дар.", "3 squares light up — tap them in the SAME ORDER."],
  ["4 нүд асна — ижил ДАРААЛЛААР нь дар.", "4 squares light up — tap them in the SAME ORDER."],
  ["5 нүд асна — ижил ДАРААЛЛААР нь дар.", "5 squares light up — tap them in the SAME ORDER."],
  ["6 нүд асна — ижил ДАРААЛЛААР нь дар.", "6 squares light up — tap them in the SAME ORDER."],
  ["7 нүд асна — ижил ДАРААЛЛААР нь дар.", "7 squares light up — tap them in the SAME ORDER."],
  ["3 нүд зэрэг асна — тэдгээрийг дар (дараалал хамаагүй).", "3 squares light up at once — tap them (order does not matter)."],
  ["4 нүд зэрэг асна — тэдгээрийг дар (дараалал хамаагүй).", "4 squares light up at once — tap them (order does not matter)."],
  ["5 нүд зэрэг асна — тэдгээрийг дар (дараалал хамаагүй).", "5 squares light up at once — tap them (order does not matter)."],
  ["6 нүд зэрэг асна — тэдгээрийг дар (дараалал хамаагүй).", "6 squares light up at once — tap them (order does not matter)."],
  ["7 нүд зэрэг асна — тэдгээрийг дар (дараалал хамаагүй).", "7 squares light up at once — tap them (order does not matter)."],
  ["4×4 талбарт 4 нүд асна — бүгдийг нь ол.", "4 squares light up on a 4×4 grid — find them all."],
  ["4×4 талбарт 5 нүд асна — бүгдийг нь ол.", "5 squares light up on a 4×4 grid — find them all."],
  ["4×4 талбарт 6 нүд асна — бүгдийг нь ол.", "6 squares light up on a 4×4 grid — find them all."],
  ["5×5 талбарт 5 нүд асна — бүгдийг нь ол.", "5 squares light up on a 5×5 grid — find them all."],
  ["5×5 талбарт 6 нүд асна — бүгдийг нь ол.", "6 squares light up on a 5×5 grid — find them all."],
  ["5×5 талбарт 7 нүд асна — бүгдийг нь ол.", "7 squares light up on a 5×5 grid — find them all."],
  ["6×6 талбарт 7 нүд асна — бүгдийг нь ол.", "7 squares light up on a 6×6 grid — find them all."],
  ["6×6 талбарт 8 нүд асна — бүгдийг нь ол.", "8 squares light up on a 6×6 grid — find them all."],
  ["6×6 талбарт 9 нүд асна — бүгдийг нь ол.", "9 squares light up on a 6×6 grid — find them all."],

  // --- Санах ой: тоо, хос ---
  ["3 оронтой тоо — санаад бич.", "A 3-digit number — remember it and type it in."],
  ["4 оронтой тоо — санаад бич.", "A 4-digit number — remember it and type it in."],
  ["5 оронтой тоо — санаад бич.", "A 5-digit number — remember it and type it in."],
  ["6 оронтой тоо — санаад бич.", "A 6-digit number — remember it and type it in."],
  ["7 оронтой тоо — санаад бич.", "A 7-digit number — remember it and type it in."],
  ["8 оронтой тоо — санаад бич.", "An 8-digit number — remember it and type it in."],
  ["3 хос — ижил зургуудыг ол.", "3 pairs — find the matching pictures."],
  ["4 хос — ижил зургуудыг ол.", "4 pairs — find the matching pictures."],
  ["5 хос — ижил зургуудыг ол.", "5 pairs — find the matching pictures."],
  ["6 хос — ижил зургуудыг ол.", "6 pairs — find the matching pictures."],
  ["7 хос — ижил зургуудыг ол.", "7 pairs — find the matching pictures."],
  ["5 хос — байрлалыг нь сана.", "5 pairs — remember where they are."],
  ["6 хос — байрлалыг нь сана.", "6 pairs — remember where they are."],
  ["7 хос — байрлалыг нь сана.", "7 pairs — remember where they are."],
  ["8 хос — байрлалыг нь сана.", "8 pairs — remember where they are."],
  ["9 хос — байрлалыг нь сана.", "9 pairs — remember where they are."],
  ["10 хос — байрлалыг нь сана.", "10 pairs — remember where they are."],

  // --- Гулсах, нонограм, хэв маяг ---
  ["3×3 — тоонуудыг дарааллаар нь эрэмбэл.", "3×3 — put the numbers in order."],
  ["4×4 — тоонуудыг дарааллаар нь эрэмбэл.", "4×4 — put the numbers in order."],
  ["5×5 — тоонуудыг дарааллаар нь эрэмбэл.", "5×5 — put the numbers in order."],
  ["4×4 — тоонуудын дагуу нүднүүдийг буд.", "4×4 — colour the squares according to the numbers."],
  ["5×5 — тоонуудын дагуу нүднүүдийг буд.", "5×5 — colour the squares according to the numbers."],
  ["6×6 — тоонуудын дагуу нүднүүдийг буд.", "6×6 — colour the squares according to the numbers."],
  ["Бусдаас ЯЛГААТАЙ дүрсийг ол.", "Find the shape that is DIFFERENT from the rest."],
  ["Дараа нь ямар дүрс ирэх вэ?", "Which shape comes next?"],
  ["Эгнээний дутуу тоог ол.", "Find the missing number in the row."],
  ["Долоон хэсгээр дүрсийг бүрэн нөх.", "Fill the shape completely with the seven pieces."],

  // --- Таягны оньсого ---
  ["Нэг таяг зөөж тэгшитгэлийг зөв болго.", "Move one stick to make the equation correct."],
  ["«8» тоог таягаар бичихэд хэдэн таяг орох вэ?", "How many sticks does it take to write the digit «8»?"],
  ["Хамгийн БАГА таягтай тоо аль нь вэ?", "Which digit uses the FEWEST sticks?"],
  ["Таяг зөөх үед таягны НИЙТ тоо яах вэ?", "What happens to the TOTAL number of sticks when you move one?"],
  ["2×2 тортой дөрвөлжин (12 таяг) дотор ХЭДЭН дөрвөлжин байна?", "How MANY squares are there inside a 2×2 grid (12 sticks)?"],
  ["3×3 тор байгуулахад хэдэн таяг хэрэгтэй вэ?", "How many sticks do you need to build a 3×3 grid?"],
  ["3×3 тор дотор хэдэн дөрвөлжин байна (бүх хэмжээг тоолно)?", "How many squares are there in a 3×3 grid (count every size)?"],

  // --- Судокугийн дүрэм ---
  ["4×4 судокугийн хайрцаг ямар хэмжээтэй вэ?", "What size is a box in 4×4 sudoku?"],
  ["6×6 судокугийн хайрцаг ямар хэмжээтэй вэ?", "What size is a box in 6×6 sudoku?"],
  ["4×4 судокуд ямар тоонууд хэрэглэгдэх вэ?", "Which numbers are used in 4×4 sudoku?"],
  ["Судокугийн үндсэн дүрэм юу вэ?", "What is the basic rule of sudoku?"],

  // --- Үгийн таавар ---
  ["«___ гэрэл» — өдрийн гэрэл", "«___ light» — the light of day"],
  ["«___ сан» — ном хадгалдаг газар", "«___ ary» — the place where books are kept"],
  ["Гэрийг манадаг, хуцдаг амьтан", "The animal that guards the house and barks"],
  ["Маш их ус, давстай", "A huge amount of water, and salty"],
  ["Өндөр, чулуурхаг газар", "High ground, full of rock"],
  ["Таван хошуу малын нэг, унадаг", "One of the five kinds of livestock — you ride it"],
  ["Хавар ургадаг, үнэртэй", "It grows in spring and smells sweet"],
  ["Харанхуйг арилгадаг", "It chases the darkness away"],
  ["Хүүхэд хичээл үздэг газар", "The place where children go to study"],

  // --- Шатрын мад ---
  ["Цагаанаар тоглож байна. Нэг нүүдлээр мад хий.", "You are playing White. Deliver mate in one move."],
  ["ХАРААР тоглож байна. Нэг нүүдлээр мад хий.", "You are playing BLACK. Deliver mate in one move."],
  ["Цагаанаар тоглож байна. ХОЁР нүүдлээр мад хий.", "You are playing White. Deliver mate in TWO moves."],
  [
    "Цагаанаар тоглож байна. ХОЁР нүүдлээр мад хий — эхний нүүдлийн дараа хар ноён хариулна.",
    "You are playing White. Deliver mate in TWO moves — the black king will answer your first move.",
  ],
  [
    "Цагаанаар тоглож байна. ХОЁР нүүдлээр мад хий. Санамж: заримдаа хамгийн хүчтэй нүүдэл бол НОЁНЫ нүүдэл байдаг.",
    "You are playing White. Deliver mate in TWO moves. Hint: sometimes the strongest move is a KING move.",
  ],
]);

/**
 * Таягны оньсогын тайлбар — «Шийдэл: <тэгшитгэл>. <зөвлөмж>».
 *
 * ⚠ Тэгшитгэлийг ХӨНДӨХГҮЙ, зөвхөн бүрхүүлийг хөрвүүлнэ.
 */
const STICK_TIPS = new Map([
  [
    "Нэг тоог ажигла — таяг тэр тооны дотор зөөгдөнө.",
    "Look closely at one number — the stick moves inside that number.",
  ],
  [
    "Таяг нэг тооноос НӨГӨӨ тоо руу шилжиж болно.",
    "A stick may move from one number to the OTHER number.",
  ],
  [
    "Тэмдгийг ч мартаж болохгүй: «+»-ийн босоог авбал «−», «−»-д нэмбэл «=». «×» нь хоёр хилбэр таягтай.",
    "Do not forget the signs: take the upright away from «+» and it becomes «−»; add one to «−» and it becomes «=». «×» is two slanted sticks.",
  ],
]);

/** Бусад тайлбарууд — 62 өөр мөр. */
const EXPLANATIONS = new Map([
  ["1×1 нь 9, 2×2 нь 4, 3×3 нь 1 — нийт 14.", "Nine 1×1, four 2×2 and one 3×3 — fourteen in all."],
  [
    "4×4 нь дөрвөн 2×2 хайрцагт хуваагдана. Зузаан шугамууд хайрцгийн хилийг заана.",
    "A 4×4 grid splits into four 2×2 boxes. The thick lines show where the boxes end.",
  ],
  ["6 тооны тав нь байвал зургаа дахь нь шууд тодорно.", "If five of the six numbers are there, the sixth is decided for you."],
  [
    "6×6-д хайрцаг нь ДӨРВӨЛЖИН БИШ — 2 мөр, 3 багана. Үүнийг мартвал хайрцгийн шалгалт бүхэлдээ буруу болно.",
    "In 6×6 the box is NOT square — 2 rows by 3 columns. Forget that and every box check you make will be wrong.",
  ],
  [
    "Kf2 нь заналхийлэлгүй мэт ч хар ноёнд h2-оос өөр нүүдэл үлдээхгүй. Дараа нь Rh7# — тэмээ g1 нүдийг хаасан байна.",
    "Kf2 looks harmless, yet it leaves the black king no move but h2. Then Rh7# — the bishop already covers g1.",
  ],
  [
    "Rg2 нь ноёныг хоёр дахь эгнээнээс салгана. Ноён b1 рүү зугтахад нөгөө тэрэг Rd1# хийнэ — «шатны мад» гэдэг сонгодог арга.",
    "Rg2 cuts the king off from the second rank. When the king runs to b1 the other rook plays Rd1# — the classic ladder mate.",
  ],
  ["«1» нь зөвхөн хоёр таягтай. «7» гурав, «4» дөрөв, «0» зургаа.", "«1» needs only two sticks. «7» takes three, «4» four and «0» six."],
  ["«8» нь долоон сегмент бүгдийг хэрэглэнэ — хамгийн их таягтай тоо.", "«8» uses all seven segments — the digit with the most sticks."],
  [
    "«Сурагчийн мад» — бэрс f7 идэж, түүнийг тэмээ хамгаалж байна. f7 нүд бол хамгийн сул тал: зөвхөн ноён хамгаалдаг.",
    "This is the scholar's mate — the queen takes f7 with the bishop guarding her. f7 is the weakest square: only the king defends it.",
  ],
  [
    "«Тэнэгийн мад» — хамгийн богино мад. Ноёныхоо өмнөх хүүнүүдийг болгоомжгүй хөдөлгөвөл ийм болно.",
    "This is the fool's mate — the fastest mate there is. Move the pawns in front of your king carelessly and this is what happens.",
  ],
  ["Аль тоо хамгийн олон удаа өгөгдсөн бэ? Түүнийг бүх хайрцгаас хайж эхэл.", "Which number is given most often? Start by hunting for it in every box."],
  ["Аль тоо хамгийн олон өгөгдсөн бэ? Түүнийг зургаан хайрцгаас дараалан хай.", "Which number is given most often? Look for it in all six boxes, one after another."],
  ["Ахиц гарахаа болиход тоо тус бүрээр бүх хайрцгийг эргүүлж шүү — нэг нь ил гарна.", "When you get stuck, sweep every box once per number — one of them will give way."],
  ["Багана нь гурван хайрцгийг хөндөнө — багананы шалгалт илүү их мэдээлэл өгнө.", "A column touches three boxes — so checking columns tells you more."],
  ["Багана руу ч ижил дүрмээр хар — мөр, багана, хайрцаг гурвуулаа хүчинтэй.", "Read the columns the same way — rows, columns and boxes all count."],
  [
    "Бүх нүд тодорхойгүй санагдвал тоо тус бүрээр (1, 2, 3, 4) хайрцгуудыг шүү.",
    "If no square looks certain, sweep the boxes one number at a time (1, 2, 3, 4).",
  ],
  ["Бүх нүдийг зэрэг бодох гэж БИТГИЙ хичээ — нэг тоог сонгоод түүнийг л ажилла.", "Do NOT try to solve every square at once — pick one number and work only on it."],
  [
    "Бэрс хол зайнаас сүүлийн эгнээнд орлоо. Ноёны өмнөх хүүнүүд нь өөрсдөө шоронгийн хана болж байна.",
    "The queen comes to the back rank from far away. The king's own pawns are the walls of his prison.",
  ],
  [
    "Бэрс хоёр дахь эгнээг эзэлж, ноёны зугтах замыг хаана. Дараа нь тэрэг сүүлийн эгнээнд бууж мад.",
    "The queen takes the second rank and seals the king's escape. Then the rook lands on the back rank for mate.",
  ],
  ["Ганц шийдэлтэй тул ТААХ шаардлагагүй — ямагт логикоор гарах нүд байна.", "There is exactly one solution, so you never need to GUESS — some square always yields to logic."],
  ["Ганц шийдэлтэй тул мухардвал буруу тавьсан нүд байна — эргэж шалга.", "There is only one solution, so if you are stuck a square is wrong — go back and check."],
  [
    "Гурван дүрэм ЗЭРЭГ биелэх ёстой: мөр, багана, хайрцаг. Гурвуулаа зөв байж л судоку шийдэгдсэн гэж тооцно.",
    "All three rules must hold AT ONCE: row, column and box. A sudoku counts as solved only when all three are right.",
  ],
  ["Гурван хайрцгийн мөрийг хамт хар: хоёрт нь тоо байвал гуравдахь нь хумигдана.", "Look at a row of three boxes together: if two of them hold the number, the third is squeezed."],
  ["Давталтын УРТЫГ эхлээд ол: хоёр юу, гурав юу дараалж байна вэ?", "First find the LENGTH of the repeat: do two things alternate, or three?"],
  [
    "Дарааллыг бүхэлд нь биш, ХЭСЭГЛЭН сана (2-3 нүдээр) — тархи урт дарааллыг богино бүлгүүдээр илүү сайн барьдаг.",
    "Remember the sequence in CHUNKS of two or three, not as a whole — the brain holds a long order far better in short groups.",
  ],
  ["Дээд мөрийг ЭХЛЭЭД бүрэн цэгцэл, дараа нь түүнд хүрэхгүйгээр доошоо ажилла.", "Finish the top row FIRST, then work downwards without disturbing it."],
  [
    "Дүрсийн БУЛАНГУУДЫГ хар: хурц булан бүрд гурвалжны үзүүр ордог, тэгш булан бүрд дөрвөлжин эсвэл катет.",
    "Look at the CORNERS of the shape: a sharp corner takes the tip of a triangle, a right-angled one takes the square or a leg.",
  ],
  ["Дөрвөн жижиг дөрвөлжин, дээр нь бүх торыг бүрхсэн нэг том — нийт 5.", "Four small squares plus the big one around the whole grid — five in all."],
  [
    "Зөөх нь нэг таягийг өөр газар ТАВИХ — авч хаях биш. Тиймээс тоо ямагт хэвээр. Энэ нь оньсого бодоход хамгийн хэрэгтэй дүрэм.",
    "Moving means PUTTING a stick somewhere else — not taking it away. So the count never changes. That is the single most useful rule here.",
  ],
  ["Мөр, багана нь тодорхойгүй үед ХАЙРЦГИЙГ хар — тэнд дутуу тоо шууд харагддаг.", "When rows and columns say nothing, look at the BOX — the missing number often shows up there at once."],
  [
    "Нарийн хонхор бүр нэг л хэсэгт багтана — түүнийг эхлээд ол, дараа нь үлдсэнийг эргэн тойронд нь угс.",
    "Each narrow notch fits only one piece — find that piece first, then build the rest around it.",
  ],
  ["Нэг мөрөнд аль тоо дутаж байгааг хар — 4 тооны гурав нь байвал дөрөв дэх нь шууд тодорно.", "See which number a row is missing — with three of the four there, the fourth is decided."],
  ["Нэг нүдэнд хоёр тоо тохирвол түүнийг ОРХИ — өөр нүднээс эхэлбэл дараа нь өөрөө тодорно.", "If two numbers fit one square, LEAVE it — start elsewhere and it will settle itself later."],
  ["Нэг хайрцагт тухайн тоо зөвхөн нэг нүдэнд тохирвол тэр нь шийдэгдсэн.", "If a number fits only one square in a box, that square is solved."],
  ["Нээсэн хөзрийнхөө БАЙРЛАЛЫГ сана — зөвхөн зургийг нь биш.", "Remember WHERE the card you flipped was — not just the picture on it."],
  [
    "Нүд бүрийг тусад нь биш, ДҮРС болгож хар — «гурвалжин», «шулуун» гэж нэрлэвэл санахад хамаагүй хялбар.",
    "See the squares as a SHAPE rather than one by one — naming it «a triangle» or «a line» makes it far easier to hold.",
  ],
  ["Нүд бүрийн боломжийг санаж бод: хамгийн цөөн боломжтойгоос эхэл.", "Keep each square's candidates in mind and start with the square that has the fewest."],
  ["Нүд бүрийн боломжуудыг санаж бодох чадвар эндээс хөгжинө.", "This is where you build the habit of holding each square's options in your head."],
  ["Олон тоо өгөгдсөн мөр, багана, хайрцгаас эхэл — тэнд боломж хамгийн цөөн.", "Start with the row, column or box that has the most numbers given — there the options are fewest."],
  [
    "Олон хостой үед ЭХЛЭЭД бүх хөзрийг дараалан нээж байрлалыг нь цээжил, дараа нь хосуудыг цуглуул.",
    "With many pairs, FIRST turn the cards over one by one and memorise where they are, then collect the pairs.",
  ],
  ["ТОМ хэсгээс эхэл: тэд хамгийн цөөн байрлалд багтдаг тул үлдсэн зай нь өөрөө тодорно.", "Start with the BIGGEST pieces: they fit in the fewest places, so the space left over tells you the rest."],
  [
    "Том талбарт бүх нүдийг нэг дор барих боломжгүй — талбарыг оюун дотроо хэсэгт хувааж, хэсэг тус бүрээр сана.",
    "On a big grid you cannot hold every square at once — split the grid into parts in your head and remember it part by part.",
  ],
  ["Том хөлөг ч ижил гурван дүрэм. Нэг хайрцгийг бүтэн дуусгахыг хичээ.", "A bigger board, the same three rules. Try to finish one box completely."],
  ["Тоо тус бүрээр (1, 2, 3…) бүх хайрцгийг шалгах арга хамгийн тогтвортой.", "Checking every box one number at a time (1, 2, 3…) is the steadiest method."],
  ["Тэрэг эгнээгээр орж, ноён зугтах нүдгүй.", "The rook comes down the rank and the king has no square to run to."],
  ["Хайрцаг 2×3 тул нэг мөр хоёр хайрцгийг л хөндөнө — тэр хоёрыг хамт шалга.", "The box is 2×3, so one row touches just two boxes — check those two together."],
  ["Хайрцаг бүр 2×2. Гурван нүд бөглөгдсөн хайрцгийг эрж хай.", "Every box is 2×2. Hunt for a box that already has three squares filled."],
  ["Хайрцаг нь 2 мөр × 3 багана — ДӨРВӨЛЖИН БИШ. Зузаан шугамууд хилийг заана.", "The box is 2 rows by 3 columns — NOT a square. The thick lines mark the borders."],
  ["Хайрцаг өргөн тул МӨРӨӨС илүү багана руу анхаарвал хурдан гарна.", "The box is wide, so you get there faster by watching the columns rather than the ROWS."],
  [
    "Хамгийн ТОМ тоотой мөр, багананаас эхэл — тэнд сонголт хамгийн цөөн. «Энэ нүд заавал хоосон» гэдгээ ✕-ээр тэмдэглэ.",
    "Start from the row or column with the BIGGEST number — there the choices are fewest. Mark a square you know must stay empty with ✕.",
  ],
  ["Хамгийн цөөн боломжтой нүднээс эхэл — тэнд ихэвчлэн ганц л тоо тохирно.", "Start with the square that has the fewest options — usually only one number fits."],
  [
    "Хар ноёныг өөрийнх нь хүүнүүд боож, зугтах нүд үлдээгүй — тэрүүг «сүүлийн эгнээний мад» гэнэ.",
    "The black king is hemmed in by his own pawns with nowhere to go — that is called a back-rank mate.",
  ],
  ["Хоёр дүрэм зэрэг шалгавал (мөр БА хайрцаг) боломж хурдан хумигдана.", "Check two rules at once (row AND box) and the options shrink fast."],
  ["Хоёр нүдэнд ижил хоёр тоо л тохирвол бусад нүднээс тэр хоёрыг хас.", "If the same two numbers are the only fit for two squares, rule those two out everywhere else."],
  ["Хоёр нүдэнд ижил хоёр тоо л тохирвол тэр хоёр тоо бусад нүднээс хасагдана.", "When two squares take only the same two numbers, those numbers drop out of every other square."],
  ["Хоёр хөрш тооны ЗӨРҮҮГ хар — ихэвчлэн тэр нь хууль нь байдаг.", "Look at the DIFFERENCE between two neighbours — that is usually the rule."],
  ["Хэвтээ 4 мөр × 3 = 12, босоо 4 багана × 3 = 12. Нийт 24.", "Four horizontal rows × 3 = 12, four vertical columns × 3 = 12. Twenty-four in all."],
  ["Хэмжээ нь хэрэглэх тоог хэлнэ: 4×4 → 1-4, 6×6 → 1-6, 9×9 → 1-9.", "The size tells you which numbers to use: 4×4 → 1-4, 6×6 → 1-6, 9×9 → 1-9."],
  [
    "Цифрүүдийг 2-3-аар нь бүлэглэж сана: «58 29 3» гэж уншвал таван цифр биш, гурван зүйл цээжлэх болно.",
    "Group the digits in twos and threes: read «58 29 3» and you are memorising three things, not five digits.",
  ],
  ["Цөөн тоо өгөгдсөн ч ГАНЦ шийдэлтэй — таах шаардлагагүй, зөвхөн тэвчээр.", "Few numbers are given, yet there is only ONE solution — no guessing needed, just patience."],
  ["Эхний үсгийг тааварла — үлдсэн нь ихэвчлэн өөрөө нийлдэг.", "Guess the first letter — the rest usually falls into place by itself."],
  ["Юугаараа ижил, юугаараа ялгаатай вэ — эхлээд ИЖИЛ ЗҮЙЛИЙГ нь ол.", "What is the same and what is different — find what they SHARE first."],
]);

/** «Шийдэл: 12+5=17. <зөвлөмж>» → «Solution: 12+5=17. <tip>» */
function translateExplanation(text) {
  const direct = EXPLANATIONS.get(text);
  if (direct) return direct;

  const m = text.match(/^Шийдэл:\s*(.+?)\.\s*(.*)$/);
  if (m) {
    const [, equation, tip] = m;
    const tipEn = tip ? STICK_TIPS.get(tip.trim()) : "";
    if (tip && !tipEn) return null; // танихгүй зөвлөмж — орхино
    return `Solution: ${equation}.${tipEn ? ` ${tipEn}` : ""}`;
  }
  return null;
}

const client = new pg.Client({ connectionString: url });
await client.connect();

const apply = process.argv.includes("--apply");
const rows = (
  await client.query(
    "select id, prompt, explanation from exercises where coalesce(prompt_en,'')='' or (coalesce(explanation,'')<>'' and coalesce(explanation_en,'')='')"
  )
).rows;

let done = 0;
const missing = new Set();

for (const row of rows) {
  const promptEn = PROMPTS.get(row.prompt) ?? null;
  const explanationEn = row.explanation ? translateExplanation(row.explanation) : "";

  if (!promptEn) missing.add(`PROMPT: ${row.prompt}`);
  if (row.explanation && !explanationEn) missing.add(`EXPL: ${row.explanation}`);
  if (!promptEn && !explanationEn) continue;

  done++;
  if (apply) {
    /* ⚠ COALESCE: аль хэдийн бичигдсэн орчуулгыг ДАРЖ БИЧИХГҮЙ. */
    await client.query(
      `update exercises
         set prompt_en = case when coalesce(prompt_en,'')='' then coalesce($2, prompt_en) else prompt_en end,
             explanation_en = case when coalesce(explanation_en,'')='' then coalesce($3, explanation_en) else explanation_en end
       where id=$1`,
      [row.id, promptEn, explanationEn || null]
    );
  }
}

console.log(`мөр ${done}/${rows.length}${apply ? "  → БИЧСЭН" : "  (туршилт)"}`);
if (missing.size) {
  console.log(`\nОРЧУУЛГА ДУТУУ (${missing.size}):`);
  for (const line of [...missing].slice(0, 20)) console.log("  ?", line);
}
await client.end();
