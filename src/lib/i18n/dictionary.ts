/**
 * Монгол → Англи толь.
 *
 * ЗАГВАРЫН ШИЙДЭЛ — яагаад түлхүүр нь МОНГОЛ БИЧВЭР вэ ("nav.play" гэх мэт
 * хийсвэр түлхүүр БИШ):
 *
 *   • Аппад 750+ бичвэр 84 файлд тархсан. Бүгдийг хийсвэр түлхүүр болгох нь
 *     НЭГ ДОР хийгдэх ёстой ажил — дундуур зогсвол хагас нь түлхүүр, хагас нь
 *     бичвэр болж, аль нь орчуулагдсаныг хэн ч хэлж чадахгүй болно.
 *   • Монгол бичвэрийг түлхүүр болгосноор `t()` нь орчуулга БАЙХГҮЙ үед
 *     түлхүүрээ буцаана — монгол хэл дээр огт өөрчлөлтгүй ажиллана. Тиймээс
 *     орчуулгыг хуудас хуудсаар НЭМЭГДҮҮЛЖ болно.
 *   • Код уншихад бичвэр нь нүдэнд харагдсаар үлдэнэ.
 *
 * ⚠ ТҮЛХҮҮРИЙГ ЯГ ТАА: нэг үсэг, нэг зай зөрвөл орчуулга үл ажиллана.
 * Англи хувилбар байхгүй мөрийг англи горимд МОНГОЛООР харуулна — хоосон
 * нүх үлдээхээс дээр.
 *
 * ⚠ ХИЧЭЭЛИЙН АГУУЛГА ЭНД ОРОХГҮЙ: курс, хичээл, дасгалын бичвэр нь
 * өгөгдлийн санд багшийн бичсэнээр хадгалагддаг (`exercises.prompt` гэх мэт)
 * тул код дахь толь тэдгээрт хүрэхгүй. Тэднийг орчуулах нь тусдаа ажил —
 * хэл тус бүрийн агуулгыг санд хадгалах шаардлагатай болно.
 */
export const EN: Record<string, string> = {
  // --- Урамшууллын кодын мессеж ---
  "Өөрийн кодоо өөртөө хэрэглэх боломжгүй. Найздаа илгээгээрэй — тэр хямдрал авч, танд шимтгэл ногдоно.":
    "You cannot use your own code on yourself. Send it to a friend — they get the discount and you earn the commission.",
  "Ийм код олдсонгүй эсвэл ашиглах боломжгүй байна.":
    "That code was not found, or it cannot be used.",

  // --- Урамшууллын кодын шаталсан хувь ---
  "Худалдан авагчид": "Buyers get",
  "% хямдрал": "% off",
  "танд": "you get",
  "% шимтгэл": "% commission",
  "Шат": "Tier",
  "төлбөр баталгаажсан": "paid so far:",
  "хүүхэд": "children",
  "энэ шатанд": "left in this tier:",
  "хүүхэд үлдсэн": "children",

  дараа: "from now",
  // --- ӨГӨГДЛИЙН ФАЙЛУУДЫН ШОШГО ---
  // ⚠ Эдгээр нь `lib/tactiq/*.ts` дахь тогтмолууд (дэлгүүр, тэжээвэр,
  // амжилт, дүрэм). Модуль НЭГ Л удаа ачаалагддаг тул `t()`-г ТЭНД
  // дуудаж БОЛОХГҮЙ — хэл солиход утга шинэчлэгдэхгүй. Оронд нь
  // ЗУРАХ МӨЧИД (`t(item.label)`) дуудагдана.
  Тэнгэр: "Sky",
  "Цэнхэр хүрээ": "Blue frame",
  Ногоон: "Green",
  "Ногоон хүрээ": "Green frame",
  Дөл: "Flame",
  "Улаан-улбар дөлний хүрээ": "Red-orange flame frame",
  Ягаан: "Pink",
  "Ягаан хүрээ": "Pink frame",
  Алт: "Gold",
  "Хамгийн ховор — алтан хүрээ": "The rarest — a golden frame",
  "Нар жаргах": "Sunset",
  "Улбар шар — ягаан": "Orange into pink",
  Далай: "Ocean",
  "Цэнхэр — ногоовтор": "Blue into green",
  Ой: "Forest",
  "Ногоон ой": "Green woodland",
  "Шөнийн тэнгэр": "Night sky",
  "Хар хөх — оддын шөнө": "Deep blue — a starry night",
  "Туйлын гэрэл": "Northern lights",
  "Хамгийн ховор загвар": "The rarest design",
  "Цэнгэг ногоон": "Fresh green",
  "Зөөлөн ногоон": "Soft green",
  "Тэнгэрийн цэнхэр": "Sky blue",
  "Зөөлөн цэнхэр": "Soft blue",
  "Тоорын өнгө": "Peach",
  "Дулаан улбар шар": "Warm orange",
  "Ягаан манан": "Pink mist",
  "Зөөлөн ягаан": "Soft pink",
  Сарнай: "Rose",
  "Хамгийн дулаан өнгө": "The warmest colour",
  Туулай: "Rabbit",
  Хооллох: "Feed",
  лууван: "a carrot",
  "Идэвхтэй, найрсаг. Өдөрт нэг удаа лууван иднэ.":
    "Lively and friendly. Eats a carrot once a day.",
  "Өдөрт НЭГ удаа лууван (10 зоос) өгнө.": "Give it a carrot ONCE a day (10 coins).",
  "24 цагаас илүү хооллоогүй бол өлсөж эхэлнэ.":
    "Go longer than 24 hours without feeding and it gets hungry.",
  "48 цаг өнгөрвөл асаргааны дараалал тэгээс эхэлнэ.":
    "After 48 hours the care streak starts again from zero.",
  Муур: "Cat",
  загас: "a fish",
  "Тайван, бие даасан. Өдөрт нэг удаа загас иднэ.": "Calm and independent. Eats a fish once a day.",
  "Өдөрт НЭГ удаа загас (10 зоос) өгнө.": "Give it a fish ONCE a day (10 coins).",
  Нохой: "Dog",
  яс: "a bone",
  "Үнэнч, эрч хүчтэй. Илүү их хоол иднэ.": "Loyal and full of energy. Eats more than the others.",
  "Өдөрт НЭГ удаа хоол (15 зоос) өгнө.": "Feed it ONCE a day (15 coins).",
  Ортоз: "Orchid",
  Услах: "Water",
  ус: "water",
  "Хамгийн тэвчээртэй ургамал. Бага ус хэрэгтэй.": "The hardiest plant. It needs little water.",
  "Өдөрт НЭГ удаа услана (5 зоос).": "Water it ONCE a day (5 coins).",
  "24 цагаас илүү усласангүй бол хатаж эхэлнэ.":
    "Go longer than 24 hours without water and it starts to dry out.",
  Цэцэг: "Flower",
  "Сайхан цэцэглэдэг ч өдөр бүр ус хэрэгтэй.": "It blooms beautifully, but needs water every day.",
  "Өдөрт НЭГ удаа услана (8 зоос).": "Water it ONCE a day (8 coins).",
  "24 цагаас илүү усласангүй бол гандаж эхэлнэ.":
    "Go longer than 24 hours without water and it starts to wilt.",
  Мод: "Tree",
  "Хамгийн үнэтэй ч хамгийн том шагналтай.": "The most expensive, and the most rewarding.",
  "Өдөрт НЭГ удаа услана (10 зоос).": "Water it ONCE a day (10 coins).",
  "24 цагаас илүү усласангүй бол навч нь унаж эхэлнэ.":
    "Go longer than 24 hours without water and its leaves start to fall.",
  "3 хоног": "3 days",
  "1 долоо хоног": "1 week",
  "2 долоо хоног": "2 weeks",
  "1 сар": "1 month",
  Гал: "Fire",
  "{n} өдөр дараалан суралц": "Learn {n} days in a row",
  Гарамгай: "Outstanding",
  "Нийт {n} оноо цуглуул": "Collect {n} XP in total",
  Хичээнгүй: "Diligent",
  "{n} хичээл дуусга": "Finish {n} lessons",
  Судлаач: "Explorer",
  "{n} өөр курс эхлүүл": "Start {n} different courses",
  Тэвчээртэй: "Persistent",
  "Сурахад {n} минут зарцуул": "Spend {n} minutes learning",
  Тулаанч: "Fighter",
  "{n} тоглолт хож": "Win {n} games",
  Стратегич: "Strategist",
  "Үнэлгээгээ {n} хүргэ": "Reach a rating of {n}",
  Аварга: "Champion",
  "{n} лигт хүр": "Reach league {n}",
  Найрсаг: "Sociable",
  "{n} найзтай бол": "Make {n} friends",
  Уриалагч: "Recruiter",
  "{n} найзыг урьж оруул": "Invite {n} friends to join",
  "Гурав ба түүнээс олон дүрс идэх цуваа бол даамын хамгийн хүчтэй зэвсэг. Идэхийнхээ өмнө цувааныхаа ТӨГСГӨЛД хаана зогсохоо хараарай.":
    "A chain that takes three pieces or more is the strongest weapon in draughts. Before you capture, look at where you END UP at the finish of the chain.",
  "Идэлт байхгүй бол дүрсээ урагш, хамтдаа нүүлгэ: ганцаарчилсан дүрс амархан баригддаг.":
    "With no capture available, move your pieces forward together: a lone piece is easy to trap.",
  "Даам нь хол зайнаас идэж чадна — түүнийг урт диагональ дээр тавь, тэндээс хөлгийн хоёр талыг зэрэг заналхийлнэ.":
    "A king can capture from far away — put it on a long diagonal, where it threatens both sides of the board at once.",
  "Өрсөлдөгч даамтай боллоо. Даамын замыг хаах нь түүнийг идэхээс хамаагүй амархан: диагональ дээр нь өөрийн хоёр дүрсийг зэрэгцүүлж тавь.":
    "Your opponent now has a king. Blocking its path is far easier than capturing it: line up two of your own pieces on its diagonal.",
  "Ар талын эгнээгээ хэт удаан бүтэн барих хэрэггүй — тэнд зогссон дүрс тоглоомд оролцдоггүй. Хоёр, гурвыг нь үлдээгээд бусдыг урагшлуул.":
    "Do not hold your back row intact for too long — pieces parked there take no part in the game. Leave two or three and push the rest forward.",
  "Захын нүдэн дээрх дүрсийг ИДЭЖ БОЛОХГҮЙ — тэр нь давуу тал мэт боловч зөвхөн нэг чиглэлд нүүдэг тул хүч нь хагасаар буурна.":
    "Do NOT take a piece onto the edge squares — it looks like a gain, but an edge piece moves in only one direction, so it loses half its power.",
  "Чи дүрсээр илүү байна. Ийм үед СОЛИЛЦОХ нь ашигтай: дүрс цөөрөх тусам илүү дүрсний давуу тал нь томордог.":
    "You are a piece up. Now TRADING helps you: the fewer pieces on the board, the bigger that extra piece looms.",
  "Дүрсээр хоцорч байна. Солилцохоос зайлсхийж, дүрсээ ойр байлга — хамтдаа зогссон дүрсийг идэх нь хэцүү.":
    "You are a piece down. Avoid trades and keep your pieces close together — a tight group is hard to capture.",
  "Дүрс цөөрлөө. Одоо хамгийн чухал зорилго нь нэг дүрсээ ДАМКА болгох — нэг даам гурван хүүтэй тэнцэнэ.":
    "Few pieces are left. Your main goal now is to promote one of them to KING — a king is worth about three men.",
  "Ганцхан нүүдэл үлдлээ. Нүүх боломж бүрмөсөн дуусвал тоглоом ялагдлаар төгсдөг — дүрсээ хэт бөөгнүүлэхээс сэрэмжил.":
    "You have only one move left. Run out of moves completely and you lose the game — be careful not to crowd your pieces.",
  "Анхан шатны дүрмийг тайван тайлбарлана.": "Explains the basic rules calmly.",
  "Тактик, хослолыг дадлагажуулна.": "Drills tactics and combinations.",
  "Тэмцээний бэлтгэлд анхаарна.": "Focuses on tournament preparation.",
  "Байрлалын тооцоог гүнзгий тайлбарлана.": "Goes deep into positional judgement.",
  "Довтолгоо, довтолгооны төлөвлөгөө.": "Attacks and attacking plans.",
  "Өдөр бүр жижиг зорилтоор урамшуулна.": "Keeps you going with a small goal each day.",
  "Хурдан хослол, мэт хийхэд анхаарна.": "Focuses on fast combinations and mating attacks.",
  "Тайван, тэвчээртэй тоглоомд дасгана.": "Trains calm, patient play.",
  Даамал: "Daamal",
  "Даамын дүрэм, тактикийг алхам алхмаар тайлбарлана.":
    "Explains the rules and tactics of draughts step by step.",
  Шар: "Yellow",
  Цэнхэр: "Blue",
  Улаан: "Red",
  Хөх: "Dark blue",
  Номин: "Lapis",
  "Улбар шар": "Orange",
  "6–8 нас": "Ages 6–8",
  "9–11 нас": "Ages 9–11",
  "12–14 нас": "Ages 12–14",
  "15–17 нас": "Ages 15–17",
  "18+ нас": "Ages 18+",
  "Эрх олгох, өөрчлөх нь зөвхөн супер админд боломжтой.":
    "Only a super admin can grant or change roles.",
  "Өөрийн эрхийг өөрчлөх боломжгүй. Өөр супер админаар дамжуулна уу.":
    "You cannot change your own role. Ask another super admin to do it.",
  "Хэрэглэгч аль хэдийн энэ эрхтэй байна.": "This user already has that role.",
  "Зөвхөн админ хийх боломжтой үйлдэл.": "Only an admin can do that.",
  "Өөрийн бүртгэлийн төлөвийг өөрчлөх боломжгүй.":
    "You cannot change the status of your own account.",
  "Өөртэй чинь ижил буюу дээгүүр эрхтэй хэрэглэгчийг өөрчлөх боломжгүй.":
    "You cannot change a user whose role equals or outranks your own.",
  "Системд дор хаяж нэг идэвхтэй супер админ байх ёстой.":
    "The system must keep at least one active super admin.",
  "Супер админ": "Super admin",
  Админ: "Admin",
  "Эцэг эх": "Parent",
  Сурагч: "Student",
  "Бүх эрх — админ томилох, хэрэглэгч хаах, системийг бүрэн удирдах.":
    "Full rights — appoint admins, block users, run the whole system.",
  "Хэрэглэгчийн бүртгэл, эрх, төлөв удирдах. Эрх олгох боломжгүй.":
    "Manages user accounts, roles and status. Cannot grant roles.",
  "Багшийн эрхтэй хэрэглэгч.": "A user with teacher rights.",
  "Эцэг эхийн эрхтэй хэрэглэгч.": "A user with parent rights.",
  "Энгийн хэрэглэгч.": "An ordinary user.",
  "Хүлээгдэж буй": "Pending",
  Хаагдсан: "Blocked",
  "Хэрхэн явагддаг вэ": "How it works",
  "Тэмцээн тогтоосон хугацаанд үргэлжилнэ. Тэр хугацаанд аль болох олон тоглолт хийнэ.":
    "The tournament runs for a set time. Play as many games as you can within it.",
  "Тоглолтоо дуусгамагц дараагийн өрсөлдөгч автоматаар олдоно — хүлээх, урих шаардлагагүй.":
    "As soon as a game ends the next opponent is found for you — no waiting, no inviting.",
  "Өрсөлдөгчийг онооны ойролцоо хүмүүсээс сонгоно. Тиймээс сайн тоглох тусам хүчтэй өрсөлдөгч тохиолдоно.":
    "Opponents are drawn from players near your score, so the better you do, the stronger they get.",
  "Ялалт — 2 оноо, тэнцээ — 1 оноо, хожигдол — 0 оноо.":
    "A win is 2 points, a draw 1 point, a loss 0.",
  "ЦУВАА: дараалан 2 ялалт авбал гал асна. Түүнээс хойших ялалт бүр ДАВХАР оноо (4), тэнцээ 2 оноо болно.":
    "STREAK: win two in a row and the fire lights up. After that every win is worth DOUBLE (4) and a draw is worth 2.",
  "Цуваа нь хожигдох эсвэл тэнцэх үед тасарна.": "The streak breaks on a loss or a draw.",
  Берсерк: "Berserk",
  "Тоглолт эхлэхийн өмнө «Берсерк» дарвал цаг чинь ХАГАСААР хасагдана.":
    "Press «Berserk» before a game starts and your clock is cut in HALF.",
  "Берсеркээр ялвал +1 НЭМЭЛТ оноо авна.": "Win a berserk game and you get +1 EXTRA point.",
  "Эрсдэлтэй: цаг бага тул алдах магадлал өснө. Хожигдвол нэмэлт оноо алга.":
    "It is a gamble: less time means more mistakes. Lose and there is no bonus.",
  Дуусгавар: "The finish",
  "Хугацаа дуусахад тэргүүлэгч нь ялагч. Тэр мөчид явж байгаа тоглолт дуустал тоологдоно.":
    "Whoever leads when time runs out wins. A game already in progress still counts to its end.",
  "Оноо тэнцвэл эхэлж тэр онооны хүрсэн тоглогч дээгүүр байрлана.":
    "On equal points the player who reached that score first is placed higher.",
  "Дундуур нь амарч болно — тэр хооронд шинэ өрсөлдөгч өгөхгүй, эргэж ирмэгц үргэлжилнэ.":
    "You may take a break — no new opponent is offered while you rest, and play resumes when you return.",
  "Шударга байдал": "Fair play",
  "Хөдөлгүүр (компьютер), ном, гадны хүний тусламж ХОРИОТОЙ.":
    "Engines, books and help from another person are FORBIDDEN.",
  "Зориуд хожигдох, хуйвалдах нь тэмцээнээс хасах үндэслэл.":
    "Losing on purpose or colluding is grounds for removal from the tournament.",
  "Холболт тасарсан ч цаг зогсохгүй — интернэтээ шалгаад ороорой.":
    "Your clock keeps running if you disconnect — check your connection before you start.",
  "Шатрын нэмэлт дүрэм": "Extra chess rules",
  "Хүрсэн хөлгөө заавал нүүх дүрэм (touch-move) ОНЛАЙНД хамаарахгүй — нүүдэл нь тавьсны дараа л хийгдсэнд тооцогдоно.":
    "The touch-move rule does NOT apply online — a move counts only once you release the piece.",
  "Тэнцээ: гурван удаа ижил байрлал давтагдах, 50 нүүдэлд идэлт ба хүү нүүхгүй байх, мад хийх материал хүрэлцэхгүй болох.":
    "Draws: the same position three times, 50 moves without a capture or pawn move, or not enough material to mate.",
  "Цаг дуусахад өрсөлдөгчид мад хийх материал байхгүй бол ТЭНЦЭЭ (хожил биш).":
    "If your clock runs out but your opponent cannot mate with the material left, it is a DRAW (not a win).",
  "Хүү сүүлийн эгнээнд хүрвэл заавал шинэ хөлөг сонгоно — бэрээс өөр хөлөг ч сонгож болно.":
    "A pawn reaching the last rank must promote — and you may choose a piece other than the queen.",
  "Даамын нэмэлт дүрэм": "Extra draughts rules",
  "Идэх боломж гарвал ЗААВАЛ иднэ — «идэхгүй өнгөрөх» гэж үгүй.":
    "If a capture is available you MUST take it — declining is not allowed.",
  "Хэд хэдэн идэлт байвал ХАМГИЙН УРТ цувааг сонгоно.":
    "When several captures are possible you must take the LONGEST chain.",
  "Сүүлийн эгнээнд хүрсэн хүү даам болно; даам урагш, хойш аль ч чигт хэдэн ч нүд хөдөлнө.":
    "A man reaching the last row becomes a king; a king moves any number of squares, forwards or backwards.",
  "Бүх дүрсээ алдсан тал ХОЖИГДОНО. Нүүх боломжгүй болсон нь ТЭНЦЭЭ.":
    "The side that loses all its pieces LOSES. Being left with no legal move is a DRAW.",

  // --- Багц: гишүүнчлэл, Premium, промо, төлбөр, сурагчид ---
  "Premium идэвхжлээ. Сайхан суралцаарай!": "Premium is active. Enjoy your learning!",
  "QPay төлөх": "Pay with QPay",
  "Банкаар төлөх": "Pay by bank",
  "Гар утсан дээр дарвал банкны апп нээгдэнэ. Компьютер дээр QR кодыг уншуулна уу.":
    "On a phone, tapping opens your banking app. On a computer, scan the QR code.",
  "Гишүүн бол сар бүр тэмцээнд үнэгүй оролцоно. Гишүүнгүй бол тэмцээн бүрт төлнө.":
    "Members enter every monthly tournament free. Without membership you pay per tournament.",
  "Гишүүнчлэл идэвхжлээ!": "Your membership is active!",
  "Гүйлгээний утга": "Payment reference",
  "Дансаар шилжүүлэх": "Bank transfer",
  "Дансны дугаар": "Account number",
  "Зураг бэлдэж чадсангүй. Дахин оролдоно уу.": "Could not prepare the image. Please try again.",
  Идэвхгүй: "Inactive",
  "Миний код": "My code",
  "Нийт олсон": "Earned in total",
  "Одоогийн гишүүнчлэл дууссаны дараа сонгоно.":
    "You can choose this once your current membership ends.",
  Оноо: "XP",
  "Таны кодоор худалдан авалт хийх бүрд танд шимтгэл ногдоно.":
    "You earn a commission on every purchase made with your code.",
  "Туршилтын горим: QPay тохируулаагүй тул энэ QR ЖИНХЭНЭ БИШ бөгөөд төлбөр баталгаажихгүй. Локал турших бол":
    "Test mode: QPay is not configured, so this QR is NOT real and no payment will be confirmed. To test locally, set",
  "Тэмцээн үзэх": "See tournaments",
  "Тэмцээний гишүүнчлэл": "Tournament membership",
  "Төлбөр амжилттай!": "Payment complete!",
  "Төлбөр баталгаажсангүй": "The payment was not confirmed",
  "Хамгийн ашигтай": "Best value",
  "Худалдан авалт": "Purchases",
  "Хязгааргүй зүрх, реклам байхгүй, бүх хичээл нээлттэй.":
    "Unlimited hearts, no ads, every lesson unlocked.",
  "Хөтчөөр нээх": "Open in the browser",
  "Шимтгэл нь ТӨЛӨГДСӨН худалдан авалтаас тооцогдоно. Үлдэгдлээ авахаар админд хандана уу.":
    "Commission counts only from PAID purchases. Contact an admin to withdraw your balance.",
  "Энэ хэсэг танд нээлттэй биш байна": "This section is not open to you",
  "болгож, өөрийн мерчантын түлхүүрээ тохируулна.": "and add your own merchant keys.",
  "миний урилгын холбоос": "my invite link",
  сард: "per month",
  "тохируулна.": "as shown.",
  Үлдэгдэл: "Balance",
  "Өдрийн зорилт": "Daily goal",

  // --- Багц: профайл, дэлгүүр, лиг, найз, тэжээвэр, тэмцээн, дасгалжуулагч ---
  "Аватарын хүрээ": "Avatar frame",
  "Амьтан ба цэцэг": "Pets and plants",
  "Аппын бүх хуудасны дэвсгэр өнгө.": "The background colour for every page of the app.",
  "Асаргааны заавар": "Care guide",
  Ахиулах: "Level up",
  "Б. Батаа — спортын мастер": "B. Bataa — master of sport",
  Багш: "Teacher",
  "Багш бол «Миний сурагчид» хэсгээс одоо ч бүлгээ хөтөлж болно →":
    "If you are a teacher you can already run your group from «My students» →",
  Байр: "Rank",
  Болих: "Cancel",
  "Ботын эсрэг дадлагажих": "Practise against the bot",
  "Буух бүс": "Demotion zone",
  Бүгд: "All",
  Бүртгэгдсэн: "Registered",
  "Бүртгэл нээлттэй": "Registration open",
  "Бүртгэлтэй юу? Нэвтрэх": "Already registered? Sign in",
  "Гишүүн бол сар бүр тэмцээнд үнэгүй оролцоно.":
    "Members take part in every monthly tournament for free.",
  "Гишүүн болох": "Become a member",
  "Дараагийн түвшинд": "To the next level",
  Дараалал: "Streak",
  "Дараалал хамгаалагч": "Streak freeze",
  "Дараалал:": "Streak:",
  "Дараах сар": "Next month",
  "Дасгалжуулагч багш нар": "Coaches",
  "Дасгалжуулагчийн мэдээлэл хараахан ороогүй байна.": "No coach has added their details yet.",
  "Дасгалын өдөр": "Practice days",
  "Долоо хоног бүр Даваа гарагт шинэ тэмцээн эхэлнэ. Бүх сурагч НЭГ лигт өрсөлдөнө.":
    "A new contest starts every Monday. All learners compete in ONE league.",
  "Дэвсгэр өнгө": "Background colour",
  "Дэвших бүс": "Promotion zone",
  Дэлгэрэнгүй: "Details",
  "Дэлгүүр рүү": "Go to the shop",
  "Дэлгүүрээс амьтан эсвэл цэцэг аваарай. Өдөр бүр асарвал зоосон шагнал авна.":
    "Pick up a pet or a plant in the shop. Care for it every day and earn coins.",
  "Дүрмийг уншиж, ботын эсрэг дадлагажаад тэмцээнд ор.":
    "Read the rules, practise against the bot, then enter a tournament.",
  Дүүрсэн: "Full",
  "Ердийн банер руу буцаах": "Back to the plain banner",
  "Ердийн дэвсгэр рүү буцаах": "Back to the plain background",
  "Заадаг тоглоом": "Games taught",
  Засах: "Edit",
  Зүүсэн: "Worn",
  Зүүх: "Wear",
  "И-мэйл": "Email",
  "Ивээн тэтгэгч": "Sponsor",
  "Илгээсэн хүсэлт": "Sent requests",
  "Ирсэн хүсэлт": "Incoming requests",
  "Жагсаалтад нэрийнхээ хажууд гарна": "Shown next to your name in the list",
  "Файл сонгох": "Choose a file",
  "Сургалтын төв": "Training centres",
  "Сургалтын төвүүд": "Training centres",
  "Ойр орчмын шатар, даамын сургалтыг хаанаас үзэхээ ол.":
    "Find where to learn chess and draughts near you.",
  "Сургалтын төв хараахан бүртгэгдээгүй байна.": "No training centre listed yet.",
  Курсууд: "Courses",
  Лиг: "League",
  "Лиг хараахан байхгүй": "No league yet",
  // --- Ботын дадлагын Premium түгжээ (`components/tactiq/BotPremiumLock.tsx`) ---
  "Ботоор дадлагажих нь Premium эрхтэй хэрэглэгчид нээлттэй. Төлбөр төлсний дараа идэвхжинэ. Найзтайгаа тоглох үнэгүй.":
    "Bot practice is for Premium members. It unlocks once you pay. Playing with friends is free.",
  "Premium авах": "Get Premium",
  "Ботоор дадлагажих": "Practise with a bot",
  "Төлбөр төлсний дараа идэвхжинэ": "Unlocks after payment",
  "Миний тэжээвэр": "My pets",
  "Миний тэжээвэр →": "My pets →",
  "Монгол бичвэр": "Mongolian script",
  "Мэдэгдэл асаахад алдаа гарлаа.": "Could not turn notifications on.",
  "Мэдээллээ оруулах": "Add my details",
  Надтай: "Play with me",
  "Найз нэмэх": "Add a friend",
  "Найзаа нэмбэл түүнтэй долоо хоногийн оноогоо харьцуулж, хамтын даалгавар авах боломжтой.":
    "Add a friend to compare weekly XP and take on team quests together.",
  "Найзтайгаа хамт оноо цуглуулж, долоо хоногийн даалгавраа биелүүл.":
    "Collect XP together with a friend and finish the weekly quest.",
  "Найзынхаа хувийн кодыг дээр оруулбал хүсэлт илгээгдэнэ.":
    "Enter your friend's personal code above and a request will be sent.",
  "Найзынхаа хувийн кодыг оруулна уу. Тэр нь хүсэлтийг зөвшөөрмөгц найзууд болно.":
    "Enter your friend's personal code. Once they accept the request, you are friends.",
  "Нийт оноо": "Total XP",
  "Нийтэд харагдах анкет хараахан алга. Та мэдээллээ оруулж эхлүүлж болно.":
    "No public profile yet. You can be the first to add your details.",
  "Нийтэд харагдах нэр, зэрэг": "Public name and title",
  "Нийтэд харуулах": "Show publicly",
  "Нэг цагийн үнэ (₮) — хоосон бол «тохиролцоно»":
    "Price per hour (₮) — leave empty for «by arrangement»",
  "Бүх дүрсээ алдлаа — Та хожигдлоо": "You lost all your pieces — you lose",
  "Профайлын банер": "Profile banner",
  "Профайлын дээд банерийн өнгө. Авсан тэжээвэр тань мөн тэнд харагдана.":
    "The colour of the banner at the top of your profile. Your pets appear there too.",
  "Сайн байна!": "Nicely done!",
  "Санамсаргүй тоглогчтой шууд холбогдоно, эсвэл найзаа урина.":
    "Connect straight to a random opponent, or invite a friend.",
  "Сонгоогүй бол анкет зөвхөн танд харагдана.":
    "Leave this off and your profile stays visible only to you.",
  Сурталчлагч: "Promoter",
  "Сүхбаатар дүүрэг, 1-р хороо": "Sukhbaatar district, 1st khoroo",
  Т: "D",
  "Танд тэжээвэр байхгүй байна": "You have no pets yet",
  Танилцуулга: "About you",
  Тоглогч: "Player",
  "Тоглолтын үнэлгээ": "Practice rating",
  "Тодорхойлох тоглолт": "Placement games",
  Тохиролцоно: "By arrangement",
  Тохируулах: "Set",
  "Туршлага, ямар насны хүүхэдтэй ажилладаг, хаана хичээллэдэг…":
    "Your experience, the ages you work with, where you teach…",
  Тусламж: "Boosters",
  "Тэмцээн эхлэхийн 10 минутын өмнө сануулна":
    "We remind you 10 minutes before the tournament starts",
  "Тэмцээнд бүртгэгдлээ!": "You are registered for the tournament!",
  "Тэмцээнд оролцох": "Join a tournament",
  "Тэмцээнд орох": "Enter",
  "Тэмцээний бэлтгэл": "Tournament prep",
  "Тэмцээний дүрэм": "Tournament rules",
  "Тэмцээний сервертэй түр холбогдож чадсангүй.": "Could not reach the tournament server just now.",
  "Тэмцээний хэсгүүд": "Tournament sections",
  "Тэмцээнийг ивээн тэтгэгчид": "Tournament sponsors",
  "Тэр өдөр нээгдэнэ": "Opens on the day",
  Түвшин: "Level",
  "Түвшний явц": "Level progress",
  "Төлбөр төлөгдөж, тэмцээнд бүртгэгдлээ!":
    "Payment received — you are registered for the tournament!",
  "Удахгүй болох тэмцээн алга.": "No upcoming tournaments.",
  Утас: "Phone",
  Х: "L",
  "Хадгалахад алдаа гарлаа.": "Saving failed.",
  "Хадгалж байна…": "Saving…",
  "Хамтын даалгавар эхлүүлэх": "Start a team quest",
  "Хараахан найзгүй байна": "No friends yet",
  "Хараахан нээгдээгүй — бэлтгэж байна.": "Not open yet — we are building it.",
  Хаяг: "Address",
  "Хичээл дуусгаж цуглуулсан зоосоороо худалдан аваарай.":
    "Spend the coins you earn from finishing lessons.",
  "Хичээл эхлүүлмэгц тэр курсийн сургуулийн (Mind, Codely…) лигт орно.":
    "Start a lesson and you join the league of that course's school (Mind, Codely…).",
  "Хичээл эхлүүлэх": "Start a lesson",
  Хожигдол: "Losses",
  "Холбоос (Facebook, веб)": "Link (Facebook, website)",
  "Хуанли хоёр долоо хоногийн товыг харуулна. Түүнээс хойшхи нь хожим нэмэгдэнэ.":
    "The calendar shows the next two weeks. Later dates appear as they are scheduled.",
  "Хуваарь, чансаа, сургалтын төв, бэлтгэл.": "Schedule, rating, training centres and prep.",
  "Хүрээг тайлах": "Take the frame off",
  "Чансаа зөвхөн «Чансаа тогтоох» тэмцээнээр өрнөнө. Хожвол нэмэгдэж, хожигдвол хасагдана — ингэж тоглогч бүр өөрийн байран дээр тогтоно. Ердийн тоглолт, ботын дадлага чансааг хөндөхгүй.":
    "Rating changes only in «rated» tournaments. Win and it goes up, lose and it goes down — that is how every player settles at their true place. Casual games and bot practice leave it untouched.",
  "Чансаа тогтоох": "Rated",
  "Чансаа тогтоох тэмцээн зохион байгуулж байна": "A rated tournament is being held",
  Шагналууд: "Prizes",
  "Шагналын сан": "Prize pool",
  "Шатрын тоглолт": "Chess games",
  "Шилжиж байна…": "Taking you there…",
  "Энэ ангилалд удахгүй болох тэмцээн алга.": "No upcoming tournaments in this category.",
  "Энэ долоо хоногт хараахан ороогүй": "Not in this week's contest yet",
  "Энэ хэсэг бүртгэлтэй хүнд нээлттэй": "This section is for registered learners",
  "Энэ өдөр товлогдсон тэмцээн алга.": "No tournament is scheduled for this day.",
  "Эцсийн байрлал руу": "Jump to the final position",
  Я: "W",
  Ялалт: "Wins",
  "бүх тэмцээнд үнэгүй": "free entry to every tournament",
  мин: "min",
  оноо: "XP",
  "оноо үлдлээ.": "XP to go.",
  "таны чансаа": "your rating",
  тоглоцгооё: "let us play",
  "тоглоё!": "let us play!",
  тэмцээн: "tournament",
  "тэмцээн товлогдсон": "tournaments scheduled",
  "хоног · нийт": "days · total",
  цаг: "hour",
  "чансаа тогтоосон тоглогч хараахан алга.": "no player has a settled rating yet.",
  "ширхэг байна.": "left.",
  "энэ сард үнэгүй": "free this month",
  "Үнэгүй бүртгүүлэх": "Sign up free",
  "Өдөр бүр": "Daily",
  "Өдөр бүр асарвал шагнал авна.": "Care for it every day and earn a reward.",
  "Өмнөх сар": "Previous month",
  "Өнөөдрийн жижиг амжилт, маргаашийн их боломж юм.": "A small win today is a big chance tomorrow.",
  "Өнөөдөр шинэ зүйл сурч, өөрийгөө хөгжүүлээрэй": "Learn something new today and grow",
  "Өрсөлдөгчийн бүх дүрсийг идлээ — Та яллаа!": "You captured all your opponent's pieces — you win!",
  өдөр: "days",
  // --- Курс сонгох (`(app)/courses`, `courses/CourseCard.tsx`) ---
  "Юу сурахаа сонгоорой. Хүссэн үедээ энд буцаж ирээд сольж болно.":
    "Pick what to learn. You can come back and change it any time.",
  "4–6 нас": "Ages 4–6",
  Идэвхтэй: "Active",
  Сонгох: "Choose",
  "Тун удахгүй": "Coming soon",
  "идэвхтэй курс, үргэлжлүүлэх": "active course, continue",
  "тун удахгүй": "coming soon",
  сонгох: "choose",
  // --- Зочны хаалт, профайл, төхөөрөмж (`Protected.tsx`) ---
  "Бүртгүүлбэл оноо, дараалал, найзууд, дэлгүүр бүгд нээгдэнэ. Одоохондоо эхний хичээлүүдийг үнэгүй туршиж үзээрэй.":
    "Sign up to unlock XP, streaks, friends and the shop. For now, try the first lessons for free.",
  "Хичээл үзэх": "Browse lessons",
  "Нэвтрэлт амжилттай боловч профайл үүсээгүй байна. Доорх товчийг дарж гүйцээнэ үү.":
    "You signed in, but your profile was not created. Tap the button below to finish.",
  "Нэг дансаар зэрэг": "One account can be signed in on up to",
  "хүртэл төхөөрөмж дээр нэвтрэх боломжтой. Энэ шинэ төхөөрөмжөөр үргэлжлүүлэхийн тулд доорх жагсаалтаас хуучин нэгийг нь хасна уу.":
    "devices at once. To continue on this new device, remove an old one from the list below.",
  "Сүүлд идэвхтэй": "Last active",
  устгах: "remove",
  "Энэ хэсэг зөвхөн": "This section is only for",
  "-д нээлттэй. Таны эрх": ". Your role",
  // --- Нэвтрэх / Бүртгүүлэх (`components/tactiq/AuthCard.tsx`) ---
  Нэвтрэх: "Sign in",
  Бүртгүүлэх: "Sign up",
  Нэр: "Name",
  Батаа: "Alex",
  "Найзын код (заавал биш)": "Friend code (optional)",
  "Жишээ нь ABC123": "e.g. ABC123",
  "Имэйлээ баталгаажуулж, эхний хичээлээ дуусгамагц ХОЁУЛАА":
    "Verify your email and finish your first lesson — BOTH of you get",
  "хоногийн нэмэлт Premium авна.": "extra days of Premium.",
  "Имэйл хаяг": "Email address",
  "Нууц үг": "Password",
  "Нууц үг нуух": "Hide password",
  "Нууц үг харуулах": "Show password",
  Бүртгүүлмэгц: "Sign up and get",
  "хоногийн Premium ҮНЭГҮЙ — карт шаардахгүй.": "days of Premium FREE — no card needed.",
  эсвэл: "or",
  "Google-ээр нэвтрэх": "Continue with Google",
  "Бүртгэлгүй юу?": "No account yet?",
  "Бүртгэлтэй юу?": "Already registered?",
  "Нууц үгээ мартсан уу?": "Forgot your password?",
  "Нууц үг сэргээхийн тулд имэйлээ бичнэ үү.": "Enter your email to reset your password.",
  "Нууц үг сэргээх холбоосыг имэйлээр илгээлээ.": "We emailed you a password reset link.",
  "Имэйл эсвэл нууц үг буруу байна.": "Wrong email or password.",
  "Энэ имэйлээр бүртгэл аль хэдийн үүссэн байна.": "An account with this email already exists.",
  "Нууц үг дор хаяж 6 тэмдэгт байх ёстой.": "The password must be at least 6 characters.",
  "Имэйл хаяг буруу байна.": "That email address is not valid.",
  "Хэт олон оролдлого. Түр хүлээгээд дахин оролдоно уу.":
    "Too many attempts. Please wait a moment and try again.",
  "Нэвтрэх цонх хаагдлаа. Дахин оролдоно уу.": "The sign-in window closed. Please try again.",
  "Сүлжээнд холбогдож чадсангүй. Интернэтээ шалгана уу.":
    "Could not reach the network. Please check your connection.",
  // --- Навигаци, хэрэглэгчийн цэс ---
  Сурах: "Learn",
  Хичээл: "Lessons",
  Тоглох: "Play",
  Шатар: "Chess",
  Даам: "Draughts",
  Го: "Go",
  Дэлгүүр: "Shop",
  Профайл: "Profile",
  Тохиргоо: "Settings",
  Амжилтууд: "Achievements",
  Гэрчилгээ: "Certificate",
  Найзууд: "Friends",
  Тэмцээн: "Tournament",
  "Тэмцээний системд холбогдож байна…": "Connecting to the tournament system…",
  "Тэмцээний сайт руу очих": "Go to the tournament site",
  Тэргүүлэгчид: "Leaderboard",
  Хяналт: "Admin",
  "Миний сурагчид": "My students",
  "Миний хүүхдүүд": "My children",
  "Хэрэглэгчийн цэс": "User menu",
  Хэрэглэгч: "User",
  Бусад: "More",
  Цэс: "Menu",
  Хаах: "Close",
  Гарах: "Sign out",
  Курс: "Course",
  "Курс солих": "Change course",
  "Курс сонгох": "Choose a course",
  "Курс сонгоогүй байна": "No course selected",
  "Сурч буй курс": "Current course",
  "Юу сурахаа сонгоод, хичээллэж эхэл.": "Pick what to learn and start practising.",
  Зоос: "Coins",
  "Нийт XP": "Total XP",
  "Дараалсан өдөр": "Day streak",
  "Дарааллын хуанли": "Streak calendar",
  "Дараалал мөсөөр хамгаалагдсан": "Streak protected by a freeze",

  // --- Хэлний сонголт ---
  Хэл: "Language",
  Монгол: "Mongolian",
  Англи: "English",
  "Аппын хэлийг сонгоно уу. Хичээлийн агуулга нь багшийн бичсэн хэлээрээ хэвээр үлдэнэ.":
    "Choose the app language. Lesson content stays in the language your teacher wrote it in.",

  // --- Нийтлэг ---
  "Алдаа гарлаа.": "Something went wrong.",
  "Дахин оролдох": "Try again",
  "Энэ биш байна. Дахин сонгоод үзээрэй.": "Not this one. Try another answer.",
  "Түр хүлээнэ үү…": "Please wait…",
  Үргэлжлүүлэх: "Continue",
  Цуцлах: "Cancel",
  Буцах: "Back",
  Дууссан: "Done",
  "Хадгаллаа.": "Saved.",
  "Сүлжээ удаан байна. Дахин оролдоно уу.": "The network is slow. Please try again.",

  // --- Нэвтрэлт, профайл (Protected, Settings) ---
  "Профайл уншиж чадсангүй.": "Could not load your profile.",
  "Бүртгэл чинь дутуу үлджээ": "Your registration is incomplete",
  "Профайл үүсгэх": "Create profile",
  "Профайл руу буцах": "Back to profile",
  "Энэ хэсэг зөвхөн админд нээлттэй": "This section is for admins only",
  "Хяналтын самбарт нэвтрэх эрх танд байхгүй байна.":
    "You do not have permission to open the admin dashboard.",
  "Энэ хэсэг танд зориулагдаагүй": "This section is not for your role",
  "Миний хэсэг рүү очих": "Go to my section",
  "Таны бүртгэл хаагдсан байна": "Your account is blocked",
  "Багш эсвэл админтай холбогдож бүртгэлээ сэргээлгэнэ үү.":
    "Contact your teacher or an admin to restore your account.",
  "Бүртгэл зөвшөөрөл хүлээж байна": "Your account is awaiting approval",
  "Админ таны бүртгэлийг баталгаажуулмагц хичээлүүд нээгдэнэ.":
    "Lessons unlock as soon as an admin approves your account.",
  "Төхөөрөмжийн хязгаарт хүрлээ": "Device limit reached",
  Төхөөрөмжүүд: "Devices",
  "Энэ төхөөрөмж": "This device",
  "Нэвтрэлт хүчингүй боллоо. Дахин нэвтэрч үзнэ үү.":
    "Your session has expired. Please sign in again.",
  "Нууц үг солих холбоосыг имэйлээр илгээлээ.": "We emailed you a password reset link.",
  Ерөнхий: "General",
  "Зураг солих": "Change photo",
  "Байршуулж байна…": "Uploading…",
  "Зөвхөн зургийн файл сонгоно уу.": "Please choose an image file.",
  "Зургийн хэмжээ 5MB-ээс бага байх ёстой.": "The image must be smaller than 5MB.",
  "Зураг байршуулахад алдаа гарлаа.": "Uploading the image failed.",
  "Зураг байршуулах эрх алга. Storage-ийн дүрэм (storage.rules) байршуулагдсан эсэхийг шалгана уу.":
    "No permission to upload. Check that the Storage rules (storage.rules) are deployed.",
  "Storage-ийн багтаамж дүүрсэн байна.": "Storage is full.",
  "Firebase Storage энэ төсөл дээр үүсээгүй байна. Firebase Console → ":
    "Firebase Storage has not been created for this project. Firebase Console → ",
  "Build → Storage → Get started дарж идэвхжүүлээд, дараа нь ":
    "Build → Storage → Get started to enable it, then run ",
  "`firebase deploy --only storage` гүйцэтгэнэ үү.": "`firebase deploy --only storage`.",

  // --- Тохиргооны хэсгүүд ---
  Харагдац: "Appearance",
  Сэдэв: "Theme",
  Гэрэлтэй: "Light",
  Харанхуй: "Dark",
  Системийн: "System",
  "Дуу ба мэдэгдэл": "Sound & notifications",
  Дуу: "Sound",
  "Зөв хариулт, түвшин ахих үеийн дуу": "Sounds for correct answers and level-ups",
  Мэдэгдэл: "Notifications",
  "Өдрийн зорилтоо санагдуулах": "Remind me of my daily goal",
  Нууцлал: "Privacy",
  "Нууц үг солих": "Change password",
  "Холбоос авах": "Get a link",
  "Энэ төхөөрөмжөөс гарна": "Signs you out of this device",
  "Харагдах нэр": "Display name",
  Хадгалах: "Save",
  "Өдрийн зорилго": "Daily goal",
  "Өдөрт хэдэн хичээл дуусгах вэ (1–20)": "How many lessons per day (1–20)",
  "JPG, PNG эсвэл GIF, 5MB хүртэл": "JPG, PNG or GIF, up to 5MB",

  // --- Тоглох (лобби) ---
  "Шатар тоглох": "Play chess",
  "Даам тоглох": "Play draughts",
  "Санамсаргүй тоглогчтой шууд (P2P) холбогдоно.":
    "Connect directly (P2P) with a random opponent.",
  "Дам одоогоор зөвхөн ботын эсрэг тоглогдоно.":
    "Draughts is currently available against the bot only.",
  "Тоглогч хайх": "Find an opponent",
  "Тоглогч хайж байна…": "Looking for an opponent…",
  "Найзаа урих": "Invite a friend",
  "Холбоос үүсгэж байна…": "Creating a link…",
  "Холбоосоо найздаа илгээнэ үү": "Send the link to your friend",
  Хуваалцах: "Share",
  "Холбоос хуулах": "Copy link",
  Хуулагдлаа: "Copied",
  "Найзаа холбоос дарахыг хүлээж байна…": "Waiting for your friend to open the link…",
  "Хуулж чадсангүй — холбоосыг гараар сонгож хуулна уу.":
    "Could not copy — please select and copy the link manually.",
  "эсвэл ботоор дадлагажих": "or practise against the bot",
  "ботоор дадлагажих": "practise against the bot",
  "100 нүдэн шашки (дам)": "100-square draughts",
  "Надтай шатар тоглоё!": "Play chess with me!",
  "Шатар тоглоцгооё": "Let us play chess",
  "Тоглох хэсэг рүү очих": "Go to the play section",
  Татгалзах: "Decline",
  "Холбогдож байна…": "Connecting…",
  Найз: "Friend",

  // --- Ботын хүндрэл (`lib/tactiq/theme.ts`-ийн `DIFFICULTY_LABELS`) ---
  "Анхан шат": "Beginner",
  "Дунд шат": "Intermediate",
  "Ахисан шат": "Advanced",
  Бот: "Bot",
  Дам: "Draughts",

  // --- Тоглолт ---
  Та: "You",
  Өрсөлдөгч: "Opponent",
  "Таны ээлж": "Your turn",
  "Өрсөлдөгчийн ээлж": "Opponent's turn",
  "Ботын ээлж": "Bot's turn",
  "Бот бодож байна": "The bot is thinking",
  "Бот бодож байна…": "The bot is thinking…",
  "Өрсөлдөгчтэй шууд холбогдож байна…": "Connecting directly to your opponent…",
  "Өрсөлдөгч тасарлаа": "Your opponent disconnected",
  "Тоглоом дууссан": "Game over",
  "Дахин тоглох": "Play again",
  "Robo Coach-оос дүн авах": "Get a Robo Coach review",
  "Бууж өгөх": "Resign",
  Тэнцээ: "Draw",
  "Мад! Та ботыг яллаа!": "Checkmate! You beat the bot!",
  "Мад хийгдлээ — Бот яллаа": "Checkmated — the bot wins",
  "Мад! Та яллаа!": "Checkmate! You win!",
  "Мад хийгдлээ — Та хожигдлоо": "Checkmated — you lose",
  "Өрсөлдөгч бууж өгсөн — Та яллаа!": "Your opponent resigned — you win!",
  "Таны цаг дууслаа": "You ran out of time",
  "Өрсөлдөгчийн цаг дууслаа — Та яллаа!": "Your opponent ran out of time — you win!",
  "Ботын цаг дууслаа — Та яллаа!": "The bot ran out of time — you win!",
  "Та бууж өглөө": "You resigned",
  "Та ялсан! Ботын бүх дүрсийг идлээ.": "You win! You captured all of the bot's pieces.",
  "Бот яллаа — дахин оролдоорой": "The bot wins — give it another try",
  "Замд буцах": "Back to the path",

  // --- Дасгалжуулагчийн дүрүүд (`lib/tactiq/coaches.ts`) ---
  "Багш Батаа": "Coach Bataa",
  "Дасгалжуулагч Сараа": "Trainer Saraa",
  "Мастер Эрдэнэ": "Master Erdene",
  "Профессор Оюу": "Professor Oyu",
  "Дайчин Түмэн": "Warrior Tumen",
  "Од Наран": "Star Naran",
  "Түлхүүр Гэрэл": "Spark Gerel",
  "Далай Мөнх": "Ocean Munkh",

  // --- Дасгалжуулагчийн дүрмийн тайлбар (`lib/tactiq/coachTips.ts`) ---
  "Шатрын зорилго нь өрсөлдөгчийн ноёныг МАД хийх — зугтах газаргүй болтол боох.":
    "The goal of chess is to CHECKMATE the opponent's king — to attack it with no escape left.",
  "Эхлэлд төв нүдийг (d4, e4, d5, e5) эзлэхийг хичээ. Төвөөс дүрс бүр илүү олон нүд хамгаална.":
    "In the opening, try to take the centre (d4, e4, d5, e5). From the centre every piece controls more squares.",
  "Ноён чинь БООЛТ дор байна. Гурван л зам бий: ноёныг зөөх, боож байгаа дүрсийг идэх, эсвэл хооронд дүрс тавих.":
    "Your king is in CHECK. There are only three answers: move the king, capture the attacker, or block the line.",
  "Хүү чинь 8-р эгнээнд хүрэх гэж байна! Тэнд хүрмэгц бэрс, тэрэг, тэмээ, морь — аль ч дүрс болж хувирна.":
    "Your pawn is about to reach the 8th rank! When it does, it promotes to a queen, rook, bishop or knight.",
  "Одоо БҮТЭЭХ (сэлгээ) боломжтой: ноён хоёр нүд хөдөлж, тэрэг түүний хажууд бууна. Ноёноо хамгаалах хамгийн хурдан арга.":
    "You can CASTLE now: the king steps two squares and the rook lands beside it — the fastest way to tuck your king away.",
  "«Зугтсан хүү» (en passant): хоёр нүд үсэрсэн хүүг яг тэр дор нэг нүд үсэрсэн мэт идэж болно.":
    "En passant: a pawn that just jumped two squares can be captured as if it had moved only one.",
  "Даамын зорилго нь өрсөлдөгчийн бүх дүрсийг идэх явдал.":
    "The goal of draughts is to capture all of the opponent's pieces, or leave them with no legal move.",
  "Идэх боломж гарвал ЗААВАЛ идэх ёстой — даамд «идэхгүй өнгөрөх» гэж үгүй.":
    "If a capture is available you MUST take it — in draughts there is no declining a capture.",
  "Хэд хэдэн идэлт байвал ХАМГИЙН УРТ цувааг сонгох ёстой. Тиймээс заримдаа ганцхан нүүдэл хууль ёсны болдог.":
    "When several captures exist you must choose the LONGEST one — which is why sometimes only a single move is legal.",
  "Нэг нүүдэлд хэд хэдэн дүрс идэж болно: идсэн газраа зогсохгүй, цааш идэх боломж байвал үргэлжлүүлэн үсэрнэ.":
    "One move can capture several pieces: do not stop after the first — keep jumping while captures remain.",
  "Сүүлийн эгнээнд хүрсэн хүү ДАМКА болно: даам урагш, хойш аль ч чигт, хэдэн ч нүд хөдөлнө.":
    "A man that reaches the last row becomes a KING: it moves any number of squares, forwards or backwards.",

  // --- Суралцах зам (`/learn`) ---
  "Эндээс үргэлжлүүл": "Continue here",
  Эхлэх: "Start",
  // ⚠ «Сэдэв» гэдэг үг Тохиргоонд «Theme» гэсэн утгаар аль хэдийн
  // бүртгэгдсэн тул зам дээр «Бүлэг» гэж нэрлэв — толь нь бичвэрээрээ
  // түлхүүрлэгддэг учир нэг үг ХОЁР утгатай байж болохгүй.
  Бүлэг: "Section",
  Бэлэг: "Gift",
  Нээсэн: "Opened",
  зоос: "coins",
  дасгал: "exercises",
  Түгжээтэй: "Locked",

  // --- Шагналын popup ---
  "Бэлэг нээгдлээ!": "Gift opened!",
  "Зоосоороо дэлгүүрээс гоёл, гэрийн тэжээвэр авч болно.":
    "Spend coins in the shop on decorations and pets.",
  "Гоё!": "Nice!",

  // --- Хичээл ---
  "Хичээлийн явц": "Lesson progress",
  "Хичээл олдсонгүй": "Lesson not found",
  "Хичээл дууслаа!": "Lesson complete!",
  "Энэ хичээлийг өмнө нь дуусгасан тул оноо дахин олгогдоогүй.":
    "You had already completed this lesson, so no new points were awarded.",
};

export type Locale = "mn" | "en";

/** Англи горимд орчуулга байхгүй бол МОНГОЛ бичвэр (түлхүүр) хэвээр гарна. */
export function translate(locale: Locale, text: string): string {
  if (locale === "mn") return text;
  return EN[text] ?? text;
}
