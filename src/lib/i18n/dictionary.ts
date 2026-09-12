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
  "Та бууж өглөө": "You resigned",
  "Та ялсан! Ботын бүх нүүдэл дуусав.": "You win! The bot has no moves left.",
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
  "Одоо БҮТЭЭХ (рокировка) боломжтой: ноён хоёр нүд хөдөлж, тэрэг түүний хажууд бууна. Ноёноо хамгаалах хамгийн хурдан арга.":
    "You can CASTLE now: the king steps two squares and the rook lands beside it — the fastest way to tuck your king away.",
  "«Зугтсан хүү» (en passant): хоёр нүд үсэрсэн хүүг яг тэр дор нэг нүд үсэрсэн мэт идэж болно.":
    "En passant: a pawn that just jumped two squares can be captured as if it had moved only one.",
  "Даамын зорилго нь өрсөлдөгчийн бүх дүрсийг идэх, эсвэл нүүх боломжгүй болгох.":
    "The goal of draughts is to capture all of the opponent's pieces, or leave them with no legal move.",
  "Идэх боломж гарвал ЗААВАЛ идэх ёстой — даамд «идэхгүй өнгөрөх» гэж үгүй.":
    "If a capture is available you MUST take it — in draughts there is no declining a capture.",
  "Хэд хэдэн идэлт байвал ХАМГИЙН УРТ цувааг сонгох ёстой. Тиймээс заримдаа ганцхан нүүдэл хууль ёсны болдог.":
    "When several captures exist you must choose the LONGEST one — which is why sometimes only a single move is legal.",
  "Нэг нүүдэлд хэд хэдэн дүрс идэж болно: идсэн газраа зогсохгүй, цааш идэх боломж байвал үргэлжлүүлэн үсэрнэ.":
    "One move can capture several pieces: do not stop after the first — keep jumping while captures remain.",
  "Сүүлийн эгнээнд хүрсэн бэр ХААН болно: хаан урагш, хойш аль ч чигт, хэдэн ч нүд хөдөлнө.":
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
