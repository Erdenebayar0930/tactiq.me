import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Tactiq — бүртгэлийн өгөгдлийн сан (PostgreSQL).
 *
 * ⚠ ЭНЭ СХЕМ зөвхөн БҮРТГЭЛИЙН хэсгийг агуулна (`users`, `devices`,
 * `app_config`). Хичээл/курс/тэмцээн зэрэг бусад хуучин (MySQL/MariaDB
 * үеийн) хүснэгтүүд бүгд устгагдсан — шатрын платформын шинэ схем хожим
 * тусад нь нэмэгдэнэ.
 *
 * Postgres нь MySQL-ээс ялгаатай тул хуучин схемээс энд юу өөрчлөгдсөнийг
 * тэмдэглэв:
 *  • UUID нь ЖИНХЭНЭ багана төрөл (`uuid` + `defaultRandom()`) — MySQL дээр
 *    байхгүй байсан тул `varchar(36)` дээр апп талаас утга оноодог байсан.
 *  • TIMESTAMP нь UTC-гээр session-той хамааралгүй хадгалагдана (Postgres-ийн
 *    `timestamp without time zone` анхдагч) — MySQL-ийн адил драйвер/session
 *    цагийн бүс тохируулах шаардлагагүй болсон.
 */

/** Firebase UID нь 28 тэмдэгт — 128 нь ирээдүйд ч хүрэлцэнэ */
const UID_LEN = 128;

/**
 * Урилгын код (эцэг эх-хүүхэд холбоос) — амаар/зурвасаар дамжуулж, гараар
 * бичих тул ойлгомжгүй үсэг (0/O, 1/I) хассан цагаан толгойгоор л үүсгэнэ.
 */
const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const generateInviteCode = () =>
  Array.from(
    { length: 6 },
    () => INVITE_CODE_ALPHABET[Math.floor(Math.random() * INVITE_CODE_ALPHABET.length)]
  ).join("");

/** Firebase UID агуулах багана */
const uidCol = (name: string) => varchar(name, { length: UID_LEN });

/** Хуанлийн өдөр `YYYY-MM-DD` хэлбэрээр. Цагийн бүсийн будлианаас зайлсхийнэ. */
const dayCol = (name: string) => varchar(name, { length: 10 });

// ---------------------------------------------------------------------------
// Хэрэглэгч
// ---------------------------------------------------------------------------

/**
 * Хэрэглэгч. `uid` нь Firebase Auth-ийн UID — аутентикац Firebase дээр
 * үлдсэн тул энэ багана нь гадаад системтэй холбогдох түлхүүр болно.
 *
 * Тоглоомжуулалтын үзүүлэлтүүд (xp, gems, hearts, streak) нь ЭНД денормаль
 * хэлбэрээр хадгалагдана — толгой хэсэгт (header) хүсэлт болгонд харагддаг
 * тул нэг мөрөөс уншиж чаддаг байх нь чухал.
 */
export const users = pgTable(
  "users",
  {
    uid: uidCol("uid").primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    /** Апп дотор харагдах нэр — "CodeMaster" гэх мэт */
    displayName: varchar("display_name", { length: 120 }).notNull().default(""),
    firstName: varchar("first_name", { length: 120 }).notNull().default(""),
    lastName: varchar("last_name", { length: 120 }).notNull().default(""),
    /** Firebase Storage дахь профайл зураг */
    photoUrl: varchar("photo_url", { length: 1024 }).notNull().default(""),
    /** Төрсөн он — насанд тохирсон контент шүүхэд (сурагчид 8-16 нас) */
    birthYear: integer("birth_year").notNull().default(0),

    // --- Тоглоомжуулалт -----------------------------------------------------
    /** Нийт цуглуулсан оноо. Түвшин үүнээс тооцогдоно (`lib/tactiq/xp.ts`). */
    xp: integer("xp").notNull().default(0),
    /**
     * Эрдэнэ — дасгал зөв бөглөх, хичээл дуусгахад нэмэгдэнэ.
     *
     * ⚠ БҮХ зоосны хэмжээг ×10 болгосон (`0041_coins_x10.sql`): шагнал ба
     * дэлгүүрийн үнэ хоёуланг зэрэг өсгөсөн тул ТЭНЦВЭР хэвээр, зөвхөн
     * тоо нь нэг оронгоор урт болов. Шинэ утга нэмэхдээ энэ хуваарийг
     * баримтална — 5 биш 50, 150 биш 1500.
     */
    gems: integer("gems").notNull().default(2300),
    /**
     * ЗҮҮСЭН аватарын хүрээ (`lib/tactiq/shop.ts`-ийн id). "" = энгийн.
     *
     * ⚠ Зөвхөн ГОО ЗҮЙН зүйл — ямар ч давуу эрх өгөхгүй. Зоос зарцуулах
     * зам нь тоглоомын явцад НӨЛӨӨЛӨХГҮЙ байх нь чухал: эс бөгөөс мөнгө
     * төлж зоос авах боломжгүй хүүхэд суралцахдаа хоцорно.
     */
    avatarFrame: varchar("avatar_frame", { length: 24 }).notNull().default(""),
    /**
     * ХУДАЛДАЖ АВСАН хүрээнүүдийн id жагсаалт.
     *
     * ⚠ Тусдаа хүснэгт БИШ, жагсаалтаар: хүрээ нь цөөхөн (арваад), хэрэглэгч
     * тус бүрд бүхэлдээ уншигддаг ба хэзээ ч тусад нь асуулга шаарддаггүй.
     * Хүснэгт болговол JOIN нэмэгдэхээс өөр давуу тал алга.
     */
    ownedFrames: jsonb("owned_frames").$type<string[]>().notNull().default([]),
    /** ЗҮҮСЭН банерийн загвар (`lib/tactiq/shop.ts`). "" = ердийн. */
    bannerTheme: varchar("banner_theme", { length: 24 }).notNull().default(""),
    /** ХУДАЛДАЖ АВСАН банерийн загварууд. */
    ownedBanners: jsonb("owned_banners").$type<string[]>().notNull().default([]),
    /** ЗҮҮСЭН дэвсгэр өнгө (`lib/tactiq/shop.ts`). "" = ердийн. */
    bgTheme: varchar("bg_theme", { length: 24 }).notNull().default(""),
    /** ХУДАЛДАЖ АВСАН дэвсгэр өнгөнүүд. */
    ownedBackgrounds: jsonb("owned_backgrounds").$type<string[]>().notNull().default([]),
    /**
     * Үлдсэн зүрх. Буруу хариулт бүр нэгийг хасна, 0 болбол хичээл түр
     * зогсоно. `heartsUpdatedAt`-аас хойш өнгөрсөн хугацаагаар өөрөө сэргэнэ
     * — тиймээс таймер хадгалахгүй, зөвхөн сүүлд өөрчлөгдсөн мөчийг барина.
     */
    hearts: integer("hearts").notNull().default(5),
    heartsUpdatedAt: timestamp("hearts_updated_at").notNull().defaultNow(),
    /**
     * Реклам үзээд НЭМЭЛТ зүрх авсан СҮҮЛИЙН мөч — `AD_HEART_COOLDOWN_MINUTES`
     * (`lib/tactiq/ads.ts`) хугацаа өнгөрөөгүй бол дахин олгохгүй, эс бөгөөс
     * богино хугацаанд олон удаа "реклам үзлээ" гэж дуудаад зүрхээ хязгааргүй
     * дүүргэх боломжтой болно.
     *
     * ⚠ Бодит реклам сүлжээ (AdSense/AdMob) хараахан холбогдоогүй тул "үзсэн"
     * гэдгийг серверт ИТГЭЛТЭЙ баталгаажуулах механизм (жишээ нь AdMob-ийн
     * server-side reward callback) одоохондоо байхгүй — энэ cooldown нь
     * ЦОРЫН ГАНЦ хамгаалалт. Жинхэнэ сүлжээ холбогдмогц (`lib/tactiq/ads.ts`
     * үзнэ үү) сервер талын баталгаажуулалт нэмэгдэх ёстой.
     */
    lastAdHeartAt: timestamp("last_ad_heart_at"),

    // --- Дараалал (streak) --------------------------------------------------
    /** Тасралтгүй суралцсан өдрийн тоо */
    streakDays: integer("streak_days").notNull().default(0),
    /** Хамгийн урт дараалал — тасарсан ч амжилт нь үлдэнэ */
    longestStreak: integer("longest_streak").notNull().default(0),
    /**
     * Идэвхгүй өдрөөс дараалал хамгаалах "мөс" — Дуолинго шиг. Хэрэглэгч
     * бүр 1-тэй эхэлнэ (анхны бэлэг). Хэрэглээ бүрд НЭГ бүтэн идэвхгүй
     * өдрийг хамгаална; хэрэглэгдэх мөч болон тоо цуцлагдах нь ЗӨВХӨН
     * `nextStreak()`-д (`lib/tactiq/day.ts`) шийдэгддэг — cron шаардлагагүй,
     * зүрхтэй адил зарчим.
     */
    streakFreezes: integer("streak_freezes").notNull().default(1),
    /**
     * Амьдралдаа НИЙТ хэдэн удаа зоосоор мөс худалдаж авсан.
     *
     * `streakFreezes`-ээс ялгаатай нь ХЭЗЭЭ Ч буурахгүй (мөс зарцуулагдсан
     * ч энэ тоо хэвээр үлдэнэ) — худалдан авалтын НИЙТ хязгаарыг
     * (`MAX_STREAK_FREEZE_PURCHASES`, `lib/streakFreeze.ts`) шалгахад
     * ашиглана, эс бөгөөс мөсөө зарцуулаад дахин, дахин худалдаж авах
     * боломжтой болно.
     */
    streakFreezesPurchased: integer("streak_freezes_purchased").notNull().default(0),
    /**
     * Сүүлд идэвх бүртгэгдсэн өдөр (YYYY-MM-DD, `APP_TIMEZONE`-оор).
     * Дараалал тасарсан эсэхийг ЗӨВХӨН энэ талбараар шийднэ.
     */
    lastActiveDay: dayCol("last_active_day").notNull().default(""),
    /** Өдөрт дуусгах зорилтот хичээлийн тоо */
    dailyGoal: integer("daily_goal").notNull().default(3),

    // --- Тохиргоо -----------------------------------------------------------
    /** mn | en */
    language: varchar("language", { length: 8 }).notNull().default("mn"),
    soundEnabled: boolean("sound_enabled").notNull().default(true),
    notificationsEnabled: boolean("notifications_enabled")
      .notNull()
      .default(true),
    /** light | dark | system */
    theme: varchar("theme", { length: 16 }).notNull().default("system"),
    /**
     * Идэвхтэй курсын slug ("chess" гэх мэт) — `lib/tactiq/courses.ts`-ийн
     * `courses.slug`-тай тааруулна. `null` = хараахан сонгоогүй. Хэрэглэгч
     * `/courses`-с ХҮССЭН ҮЕДЭЭ сольж болно — зөвхөн бүртгүүлэх мөчийн
     * шийдвэр биш.
     */
    activeCourseSlug: varchar("active_course_slug", { length: 32 }),

    // --- Шатрын тоглолт -------------------------------------------------------
    /**
     * P2P (`/play/[roomId]`) БОЛОН ботын (`/play/bot`) тоглолт ХОЁУЛАНГ нь
     * ЭНД цуглуулна — тусад нь ялгах хэрэгцээ гараагүй тул нэг л дугаар.
     * Мад/бууж өгөх → ялалт/хожигдол, тэнцээ/холболт тасрах → тэнцээ
     * (`/api/play/rooms/[roomId]/end`, `/api/play/bot/result`).
     */
    /**
     * Elo үнэлгээ (`lib/tactiq/rating.ts`). Ялалт/хожигдлын ТООНООС
     * ялгаатай нь ӨРСӨЛДӨГЧИЙН ХҮЧИЙГ тооцно — сул ботыг 100 удаа ялсан
     * хүн хүчтэй тоглогчийг нэг ялсан хүнээс дээгүүр гарах ёсгүй.
     *
     * `ratingGames` нь K коэффициентэд хэрэгтэй: эхний 20 тоглолтод үнэлгээ
     * ХУРДАН хөдөлж жинхэнэ түвшиндээ ойртоно.
     */
    rating: integer("rating").notNull().default(1200),
    ratingGames: integer("rating_games").notNull().default(0),


    chessWins: integer("chess_wins").notNull().default(0),
    chessLosses: integer("chess_losses").notNull().default(0),
    chessDraws: integer("chess_draws").notNull().default(0),

    // --- Дамын тоглолт (100 нүдэн шашки) --------------------------------------
    /** Ботын эсрэг тоглолт (`/play/draughts`) — `chessWins`-тай ижил зарчим. */
    draughtsWins: integer("draughts_wins").notNull().default(0),
    draughtsLosses: integer("draughts_losses").notNull().default(0),
    draughtsDraws: integer("draughts_draws").notNull().default(0),
    /**
     * Бүртгэлийн үед сонгосон "дасгалжуулагч" аватар (`lib/tactiq/coaches.ts`-
     * ийн `COACHES`) — цэвэр загварчлал, ХИЧЭЭЛИЙН агуулгад нөлөөлдөггүй.
     */
    coachId: varchar("coach_id", { length: 20 }).notNull().default("bataa"),

    // --- Эрх ----------------------------------------------------------------
    /** super | admin | teacher | parent | student (хуучин мөрүүд: "user") */
    role: varchar("role", { length: 32 }).notNull().default("student"),
    /**
     * Нэмэлт эрх — ЗӨВХӨН "teacher" | "parent" | null. Эцэг эх мөн багш байж
     * болно (эсвэл эсрэгээр): үндсэн `role`-ыг ХӨНДӨХГҮЙгээр (шатлал, админы
     * "хэнийг хэн удирдах" логик бүгд `role`-оор л явсаар байна), зөвхөн ЭНЭ
     * НЭГ хосын хоёр дахь тал руу зэрэгцээ хандах эрхийг нэмнэ.
     * `role === secondaryRole` байх ёсгүй, гуравдагч утга (жишээ нь admin)
     * зөвшөөрөгдөхгүй — `requireTeacher`/`requireParent`, `Protected` энэ
     * хосыг л ойлгоно.
     */
    secondaryRole: varchar("secondary_role", { length: 32 }),
    /** active | pending | blocked */
    status: varchar("status", { length: 32 }).notNull().default("active"),
    /**
     * ТЕСТЕР — бүх хичээл нээлттэй сурагч.
     *
     * ⚠ `role`-д шинэ утга нэмэхийн ОРОНД туг: тестер нь ЯМАГТ сурагч
     * хэвээр (оноо, лиг, чансаа бүгд адилхан) бөгөөд эрхийн шатлалыг
     * (`lib/permissions.ts`) хөндөхгүй.
     *
     * ⚠ ЗӨВХӨН АДМИН олгоно (`api/users/[uid]`). Өөрөө тохируулж
     * чадвал төлбөртэй агуулга бүхэлдээ нээлттэй болно
     * (`drizzle/0052_user_tester.sql`).
     */
    tester: boolean("tester").notNull().default(false),

    /**
     * Сурагчийн хувийн урилгын код — ХОЁР зорилготой: (1) эцэг эх ЭНЭ
     * кодоор тухайн сурагчийн бүртгэлтэй холбогдоно, (2) шинэ найз
     * бүртгүүлэхдээ ЭНЭ кодыг оруулбал ХОЁУЛАА бонус оноо авна
     * (`referredBy` доор). Бүртгүүлэх мөчид ҮҮРЭГ бүрд эргэлзэлгүй
     * үүсгэгддэг тул role дараа нь student болж өөрчлөгдсөн ч давхар
     * үүсгэх шаардлагагүй.
     *
     * ⚠ NULLABLE ЗОРИУДААР: `$defaultFn` нь зөвхөн ШИНЭ мөр (Drizzle-ээр)
     * оруулахад ажилладаг, DB талын бодит DEFAULT БИШ — учир нь утга нь
     * мөр бүрт өөр (санамсаргүй) байх ёстой.
     */
    studentInviteCode: varchar("student_invite_code", { length: 12 }).$defaultFn(
      generateInviteCode
    ),
    /**
     * Хэнийн урилгын кодоор бүртгүүлснийг тэмдэглэнэ (тухайн хэрэглэгчийн
     * `uid`, өөрийн биш). Зөвхөн БҮРТГҮҮЛЭХ мөчид л бичигдэнэ, дараа нь
     * хэзээ ч өөрчлөгдөхгүй — аналитик, давхар бонус олгохоос сэргийлэхэд
     * хэрэгтэй.
     */
    referredBy: uidCol("referred_by"),
    /**
     * Найзын урилгын бонусыг ХЭЗЭЭ (хэрэв огт) олгосныг тэмдэглэнэ. Бонус нь
     * бүртгэлийн мөчид үнэгүй хоног болж олгогддог (`api/auth/register`) —
     * энэ талбар нь дараа нь ямар нэг урсгал дахин олгох гэвэл зогсоох
     * ЦОРЫН ГАНЦ хамгаалалт.
     */
    referralRewardedAt: timestamp("referral_rewarded_at"),

    /**
     * Premium гишүүнчлэл дуусах мөч. `null` эсвэл өнгөрсөн бол ердийн
     * хэрэглэгч. Тусдаа `isPremium` boolean ХАДГАЛДАГГҮЙ — цаг өнгөрөхөд
     * тэр тугийг цуцлах cron шаардлагатай болно; харин "одоо premium
     * эсэх"-ийг ЭНЭ нэг талбараас ХЭЗЭЭ Ч тооцож болно (`isPremiumUser`,
     * `lib/tactiq/xp.ts`) — `hearts`-тай ижил зарчим.
     *
     * ⚠ ҮНЭГҮЙ ТУРШИЛТ Ч ЭНД СУУНА. Шинэ хэрэглэгч бүр бүртгүүлмэгц
     * `TRIAL_DAYS` (+ урилгатай бол `REFERRAL_BONUS_DAYS`) хоногийн утгатай
     * үүсдэг (`lib/billing.ts`). Тиймээс "туршилтад байгаа юу, төлсөн үү"
     * гэдгийг ялгах тусдаа талбар БАЙХГҮЙ — эрхийн хувьд ялгаа нь ч байхгүй.
     * Хэн төлснийг мэдэх шаардлагатай бол `payments` хүснэгтээс хараарай.
     */
    premiumUntil: timestamp("premium_until"),

    /**
     * ГЭР БҮЛИЙН багц дуусах мөч — зөвхөн ХУДАЛДАН АВАГЧ дээр суудаг.
     *
     * ⚠ `premiumUntil`-тай ХОЛИХГҮЙ. `premiumUntil` нь "энэ данс эрхтэй
     * юү" гэдгийг хэлдэг бол энэ нь "энэ данс ӨӨР ХҮНД эрх тараах эрхтэй
     * юү" гэдгийг хэлнэ. Хоёулаа гэр бүлийн багц авахад зэрэг сунгагдана.
     *
     * ⚠ ЯАГААД ХЭРЭГТЭЙ ВЭ: багц авсны ДАРАА хүүхдээ холбосон эцэг эх ч
     * суудлаа авах ёстой. Энэ талбаргүй бол "хэдэн хоног үлдсэн" гэдгийг
     * `payments`-с сэргээн тооцох шаардлагатай болно — сунгалт давхарлаж
     * болдог тул тэр тооцоо найдваргүй.
     *
     * Хэдэн суудал ЭЗЭЛСЭН гэдгийг ЭНД хадгалахгүй — `student_links`-ээс
     * тоолно. Хоёр газарт хадгалвал зөрөх нь цаг хугацааны асуудал.
     */
    familyUntil: timestamp("family_until"),

    /**
     * ТЭМЦЭЭНИЙ ГИШҮҮНЧЛЭЛ — "bronze" | "silver" | "gold" | "premium" | null.
     *
     * ⚠ Хичээлийн `premiumUntil`-аас ТУСДАА: хоёр өөр худалдан авалт, өөр эрх.
     * Идэвхтэй эсэхийг `tournamentTierUntil`-аас тооцно (`activeMembershipTier`)
     * — хугацаа өнгөрсөн түвшин энд үлдсэн ч эрх өгөхгүй.
     */
    tournamentTier: varchar("tournament_tier", { length: 16 }),
    tournamentTierUntil: timestamp("tournament_tier_until"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("users_status_idx").on(table.status),
    index("users_email_idx").on(table.email),
    uniqueIndex("users_student_invite_code_uq").on(table.studentInviteCode),
    // Тэргүүлэгчдийн жагсаалт (leaderboard) нь XP-ээр буурахаар эрэмбэлнэ
    index("users_xp_idx").on(table.xp),
  ]
);

// ---------------------------------------------------------------------------
// Урилга (найзаа урих хямдрал)
// ---------------------------------------------------------------------------

/**
 * Найзаа урьсны бүртгэл — `users.referredBy` нь урьгдсан талын НЭГ талбар
 * бол ЭНЭ хүснэгт урилга БҮРИЙГ (хэн хэзээ хэнийг) урьсан талаас нь харах
 * боломжтойгоор хадгална: "би хэдэн найз урьж, хэдэн хоног авсан бэ" гэдгийг
 * `users`-ээс шууд тоолох арга байхгүй.
 *
 * ⚠ Мөр бүр нь урамшууллын баримт тул `referrals_referee_uq` индекс нь
 * зүгээр нэг цэвэрлэгээ БИШ — нэг хүн хоёр удаа "урьгдаж" давхар хоног
 * авахаас сэргийлэх хамгаалалт.
 *
 * ⚠ Мөр ҮҮССЭН нь урамшуулал ОЛГОГДСОН гэсэн үг БИШ. Мөр нь бүртгэлийн
 * мөчид үүснэ, харин хоног нь дараа нь (имэйл баталгаажиж, эхний хичээл
 * дуусахад) олгогдоно — `rewardedAt` тэр хоёрыг ялгана. Урьсан талын
 * `REFERRAL_REWARD_MAX_FRIENDS` лимит нь ОЛГОГДСОН мөрүүдээр л тоологдоно:
 * лимитийг бүртгэгдсэн мөрөөр тоолбол урамшуулал аваагүй (хичээлээ огт
 * эхлээгүй) найзууд бусдын байрыг эзэлнэ.
 *
 * `referredMonth`-ийг timestamp-аас ХАРВАЛ ХЭДИЙ БОЛОХГҮЙ (`YYYY-MM`)
 * баганаар нь шууд хадгалсан — `users.lastActiveDay`-тай ижил шалтгаан:
 * цагийн бүсийн тооцоог БИЧИХ мөчид НЭГ Л ГАЗАР шийднэ, унших бүрд
 * timezone-aware SQL давтахгүй. Урамшуулал сараас ХАМААРАХГҮЙ болсон ч
 * (хуучин "сар бүр тэглэгддэг хямдрал" загвар хасагдсан) тайланд хэрэгтэй.
 */
export const referrals = pgTable(
  "referrals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referrerUid: uidCol("referrer_uid").notNull(),
    refereeUid: uidCol("referee_uid").notNull(),
    referredMonth: varchar("referred_month", { length: 7 }).notNull(),
    /**
     * Урамшуулал ХЭЗЭЭ олгогдсон (`null` = хараахан олгогдоогүй).
     *
     * ⚠ Энэ нь УРЬСАН талын хоногийг тэмдэглэнэ. Урьгдсан талынхыг
     * `users.referralRewardedAt` тэмдэглэдэг — хоёулаа НЭГ мөчид тавигддаг
     * ч тусад нь байх ёстой: лимитэд хүрсэн үед урьсан талд олгогдохгүй,
     * урьгдсан талд олгогдоно.
     */
    rewardedAt: timestamp("rewarded_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("referrals_referrer_month_idx").on(table.referrerUid, table.referredMonth),
    // `REFERRAL_REWARD_MAX_FRIENDS` лимитийг шалгах тоолол — хичээл дуусгах бүрд
    // явдаг тул индексгүй бол урьсан талын мөр бүрийг уншина.
    index("referrals_referrer_rewarded_idx").on(table.referrerUid, table.rewardedAt),
    // Нэг хэрэглэгч ЗӨВХӨН НЭГ удаа "урьсан" гэж тооцогдоно — эс бөгөөс
    // referredBy-г дараа нь өөр кодоор дахин бичих боломжгүй ч (зөвхөн
    // бүртгэлийн мөчид) энэ хүснэгтэд давхар мөр орох эрсдэлээс сэргийлнэ.
    uniqueIndex("referrals_referee_uq").on(table.refereeUid),
  ]
);

// ---------------------------------------------------------------------------
// Эцэг эх / багш — сурагчийн холбоос
// ---------------------------------------------------------------------------

/**
 * Насанд хүрэгч (эцэг эх эсвэл багш) ↔ сурагчийн холбоос.
 *
 * ⚠ ЯАГААД `users` ДЭЭР БАГАНА БИШ ВЭ: нэг сурагчид ОЛОН насанд хүрэгч
 * (ээж, аав, багш) холбогдож болно, мөн нэг багшид олон сурагч байна —
 * энэ нь олон-олон харьцаа тул тусдаа хүснэгт байх ёстой.
 *
 * ⚠ `relation` нь холбоос үүсэх мөчийн ҮҮРГИЙГ хөлдөөнө, `users.role`-оос
 * ТУСДАА. Учир нь нэг хүн эцэг эх БА багш хоёулаа байж болно
 * (`users.secondaryRole`): тэр хүн өөрийн хүүхдийг "parent"-аар, ангийнхаа
 * сурагчдыг "teacher"-ээр холбоно. `role`-оос гаргаж авбал энэ хоёр
 * жагсаалт хольцолдоно.
 *
 * ⚠ ХОЛБОГДОХ ЗАМ НЬ СУРАГЧИЙН КОД (`users.studentInviteCode`). Тэр код нь
 * 32 үсэгт цагаан толгойгоос 6 тэмдэгт (~1.07 тэрбум хувилбар) ч гэсэн
 * ХҮҮХДИЙН өгөгдөл рүү нээгддэг хаалга тул холбох route нь ЗААВАЛ
 * rate limit-тэй байх ёстой (`api/students/route.ts`).
 */
export const studentLinks = pgTable(
  "student_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Насанд хүрэгчийн uid — жагсаалтыг ҮРГЭЛЖ эндээс шүүнэ. */
    adultUid: uidCol("adult_uid").notNull(),
    studentUid: uidCol("student_uid").notNull(),
    /** "parent" | "teacher" — дээрх тайлбар. */
    relation: varchar("relation", { length: 16 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    /*
     * Нэг насанд хүрэгч нэг сурагчийг НЭГ үүргээр ганц удаа холбоно. Үүрэг
     * нь түлхүүрийн ХЭСЭГ — ижил хүн нэг сурагчийг эцэг эх БА багшийн
     * хувиар зэрэг холбох нь утга агуулж болзошгүй тул хориглосонгүй.
     */
    uniqueIndex("student_links_uq").on(table.adultUid, table.studentUid, table.relation),
    index("student_links_adult_idx").on(table.adultUid, table.relation),
    // Сурагч "хэн намайг харж байна вэ" гэдгээ харах, бүртгэл устгахад.
    index("student_links_student_idx").on(table.studentUid),
  ]
);

export type StudentLinkRow = typeof studentLinks.$inferSelect;

// ---------------------------------------------------------------------------
// Найзууд
// ---------------------------------------------------------------------------

/**
 * Найзын холбоо — хүсэлт илгээх, зөвшөөрөх.
 *
 * ⚠ ХОСЫГ ЭРЭМБЭЛЖ ХАДГАЛНА (`userAUid < userBUid`). Хэрэв "хэн хэнд илгээв"
 * гэсэн дарааллаар нь хадгалбал А→Б ба Б→А гэсэн ХОЁР мөр үүсэх боломжтой
 * болж, "найз мөн үү" гэсэн шалгалт бүр хоёр чиглэлээр хайх шаардлагатай
 * болно. Эрэмбэлсэн хосын НЭГ unique индекс тэр бүх ангиллыг нэг дор
 * хаана — хэн санаачилсныг `requestedBy` тусад нь хадгална.
 *
 * `status`: "pending" (хүлээгдэж буй) | "accepted" (найзууд). Татгалзсан
 * хүсэлтийн мөрийг УСТГАНА, "declined" гэж хадгалахгүй — эс бөгөөс
 * татгалзсан хүн дахин хүсэлт илгээж чадахгүй болно.
 */
export const friendships = pgTable(
  "friendships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Цагаан толгойн дарааллаар ЭХНИЙХ нь — доорх тайлбар. */
    userAUid: uidCol("user_a_uid").notNull(),
    userBUid: uidCol("user_b_uid").notNull(),
    /** Хүсэлтийг САНААЧИЛСАН тал — зөвшөөрөх эрхийг НӨГӨӨ талд өгөхөд. */
    requestedBy: uidCol("requested_by").notNull(),
    /** "pending" | "accepted" */
    status: varchar("status", { length: 16 }).notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    respondedAt: timestamp("responded_at"),
  },
  (table) => [
    uniqueIndex("friendships_pair_uq").on(table.userAUid, table.userBUid),
    // Хоёр талын жагсаалтыг тусад нь шүүнэ — хос эрэмбэлэгдсэн тул нэг
    // индексээр хоёуланг нь барих боломжгүй.
    index("friendships_a_idx").on(table.userAUid, table.status),
    index("friendships_b_idx").on(table.userBUid, table.status),
  ]
);

export type FriendshipRow = typeof friendships.$inferSelect;

/**
 * Найзын хосын долоо хоногийн ХАМТЫН зорилт.
 *
 * Хоёр найз НЭГ зорилтод (жишээ нь 300 XP) хамтдаа хүрнэ — хувь нэмэр нь
 * тусад нь (`xpA`, `xpB`) бичигдэх ба нийлбэрээр нь дүгнэгдэнэ.
 *
 * ⚠ `weekKey` нь ДАВААГИЙН огноо (`lib/tactiq/day.ts`-ийн `startOfWeek`),
 * ISO долоо хоногийн дугаар БИШ. Дугаарлалт нь жилийн зааг дээр (52/53
 * долоо хоног, "W01" аль жилийнх вэ) будлиан үүсгэдэг бол огноо нь
 * эргэлзээгүй бөгөөд шууд эрэмбэлэгдэнэ.
 */
export const friendQuests = pgTable(
  "friend_quests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Даваа гарагийн огноо `YYYY-MM-DD`. */
    weekKey: dayCol("week_key").notNull(),
    /** `friendships`-тай ИЖИЛ зарчим — эрэмбэлэгдсэн хос. */
    userAUid: uidCol("user_a_uid").notNull(),
    userBUid: uidCol("user_b_uid").notNull(),
    goalXp: integer("goal_xp").notNull(),
    xpA: integer("xp_a").notNull().default(0),
    xpB: integer("xp_b").notNull().default(0),
    /** Зорилтод хүрсэн мөч. `null` = хараахан хүрээгүй. */
    completedAt: timestamp("completed_at"),
    /**
     * Шагнал олгосон мөч.
     *
     * ⚠ `completedAt`-аас ТУСДАА байх ЁСТОЙ. "Дууссан уу" ба "шагнал
     * олгогдсон уу" нь ХОЁР ӨӨР асуулт: хичээл дуусгах бүрд энэ мөр
     * шинэчлэгддэг тул зөвхөн `completedAt`-аар шийдвэл дууссаны дараах
     * хичээл бүрд зоос дахин олгогдоно. Шагналыг `rewarded_at IS NULL`
     * нөхцөлт UPDATE-ээр НЭГ УДАА нэхэмжилнэ.
     */
    rewardedAt: timestamp("rewarded_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    // Нэг хос НЭГ долоо хоногт ГАНЦ даалгавартай.
    uniqueIndex("friend_quests_week_pair_uq").on(
      table.weekKey,
      table.userAUid,
      table.userBUid
    ),
    index("friend_quests_a_idx").on(table.userAUid, table.weekKey),
    index("friend_quests_b_idx").on(table.userBUid, table.weekKey),
  ]
);

export type FriendQuestRow = typeof friendQuests.$inferSelect;

// ---------------------------------------------------------------------------
// Лиг (долоо хоногийн өрсөлдөөн)
// ---------------------------------------------------------------------------

/**
 * Нэг долоо хоногийн нэг бүлэг (cohort) — ижил шатны ~30 хүн.
 *
 * ⚠ ЯАГААД CRON БАЙХГҮЙ ВЭ: долоо хоног солигдоход БҮХ хэрэглэгчийг нэг
 * дор дүгнэх ажил (cron) энэ төсөлд ажиллуулах газаргүй — PM2 нь олон
 * instance-аар (cluster) ажилладаг тул нэг cron бүх instance дээр давхар
 * гүйнэ. Оронд нь дүгнэлт ЗАЛХУУ (lazy): хэрэглэгч эргэж ирэхэд өөрийнх
 * нь ӨМНӨХ долоо хоног дүгнэгдэнэ. Энэ нь боломжтой яг ЭНЭ ШАЛТГААНААР:
 * долоо хоног дуусмагц тухайн бүлгийн XP-үүд ХӨЛДӨНӨ (`league_members.xp`
 * нь тухайн долоо хоногийн мөр тул хэзээ ч дахин өөрчлөгдөхгүй) — тиймээс
 * хэн хэдэн сарын дараа орж ирсэн ч ЯГ ижил байр гарна.
 */
export const leagueCohorts = pgTable(
  "league_cohorts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /**
     * ЛИГИЙН ТҮЛХҮҮР — сургуулийн slug ("mind", "codely" …) эсвэл "other"
     * (`leagueKeyForSchool`, `lib/tactiq/league.ts`).
     *
     * ⚠ Нэр нь `course_slug` хэвээр: урьд нь лиг курс тус бүрд тусдаа байсан.
     * Баганыг нэрлэж солиогүй нь DDL-гүй шилжих, хуучин түүхийг хадгалах
     * зорилготой (`drizzle/0036_school_leagues.sql`).
     */
    courseSlug: varchar("course_slug", { length: 32 }).notNull(),
    /** `lib/tactiq/league.ts`-ийн `LEAGUE_TIERS` индекс. */
    tier: integer("tier").notNull(),
    /** Даваа гарагийн огноо `YYYY-MM-DD`. */
    weekKey: dayCol("week_key").notNull(),
    /**
     * Одоогийн гишүүдийн тоо — `count(*)`-ыг давтахгүйн тулд ЭНД хөтөлнө.
     *
     * ⚠ Бүлэг сонгох нь хэрэглэгч бүрийн эхний XP дээр явагддаг халуун зам
     * тул тэнд `count(*)` хийвэл гишүүд олшрох тусам удаашрана.
     */
    memberCount: integer("member_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    // "Энэ КУРСЫН, энэ шатны, энэ долоо хоногийн, дүүрээгүй бүлэг".
    index("league_cohorts_course_tier_week_idx").on(
      table.courseSlug,
      table.tier,
      table.weekKey,
      table.memberCount
    ),
  ]
);

/**
 * Хэрэглэгчийн НЭГ долоо хоногийн лигийн бүртгэл.
 *
 * ⚠ Мөр нь долоо хоног дууссаны ДАРАА Ч ҮЛДЭНЭ — түүх бөгөөд дүгнэлтийн
 * цорын ганц эх сурвалж (дээрх "залхуу дүгнэлт"). Хэзээ ч цэвэрлэхгүй.
 */
export const leagueMembers = pgTable(
  "league_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cohortId: uuid("cohort_id").notNull(),
    uid: uidCol("uid").notNull(),
    /**
     * Курсын хуулбар — бүлгийн мөр уншихгүйгээр "миний энэ курсын мөр"-ийг
     * олох, БОЛОН доорх нэгэн утгын индексэд хэрэгтэй.
     */
    courseSlug: varchar("course_slug", { length: 32 }).notNull(),
    weekKey: dayCol("week_key").notNull(),
    /** Бүлгийн шатны хуулбар — дүгнэхэд бүлгийн мөр уншихгүйн тулд. */
    tier: integer("tier").notNull(),
    /** ЭНЭ долоо хоногт хичээлээр цуглуулсан XP. */
    xp: integer("xp").notNull().default(0),

    // --- Дүгнэлт (долоо хоног дууссаны дараа НЭГ УДАА бичигдэнэ) ---------
    /** Эцсийн байр (1-ээс эхэлнэ). `null` = хараахан дүгнээгүй. */
    rank: integer("rank"),
    /** "promoted" | "demoted" | "stayed" */
    outcome: varchar("outcome", { length: 16 }),
    /**
     * Дүгнэсэн мөч. ⚠ Энэ талбар нь ДАВХАР ДЭВШИЛТЭЭС хамгаалах ЦОРЫН ГАНЦ
     * хамгаалалт: дүгнэлт нь `settled_at IS NULL` нөхцөлтэй UPDATE-ээр
     * нэхэмжлэгддэг тул хэдэн ч хүсэлт зэрэг ирсэн шат НЭГ Л удаа өөрчлөгдөнө.
     */
    settledAt: timestamp("settled_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    /*
     * Нэг хэрэглэгч, нэг КУРСТ, нэг долоо хоногт ЗӨВХӨН НЭГ бүлэгт.
     *
     * ⚠ `courseSlug` нь энэ индексэд ЗААВАЛ — үгүй бол сурагч долоо хоногт
     * ганц л курст өрсөлдөж чадах бөгөөд хоёр дахь курсын мөр чимээгүйхэн
     * унтарна (`onConflictDoNothing`).
     */
    uniqueIndex("league_members_uid_course_week_uq").on(
      table.uid,
      table.courseSlug,
      table.weekKey
    ),
    // Бүлгийн жагсаалтыг XP-ээр эрэмбэлэх (хамгийн олон дуудагддаг асуулга).
    index("league_members_cohort_xp_idx").on(table.cohortId, table.xp),
    // "Миний дүгнэгдээгүй өмнөх долоо хоног" — залхуу дүгнэлтийн эхлэл.
    index("league_members_uid_settled_idx").on(table.uid, table.settledAt),
  ]
);

export type LeagueMemberRow = typeof leagueMembers.$inferSelect;

/**
 * Сурагчийн СУРГУУЛЬ ТУС БҮРИЙН одоогийн лигийн шат.
 *
 * ⚠ `course_slug` баганад лигийн түлхүүр (сургуулийн slug) бичигдэнэ —
 * сурагч Mind-д Алт, Codely-д Хүрэл лигт зэрэг байж болно. Курс тус бүрийн
 * хуучин мөрүүдийг `drizzle/0036_school_leagues.sql` сургуулиар нь, хамгийн
 * өндөр шатаар нэгтгэсэн.
 *
 * ⚠ Долоо хоног бүрийн БАЙР нь `league_members`-д, харин "одоо аль шатанд
 * байгаа" нь ЭНД. Хоёуланг нь нэг газар хадгалж болохгүй: шинэ долоо
 * хоногт аль шатны бүлэг рүү орохыг ЭНЭ мөр шийднэ, тэр үед шинэ
 * `league_members` мөр хараахан байхгүй.
 *
 * Мөр БАЙХГҮЙ = хамгийн доод шат (`LEAGUE_TIERS[0]`, Хүрэл). Тиймээс шинэ
 * курс эхлэхэд урьдчилж мөр үүсгэх шаардлагагүй.
 */
export const courseLeagues = pgTable(
  "course_leagues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    uid: uidCol("uid").notNull(),
    courseSlug: varchar("course_slug", { length: 32 }).notNull(),
    /** `lib/tactiq/league.ts`-ийн `LEAGUE_TIERS` индекс. */
    tier: integer("tier").notNull().default(0),
    /**
     * ХАМГИЙН СҮҮЛД өрсөлдсөн долоо хоног (Даваа гарагийн огноо).
     *
     * ⚠ `updatedAt`-аар ОРЛУУЛЖ БОЛОХГҮЙ. `updatedAt` нь дүгнэлт бичих
     * бүрд хөдөлдөг тул "хэзээ идэвхтэй байсан" гэдгийг хэлэхгүй. Энэ
     * талбар нь ЗӨВХӨН хичээл хийж бүлэгт нэгдэхэд шинэчлэгдэнэ.
     *
     * Урт завсарлагаар шат бууруулах (`IDLE_WEEKS_TO_DEMOTE`) тооцоо
     * БҮХЭЛДЭЭ энэ дээр суурилна.
     */
    lastWeekKey: dayCol("last_week_key"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("course_leagues_uid_course_uq").on(table.uid, table.courseSlug),
  ]
);

export type CourseLeagueRow = typeof courseLeagues.$inferSelect;

// ---------------------------------------------------------------------------
// Курст зарцуулсан цаг
// ---------------------------------------------------------------------------

/**
 * Курс тус бүрд зарцуулсан НИЙТ хугацаа (секундээр).
 *
 * ⚠ `lesson_progress`-д хадгалж БОЛОХГҮЙ: тэр хүснэгт нь хичээл бүрд
 * ЗӨВХӨН НЭГ мөртэй (`lesson_progress_uid_lesson_uq`) тул давтан үзсэн
 * хугацаа хаягдана. Энэ хүснэгт нь давталтыг ч тоолно.
 *
 * ⚠ Хугацааг КЛИЕНТ хэмжиж илгээдэг тул ИТГЭЛТЭЙ БИШ. Тиймээс энэ тоо нь
 * ЗӨВХӨН статистик — оноо, эрх, шагнал ХЭЗЭЭ Ч үүнээс хамаарахгүй. Нэг
 * хичээлээс хүлээн авах дээд хязгаарыг сервер тавина
 * (`lib/api/courseTime.ts`).
 */
export const courseTime = pgTable(
  "course_time",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    uid: uidCol("uid").notNull(),
    courseSlug: varchar("course_slug", { length: 32 }).notNull(),
    seconds: integer("seconds").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("course_time_uid_course_uq").on(table.uid, table.courseSlug),
    index("course_time_uid_idx").on(table.uid),
  ]
);

export type CourseTimeRow = typeof courseTime.$inferSelect;

// ---------------------------------------------------------------------------
// Төлбөр (Premium)
// ---------------------------------------------------------------------------

/**
 * Premium худалдан авалт бүрийн НЭГ мөр — QPay нэхэмжлэлтэй нэг-нэг харьцаатай.
 *
 * ⚠ ЯАГААД ТУСДАА ХҮСНЭГТ ВЭ, ЗӨВХӨН `users.premiumUntil` БИШ: төлбөр бол
 * МӨНГӨ. "Хэн, хэзээ, хэдийг, ямар нэхэмжлэлээр төлсөн" гэдэг бүртгэл
 * баримт болж үлдэх ёстой — маргаан гарахад, тайлан гаргахад, давхар
 * төлөлт шалгахад хэрэгтэй. `premiumUntil` нь зөвхөн ОДООГИЙН ТӨЛӨВ,
 * түүхийг агуулдаггүй.
 *
 * ⚠ `senderInvoiceNo` нь ӨВӨРМӨЦ: QPay webhook болон poll хоёулаа энэ
 * дугаараар мөрөө олдог. Давхардвал нэг төлбөр хоёр удаа тоологдож,
 * хэрэглэгчид давхар хугацаа нэмэгдэнэ.
 */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    uid: uidCol("uid").notNull(),
    /** `lib/billing.ts`-ийн `PlanId` — "monthly" | "quarterly" | "halfYear" | "yearly" */
    planId: varchar("plan_id", { length: 16 }).notNull(),
    /**
     * Худалдан авалтын төрөл — `lib/billing.ts`-ийн `PaymentKind`.
     *
     * ⚠ Анхдагч "premium": энэ багана нэмэгдэхээс өмнөх бүх мөр Premium
     * худалдан авалт байсан тул хуучин баримт зөв ангилагдана.
     */
    kind: varchar("kind", { length: 16 }).notNull().default("premium"),
    /** Төрлөөс хамаарсан лавлагаа — `tournament` бол тэмцээний id. */
    ref: varchar("ref", { length: 64 }),
    /**
     * ЖИНХЭНЭ төлөх дүн (₮).
     *
     * ⚠ Сервер тал `PLANS`-аас уншина, клиентээс ХЭЗЭЭ Ч авахгүй — эс бөгөөс
     * хэрэглэгч DevTools-оор 100₮ гэж илгээгээд жилийн багц авна.
     */
    amountMnt: integer("amount_mnt").notNull(),
    /**
     * Хэрэглэсэн хямдрал (%) — ХУУЧИН баримтуудын төлөө үлдсэн багана.
     *
     * ⚠ Урилгын урамшуулал нь хувийн хямдрал байхаа больж ҮНЭГҮЙ ХОНОГ
     * болсон тул шинэ мөрүүд ҮРГЭЛЖ 0. Устгаагүй шалтгаан нь: төлбөрийн
     * баримтыг буцаж ЗАСАХГҮЙ — тухайн үед хэрэглэгч ямар нөхцөлөөр
     * төлснийг мөр өөрөө хадгалж үлдэх ёстой.
     */
    discountPercent: integer("discount_percent").notNull().default(0),
    /** "pending" | "paid" | "canceled" */
    status: varchar("status", { length: 16 }).notNull().default("pending"),
    /** QPay-ийн `invoice_id` — төлбөр шалгахад (`checkPayment`) */
    invoiceId: varchar("invoice_id", { length: 64 }).notNull().default(""),
    /** БИДНИЙ дугаар — QPay үүнийг webhook дотроо буцааж илгээнэ */
    senderInvoiceNo: varchar("sender_invoice_no", { length: 64 }).notNull(),
    /**
     * НӨАТ-ын баримт хэнд бичигдэх вэ: "citizen" (хувь хүн) | "organization".
     *
     * ⚠ Сонголтыг ТӨЛБӨРИЙН МӨРД хадгална, хэрэглэгчийн профайлд БИШ: нэг
     * хүн өөрийн нэрээр ч, компанийхаа нэрээр ч төлж болно. Мөр бүр тухайн
     * үеийн сонголтоо өөртөө агуулах ёстой — эс бөгөөс баримт дахин
     * хэвлэхэд буруу нэр дээр гарна.
     */
    ebarimtType: varchar("ebarimt_type", { length: 16 }).notNull().default("citizen"),
    /**
     * Байгууллагын регистрийн дугаар (7 орон). Хувь хүн бол ХООСОН.
     *
     * ⚠ Хувь хүний регистрийг (УБ12345678) ХАДГАЛАХГҮЙ: тэр нь хувийн
     * мэдээлэл бөгөөд иргэний НӨАТ-ын баримтад шаардлагагүй.
     */
    registerNo: varchar("register_no", { length: 16 }).notNull().default(""),
    /**
     * Хэрэглэсэн СУРТАЛЧЛАГЧИЙН код (`promo_codes.code`), эсвэл `null`.
     *
     * ⚠ Гадаад түлхүүр ТАВИАГҮЙ, зориуд: код хожим устгагдсан ч ТӨЛБӨРИЙН
     * БАРИМТ өөрчлөгдөх ёсгүй — тухайн үед ямар нөхцөлөөр төлснийг мөр
     * өөрөө хадгална.
     */
    promoCode: varchar("promo_code", { length: 24 }),
    /** Кодын эзэн — шимтгэл хэнд ногдохыг заана. */
    promoterUid: uidCol("promoter_uid"),
    /**
     * Сурталчлагчид ногдох шимтгэл (₮).
     *
     * ⚠ ХАДГАЛСАН тоо, тооцоолсон биш. Хувь хэмжээ (`PROMO_COMMISSION_PERCENT`)
     * хожим өөрчлөгдвөл ХУУЧИН төлбөрүүдийн шимтгэл өөрчлөгдөх ЁСГҮЙ —
     * тэдгээр нь аль хэдийн амласан, магадгүй олгогдсон мөнгө.
     */
    commissionMnt: integer("commission_mnt").notNull().default(0),
    /**
     * ТӨЛБӨРИЙН СУВАГ — `lib/api/paymentProviders.ts`-ийн `ProviderId`.
     *
     * ⚠ Анхдагч "qpay": энэ багана нэмэгдэхээс өмнөх БҮХ мөр QPay-ээр
     * төлөгдсөн тул хуучин баримт зөв ангилагдана.
     *
     * ⚠ Мөрд ХАДГАЛНА, тооцоолохгүй: тухайн төлбөр ЯМАР сувгаар орсныг
     * дараа нь сэргээх аргагүй (`invoice_id` нь суваг бүрд өөр
     * форматтай). Буцаалт, тулгалт хийхэд энэ багана шаардлагатай.
     */
    provider: varchar("provider", { length: 16 }).notNull().default("qpay"),
    /**
     * ЖИНХЭНЭ цэнэглэсэн валют (ISO 4217) ба тэр валют дахь дүн.
     *
     * ⚠ `amount_mnt` нь ҮРГЭЛЖ төгрөгийн дүн хэвээр — тайлан, шимтгэл,
     * урамшуулал бүгд түүн дээр тооцогддог. Гадаад картаар төлөхөд
     * хэрэглэгч USD төлдөг ч бидний дотоод бүртгэл нэг валютаар
     * үлдэх ёстой, эс бөгөөс нийлбэр гаргах бүрд ханш хэрэгтэй болно.
     *
     * ⚠ `charged_amount` нь тухайн валютын ХАМГИЙН ЖИЖИГ НЭГЖЭЭР
     * (USD → цент). Бутархай тоо ХЭРЭГЛЭХГҮЙ: `float` дээр мөнгө
     * тоолох нь бөөрөнхийлөлтийн алдаа үүсгэдэг.
     */
    currency: varchar("currency", { length: 3 }).notNull().default("MNT"),
    chargedAmount: integer("charged_amount").notNull().default(0),
    /** Энэ төлбөрөөр нэмэгдсэн хоног — баримтад үлдээнэ */
    days: integer("days").notNull(),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("payments_sender_no_uq").on(table.senderInvoiceNo),
    index("payments_uid_idx").on(table.uid, table.createdAt),
  ]
);

export type PaymentRow = typeof payments.$inferSelect;

/**
 * ТЭМЦЭЭНИЙ БҮРТГЭЛ — хэрэглэгч аль тэмцээнд, ямар эрхээр бүртгүүлсэн бэ.
 *
 * Тэмцээн өөрөө (хос, үр дүн) ТЭМЦЭЭНИЙ СЕРВЕРТ амьдарна. Энэ хүснэгт нь
 * зөвхөн ТӨЛБӨР/КВОТЫН баримт:
 *   • `source` "free"  — гишүүнчлэлийн сарын үнэгүй эрхээр (квотод тоологдоно)
 *   • `source` "paid"  — оролцох төлбөр төлж (`paymentId`)
 *   • `source` "open"  — тэмцээн өөрөө үнэгүй (квотод тоологдохгүй)
 *
 * ⚠ (uid, tournamentId) ӨВӨРМӨЦ: давхар товшилт, webhook + poll зэрэг
 * ирэхэд нэг хүн нэг тэмцээнд хоёр удаа бүртгэгдэж, квот хоёр удаа
 * хасагдахаас сэргийлнэ.
 *
 * ⚠ `syncedAt` — тэмцээний сервер рүү амжилттай илгээсэн мөч. Төлбөр орсон
 * ч тэр сервер түр унасан байж болно; `null` мөрүүдийг жагсаалт ачаалах
 * бүрд дахин илгээнэ (`lib/api/tournamentEntries.ts`).
 */
export const tournamentEntries = pgTable(
  "tournament_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    uid: uidCol("uid").notNull(),
    tournamentId: varchar("tournament_id", { length: 64 }).notNull(),
    /** "free" | "paid" | "open" */
    source: varchar("source", { length: 16 }).notNull(),
    /** Апп-ын бүсийн `YYYY-MM` — сарын квот тоолоход. */
    monthKey: varchar("month_key", { length: 7 }).notNull(),
    paymentId: uuid("payment_id"),
    syncedAt: timestamp("synced_at"),
    /**
     * Тэмцээн эхлэхийн өмнөх мэдэгдэл илгээсэн мөч (`null` = илгээгээгүй).
     *
     * ⚠ ЯАГААД ХЭРЭГТЭЙ: илгээгч минут тутам ажиллана
     * (`/api/cron/tournament-reminders`). Тэмдэглэхгүй бол 10 минутын
     * цонхонд сурагч 10 удаа мэдэгдэл авна — тэр нь мэдэгдлийг бүрмөсөн
     * унтраах хамгийн хурдан шалтгаан.
     */
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("tournament_entries_uid_tournament_uq").on(table.uid, table.tournamentId),
    index("tournament_entries_uid_month_idx").on(table.uid, table.monthKey),
  ]
);

export type TournamentEntryRow = typeof tournamentEntries.$inferSelect;

/**
 * Гэр бүлийн багцын СУУДАЛ — хэн хэнд эрх тараасан бэ.
 *
 * ⚠ ЯАГААД `student_links`-ээр л тоолж БОЛОХГҮЙ ВЭ: холбоосыг САЛГАЖ
 * болдог. Салгасныг суудал сулласан гэж үзвэл эцэг эх 3 хүүхдээ холбоод,
 * эрх нь орсны дараа салгаад, өөр 3-ыг холбож — нэг багцаар хязгааргүй
 * хүнд эрх тарааж чадна. Олгосон эрхийг буцааж авах боломжгүй тул суудал
 * нь ОЛГОСОН мөчид л түгжигдэх ёстой.
 *
 * Мөр нь холбоос салгасан ч ҮЛДЭНЭ, зөвхөн `grantedUntil` өнгөрөхөд суудал
 * сулрана — өөрөөр хэлбэл багцын хугацаа дуусахад. Ижил хүүхдийг дахин
 * холбоход байгаа мөр нь шинэчлэгдэнэ, шинэ суудал ЭЗЛЭХГҮЙ.
 *
 * Худалдан авагч ӨӨРӨӨ энд БАЙХГҮЙ — түүний суудал нь `users.familyUntil`
 * өөрөө. Тиймээс энд дээд тал нь `FAMILY_SEATS - 1` мөр байна.
 */
export const familySeats = pgTable(
  "family_seats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Багц худалдаж авсан хүн (`users.familyUntil` түүн дээр суудаг). */
    ownerUid: uidCol("owner_uid").notNull(),
    /** Суудал авсан гишүүн. */
    memberUid: uidCol("member_uid").notNull(),
    /** Энэ суудлаар олгосон эрхийн дуусах мөч — суудал хэзээ сулрахыг заана. */
    grantedUntil: timestamp("granted_until").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    // Нэг гишүүн нэг эзэнд ЗӨВХӨН нэг суудал — дахин холбоход мөр шинэчлэгдэнэ.
    uniqueIndex("family_seats_owner_member_uq").on(table.ownerUid, table.memberUid),
    index("family_seats_owner_idx").on(table.ownerUid, table.grantedUntil),
  ]
);

export type FamilySeatRow = typeof familySeats.$inferSelect;

// ---------------------------------------------------------------------------
// Сурталчлагчийн хөтөлбөр
// ---------------------------------------------------------------------------

/**
 * СУРТАЛЧЛАГЧИЙН КОД — худалдан авагчид хямдрал, эзэнд нь шимтгэл.
 *
 * ⚠ Кодыг ЗӨВХӨН админ үүсгэнэ. Хэрэглэгч өөртөө код үүсгэдэг байвал
 * хэн ч хоёр данс нээж, нэгээрээ нөгөөгийнхөө кодыг ашиглан мөнхийн
 * 10% хямдрал + 10% шимтгэл авна — өөрөөр хэлбэл 20% алдагдал. Админаар
 * дамжуулах нь энэ эргэлтийг таслах хамгийн энгийн арга.
 *
 * ⚠ Хувь хэмжээг КОД ТУС БҮРД хадгална (`lib/billing.ts`-ийн анхдагчаас
 * эхэлнэ). Ирээдүйд онцгой түншид өөр хувь тохирох боломж нээлттэй
 * үлдэх бөгөөд хуучин кодуудын нөхцөл чимээгүй өөрчлөгдөхгүй.
 */
/**
 * Урамшууллын кодын НЭГ шат.
 *
 * ⚠ `limit` нь ТУХАЙН ШАТАД багтах худалдан авагчийн тоо.
 */
export type PromoTier = {
  limit: number;
  discountPercent: number;
  commissionPercent: number;
};

export const promoCodes = pgTable(
  "promo_codes",
  {
    /** ТОМ үсгээр хадгална — оруулахдаа том/жижиг ялгаагүй байх ёстой. */
    code: varchar("code", { length: 24 }).primaryKey(),
    /** Шимтгэл хүртэх хүн. */
    ownerUid: uidCol("owner_uid").notNull(),
    /** Худалдан авагчид үзүүлэх хямдрал (%). */
    discountPercent: integer("discount_percent").notNull(),
    /** Эзэнд ногдох шимтгэл (%). */
    commissionPercent: integer("commission_percent").notNull(),
    /**
     * ШАТАЛСАН ХУВЬ — «эхний 50 хүүхэд 50%, дараагийн 75 нь 25%».
     *
     * ⚠ `limit` нь ТУХАЙН ШАТНЫ хэмжээ (нийлбэр БИШ). Шат бүгд дүүрвэл
     * дээрх ҮНДСЭН хувь хэрэгжинэ — тиймээс шатгүй код урьдын адил
     * ажиллана (`drizzle/0053_promo_tiers.sql`).
     *
     * ⚠ Тоололт нь ТӨЛӨГДСӨН төлбөрийн ӨӨР ӨӨР худалдан авагчаар
     * тооцогддог, хадгалагдсан тоолуур БИШ (`lib/api/promo.ts`).
     */
    tiers: jsonb("tiers").$type<PromoTier[]>(),
    /**
     * Идэвхтэй эсэх.
     *
     * ⚠ Кодыг УСТГАХЫН оронд идэвхгүй болгоно: устгавал түүгээр хийгдсэн
     * төлбөрүүдийн шимтгэлийг хэн авахыг тогтоох боломжгүй болно.
     */
    active: boolean("active").notNull().default(true),
    /** Тайлбар — ямар суваг, хэний код болохыг админд сануулна. */
    note: varchar("note", { length: 200 }).notNull().default(""),
    createdBy: uidCol("created_by"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    // Нэг хүн олон кодтой байж болно (өөр өөр суваг) — эзнээр нь хайна.
    index("promo_codes_owner_idx").on(table.ownerUid),
  ]
);

export type PromoCodeRow = typeof promoCodes.$inferSelect;

/**
 * СУРТАЛЧЛАГЧИД ОЛГОСОН ТӨЛБӨР (гараар бүртгэнэ).
 *
 * ⚠ Үлдэгдлийг ХАДГАЛАХГҮЙ, ҮРГЭЛЖ ТООЦНО: олсон (төлөгдсөн төлбөрүүдийн
 * шимтгэлийн нийлбэр) хасах олгосон. Хадгалсан үлдэгдэл нь хоёр газарт
 * үнэн барихыг шаарддаг ба нэг нь мултарвал (жишээ нь webhook давхар
 * ажиллах) тоо мөнхөд зөрнө.
 */
export const promoPayouts = pgTable(
  "promo_payouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    promoterUid: uidCol("promoter_uid").notNull(),
    /** Олгосон дүн (₮). */
    amountMnt: integer("amount_mnt").notNull(),
    /** Гүйлгээний утга, дансны мэдээлэл гэх мэт. */
    note: varchar("note", { length: 200 }).notNull().default(""),
    /** Хэн бүртгэсэн (админ). */
    createdBy: uidCol("created_by"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("promo_payouts_promoter_idx").on(table.promoterUid, table.createdAt)]
);

export type PromoPayoutRow = typeof promoPayouts.$inferSelect;

// ---------------------------------------------------------------------------
// Тэжээвэр амьтан ба цэцэг
// ---------------------------------------------------------------------------

/**
 * ХЭРЭГЛЭГЧИЙН ТЭЖЭЭВЭР — дэлгүүрээс авсан амьтан/ургамал.
 *
 * ⚠ Төлөв (өлссөн эсэх) нь ЭНД ХАДГАЛАГДАХГҮЙ: зөвхөн `lastCareAt`-аас
 * уншилтын үед тооцно (`lib/tactiq/pets.ts`). Ингэснээр цаг тоолох cron
 * шаардлагагүй бөгөөд хэрэглэгч апп нээгээгүй байхад ч тэжээвэр нь зөв
 * "өлсдөг".
 *
 * ⚠ Устгах үйлдэл БАЙХГҮЙ: асаргаагүй тэжээвэр үхэх/хатахгүй, зөвхөн
 * гунигтай болно. Хүүхдийн эзэмшсэн зүйлийг устгах нь буцаах боломжгүй
 * хохирол бөгөөд сургалтын аппад хэтэрхий хатуу шийтгэл.
 */
export const pets = pgTable(
  "pets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    uid: uidCol("uid").notNull(),
    /** `lib/tactiq/pets.ts`-ийн `PET_SPECIES` id. */
    species: varchar("species", { length: 24 }).notNull(),
    /** Хэрэглэгчийн өгсөн нэр (заавал биш). */
    name: varchar("name", { length: 40 }).notNull().default(""),
    /** Сүүлд хооллосон / усалсан мөч. `null` = хараахан асраагүй. */
    lastCareAt: timestamp("last_care_at"),
    /** Тасралтгүй асарсан ӨДРИЙН тоо. */
    careStreak: integer("care_streak").notNull().default(0),
    /** Хамгийн урт дараалал — тасарсан ч амжилт нь үлдэнэ. */
    bestStreak: integer("best_streak").notNull().default(0),
    /** Нийт хэдэн удаа асарсан. */
    totalCare: integer("total_care").notNull().default(0),
    /**
     * АВСАН шагналын өдрүүд (`CARE_MILESTONES.days`).
     *
     * ⚠ Дараалал тасарсан ч ЭНЭ ЖАГСААЛТЫГ ЦЭВЭРЛЭХГҮЙ: аль хэдийн авсан
     * шагналыг дахин авах боломжгүй байх ёстой, эс бөгөөс хүүхэд 7 хоног
     * асраад зориуд тасалж, дахин 7 хоногоор давтан шагнал цуглуулна.
     */
    claimedMilestones: jsonb("claimed_milestones").$type<number[]>().notNull().default([]),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("pets_uid_idx").on(table.uid, table.createdAt)]
);

export type PetRow = typeof pets.$inferSelect;

// ---------------------------------------------------------------------------
// Төхөөрөмж
// ---------------------------------------------------------------------------

/**
 * Хэрэглэгчийн нэвтэрсэн төхөөрөмж. `deviceId` нь клиент талд (localStorage)
 * үүсгэгдэж, дараа нь тогтмол хадгалагддаг санамсаргүй тэмдэглэгээ — ижил
 * хөтөч/төхөөрөмж дээр ХЭЗЭЭ Ч солигдохгүй тул "шинэ төхөөрөмж" гэдгийг
 * зөв ялгана. Хэрэглэгч бүрт ХАМГИЙН ИХ 3 идэвхтэй төхөөрөмж зөвшөөрнө
 * (`src/lib/api/devices.ts`-ийн `MAX_DEVICES`).
 */
export const devices = pgTable(
  "devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    uid: uidCol("uid").notNull(),
    deviceId: varchar("device_id", { length: 64 }).notNull(),
    /** User-Agent-аас гаргаж авсан ойлгомжтой тодорхойлолт — "Chrome, Windows" */
    label: varchar("label", { length: 200 }).notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("devices_uid_device_uq").on(table.uid, table.deviceId),
    index("devices_uid_idx").on(table.uid, table.lastSeenAt),
  ]
);

// ---------------------------------------------------------------------------
// Хичээлийн агуулга (курс → нэгж → хичээл → дасгал)
// ---------------------------------------------------------------------------

/**
 * Курс. Урьд нь `lib/tactiq/courses.ts` дотор статик TypeScript өгөгдөл
 * байсныг ЭНД шилжүүлэв — админ `/admin/courses`-с шинэ курс/хичээл нэмж,
 * засаж чадахын тулд (шинэ агуулга нэмэхэд build/deploy шаардахгүй болно).
 *
 * `slug` нь `varchar(32)` — `lessonProgress.courseSlug`-тай (доор) яг ижил
 * урттай, хуучин статик өгөгдлийн slug-уудтай (`chess`, `checkers`) тохирно.
 */
/**
 * АНГЛИ ХУВИЛБАР (`*En` баганууд) — агуулгын хоёр хэл.
 *
 * ⚠ Яагаад тусдаа БАГАНА, тусдаа ХҮСНЭГТ (`course_translations`) БИШ:
 * платформ хоёр хэлтэй (mn/en), гуравдагч хэл төлөвлөөгүй. Хоёр хэлийг
 * багана болгосноор нэг `SELECT` хоёуланг нь авчирна — нэмэлт join,
 * нэмэлт хүсэлт, "орчуулга алга" гэсэн хагас мөр гэж үгүй.
 *
 * ⚠ ХООСОН = ОРЧУУЛГАГҮЙ. Тэр үед англи горимд МОНГОЛ бичвэр харагдана
 * (`lib/i18n/content.ts`-ийн `localized`) — хоосон гарчиг үзүүлэхээс дээр.
 * Тиймээс `notNull().default("")`: багш орчуулгыг хожим нэмж болно.
 */
export const courses = pgTable("courses", {
  slug: varchar("slug", { length: 32 }).primaryKey(),
  title: varchar("title", { length: 120 }).notNull(),
  /** Англи гарчиг — хоосон бол монгол нь харагдана (дээрх тайлбар). */
  titleEn: varchar("title_en", { length: 120 }).notNull().default(""),
  description: varchar("description", { length: 500 }).notNull().default(""),
  descriptionEn: varchar("description_en", { length: 500 }).notNull().default(""),
  /** `components/tactiq/Icon.tsx`-ийн `IconName` */
  icon: varchar("icon", { length: 32 }).notNull().default("book"),
  /** `lib/tactiq/theme.ts`-ийн `ColorKey` */
  color: varchar("color", { length: 16 }).notNull().default("violet"),
  /** "coming-soon" курс сонгогдохгүй, зөвхөн жагсаалтад "Тун удахгүй" гэж харагдана */
  status: varchar("status", { length: 16 }).notNull().default("coming-soon"),
  /**
   * Аль сургуульд харьяалагдах вэ — `lib/tactiq/schools.ts`-ийн `slug`
   * ("mind" | "kids-4-6" | "kids-7-10" | "codely" | "create" | "life").
   *
   * ⚠ Гадаад түлхүүр БИШ, зориуд. Сургуулиудын ЖАГСААЛТ нь кодод бичигдсэн
   * тогтмол зургаа — хүснэгт болгож админд нэмүүлэх/устгуулах ёсгүй,
   * брэндийн бүтэц нь агуулгын редакцийн шийдвэрээр өөрчлөгдөх зүйл биш.
   * (Сургуулийн ТЕКСТ нь харин засагдана — `school_texts` хүснэгт.)
   *
   * ⚠ Танихгүй slug нь АЛДАА БИШ: сургуулийг кодоос хассан үед (жишээ нь
   * хуучин "itkids", "future") тэр курс нь `/courses` дэлгэцийн «Бусад»
   * бүлэгт, XP нь «Бусад» лигт унана — юу ч алга болохгүй.
   *
   * Хоосон мөр = сургуульд хамааруулаагүй. `/courses` дэлгэц түүнийг "Бусад"
   * бүлэгт харуулна — алга болгохгүй.
   *
   * ⚠ ҮНДСЭН сургууль — `schools`-ийн ЭХНИЙ утга. Гэрчилгээ, ур чадвар
   * зэрэг НЭГ сургууль шаарддаг газар үүнийг уншина. Хадгалах үед
   * `schools[0]`-ээр үргэлж шинэчлэгдэнэ (`api/admin/courses`).
   */
  school: varchar("school", { length: 16 }).notNull().default(""),
  /**
   * Курс харьяалагдах БҮХ сургууль — нэг курс хэд хэдэн сургуульд байж болно
   * (жишээ нь Даам: Mind ба Life).
   *
   * Курс эдгээр сургууль бүрийн `/courses` бүлэгт харагдаж, XP нь тэдгээрийн
   * ЛИГ БҮРТ тоологдоно (`lib/api/league.ts`).
   *
   * ⚠ ХООСОН бол `school`-оор орлуулна (`courseSchools`): seed script-ууд
   * зөвхөн `school` бичдэг тул шинэ курс сургуульгүй болчихгүй.
   */
  schools: varchar("schools", { length: 16 })
    .array()
    .notNull()
    .default(sql`'{}'::varchar[]`),
  /** Жагсаалтад харуулах дараалал — багасах тусам эрт. */
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Курс доторх нэгж (жишээ нь "Эхлэл") — хичээлүүдийг бүлэглэнэ. */
export const units = pgTable(
  "units",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseSlug: varchar("course_slug", { length: 32 })
      .notNull()
      .references(() => courses.slug, { onDelete: "cascade" }),
    title: varchar("title", { length: 120 }).notNull(),
    titleEn: varchar("title_en", { length: 120 }).notNull().default(""),
    color: varchar("color", { length: 16 }).notNull().default("violet"),
    sortOrder: integer("sort_order").notNull().default(0),
    /**
     * Хэн нэмсэн (`users.uid`). `null` = ХУУЧИН мөр эсвэл админ үүсгэсэн.
     *
     * ⚠ ЭРХИЙН ШАЛГАЛТЫН ҮНДЭС. Багш өөрийн оруулсан агуулгыг л засаж,
     * устгаж чадна (`lib/api/contentAccess.ts`); админ бүгдийг. `null`
     * утга нь "эзэнгүй" гэсэн үг тул ЗӨВХӨН админ хөндөнө — эс бөгөөс
     * анхны агуулгыг хэн ч засах эрсдэлтэй.
     *
     * ⚠ Гадаад түлхүүр ТАВИАГҮЙ, зориуд: багшийн данс устсан ч түүний
     * оруулсан хичээл АГУУЛГА хэвээр үлдэх ёстой (сурагчдын ахиц түүн
     * дээр тогтдог). Устсан uid нь "эзэнгүй" гэж уншигдана.
     */
    createdBy: uidCol("created_by"),
  },
  (table) => [index("units_course_idx").on(table.courseSlug, table.sortOrder)]
);

/**
 * Хичээл. `id` нь `varchar(64)` — `lessonProgress.lessonId`-тай яг ижил
 * урттай тул хэрэглэгчийн явцын мөрүүд шинэ схемтэй шууд нийцтэй хэвээр.
 */
export const lessons = pgTable(
  "lessons",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull(),
    titleEn: varchar("title_en", { length: 160 }).notNull().default(""),
    /** Дуусгахад олгох оноо — `lessonProgress.xpEarned`-д хуулбарлагдана. */
    /**
     * Хичээл дуусгахад олгох оноо.
     *
     * ⚠ Бүх онооны хэмжээ ×10 болсон (`0042_xp_x10.sql`): шагнал, түвшний
     * босго (`lib/tactiq/xp.ts`), амжилтын шат, найзын зорилт бүгд зэрэг
     * өссөн тул тэнцвэр хэвээр. Шинэ хичээлд 10 биш 100 өгнө.
     */
    xpReward: integer("xp_reward").notNull().default(100),
    sortOrder: integer("sort_order").notNull().default(0),
    /**
     * Хэн нэмсэн (`users.uid`). `null` = ХУУЧИН мөр эсвэл админ үүсгэсэн.
     *
     * ⚠ ЭРХИЙН ШАЛГАЛТЫН ҮНДЭС. Багш өөрийн оруулсан агуулгыг л засаж,
     * устгаж чадна (`lib/api/contentAccess.ts`); админ бүгдийг. `null`
     * утга нь "эзэнгүй" гэсэн үг тул ЗӨВХӨН админ хөндөнө — эс бөгөөс
     * анхны агуулгыг хэн ч засах эрсдэлтэй.
     *
     * ⚠ Гадаад түлхүүр ТАВИАГҮЙ, зориуд: багшийн данс устсан ч түүний
     * оруулсан хичээл АГУУЛГА хэвээр үлдэх ёстой (сурагчдын ахиц түүн
     * дээр тогтдог). Устсан uid нь "эзэнгүй" гэж уншигдана.
     */
    createdBy: uidCol("created_by"),
  },
  (table) => [index("lessons_unit_idx").on(table.unitId, table.sortOrder)]
);

/**
 * Хичээл доторх дасгал. ГУРВАН ТӨРӨЛ (`type`) байна:
 *   • "choice" — олон сонголттой асуулт (`options`/`correctOptionId`)
 *   • "board-move" — хэрэглэгч ЖИНХЭНЭ шатрын хөлөг дээр зөв нүүдлийг
 *     гараараа хийнэ (`fen`-ээс эхэлж, `correctFrom`→`correctTo` нь
 *     ганцхан "зөв" нүүдэл — олон зөв хувилбартай тактик дасгал одоохондоо
 *     дэмжигдэхгүй, зорилготойгоор энгийн байлгав).
 *   • "draughts-move" — "board-move"-той ИЖИЛ санаа, гэхдээ дамын (100
 *     нүдэн шашки) хөлөгт. `fen` баганад дамын байрлал хадгалагдана —
 *     шатрын FEN БИШ, харин `lib/draughts/notation.ts`-ийн PDN-төстэй мөр
 *     (админ гараар бичдэггүй, хөлөг дээр тохируулаад автоматаар бичигдэнэ).
 *     `correctFrom`/`correctTo` нь Олон улсын дамын 1-50 нүдний дугаар.
 *
 * Гурван төрлийн талбарууд ХАМТДАА nullable — зөвхөн тухайн төрөлд
 * хэрэгтэй нь бөглөгдөнэ, DB түвшинд албадан шалгадаггүй (API route дээр
 * шалгагдана, `lib/api/courseAdmin.ts`).
 */
export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lessonId: varchar("lesson_id", { length: 64 })
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 16 }).notNull().default("choice"),
    prompt: varchar("prompt", { length: 500 }).notNull(),
    promptEn: varchar("prompt_en", { length: 500 }).notNull().default(""),
    /** "choice": `{ id: string; label: string }[]` — сонголтууд, дарааллаараа харагдана. */
    options: jsonb("options").$type<{ id: string; label: string }[]>(),
    /**
     * "choice"-ийн англи сонголтууд. `id` нь монгол хувилбартай ЯГ ИЖИЛ
     * байх ёстой — зөв хариулт (`correctOptionId`) нь `id`-аар шалгагддаг
     * тул англи жагсаалтад өөр `id` байвал англи хэл дээр зөв хариулт
     * хэзээ ч таарахгүй болно.
     */
    optionsEn: jsonb("options_en").$type<{ id: string; label: string }[]>(),
    correctOptionId: varchar("correct_option_id", { length: 8 }),
    /** "board-move"/"draughts-move": эхлэх байрлал — шатрын FEN эсвэл дамын PDN-төстэй мөр. */
    fen: varchar("fen", { length: 200 }),
    /** "board-move": шатрын алгебрын нүд ("e2"). "draughts-move": дамын 1-50 дугаар ("31"). */
    correctFrom: varchar("correct_from", { length: 4 }),
    correctTo: varchar("correct_to", { length: 4 }),
    /** "board-move": пешка хувиргах дүрс (ихэвчлэн хоосон, эсвэл "q") — `lib/chess/utils.ts`-ийн `resolveMove`-той ижил хялбарчлал. */
    correctPromotion: varchar("correct_promotion", { length: 4 }),
    /**
     * "piano-play": тоглох ёстой ая — хоосон зайгаар тусгаарласан нотууд
     * ("C4 D4 E4 C4"). Задлах, шалгах логик нь `lib/music/notes.ts`-д.
     *
     * ⚠ Тусдаа багана болгосон шалтгаан: `fen` нь ХӨЛӨГТ ТОГЛООМЫН
     * байрлалыг хадгалдаг (шатрын FEN, дамын PDN). Аяыг тэнд хийвэл нэг
     * багана гурван огт өөр утга агуулж, аль төрлийнх болохыг `type`-аас
     * таамаглах шаардлагатай болно — админы шалгалт төөрөгдөх эрсдэлтэй.
     */
    /**
     * "chess-puzzle": өрөг бодлогын ШИЙДЛИЙН ШУГАМ — UCI нүүдлүүд зайгаар
     * ("d1h5 e8e7 h5e5"). Сондгой тоотой: сурагчийн нүүдлээр эхэлж, дуусна.
     * Эхлэх байрлалыг `fen` баганаас авна (`board-move`-тэй ижил).
     *
     * ⚠ `correctFrom`/`correctTo`-д БИЧИХГҮЙ: тэдгээр нь ГАНЦ нүүдэл
     * хадгалдаг ба бодлогын шугамыг тэнд шахах гэвэл эхний нүүдэл хоёр
     * тусдаа газар давхардаж, засварлахад зөрөх эрсдэлтэй.
     */
    solution: varchar("solution", { length: 300 }),
    /**
     * "net-puzzle": сүлжээний оньсогын ШИЙДСЭН байрлал —
     * "багана x мөр : серверийн индекс : тайлууд(hex)" ("5x5:12:3a05…").
     * Задлах, шалгах логик нь `lib/net/puzzle.ts`-д.
     *
     * ⚠ Сурагчид ЭНЭ байрлал харагдахгүй — клиент тал үүнийг дасгалын
     * ID-гаар үрлэсэн санамсаргүй тоогоор ХОЛЬЖ өгнө. Хадгалагдаж байгаа нь
     * зөвхөн бүтэц (аль нүд аль хөрштэй холбогдох) бөгөөд ялалтыг
     * холболтоор шалгадаг тул шийдэл нь энэ мөртэй ЯГ таарах шаардлагагүй.
     */
    grid: varchar("grid", { length: 300 }),
    melody: varchar("melody", { length: 200 }),
    /**
     * "piano-play"/"rhythm-tap": темп (минутад ногдох цохилт).
     *
     * ⚠ Хэмнэлийн дасгалыг ҮНЭЛЭХ шалгуур нь ЭНЭ утгаас шууд хамаарна —
     * сурагчийн тогшилтын хоорондох зайг 60/BPM секундтэй харьцуулдаг.
     * Хоосон бол `TEMPO_DEFAULT` (90).
     */
    tempoBpm: integer("tempo_bpm"),
    /**
     * "rhythm-tap": хэмжээ ("2/4", "3/4", "4/4") — тоолуурын урт ба тактын
     * эхний цохилтын өргөлтийг шийднэ.
     */
    meter: varchar("meter", { length: 8 }),
    /** Буруу хариулсны дараа харагдах тайлбар (заавал биш). */
    explanation: varchar("explanation", { length: 500 }).notNull().default(""),
    explanationEn: varchar("explanation_en", { length: 500 }).notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    /**
     * Хэн нэмсэн (`users.uid`). `null` = ХУУЧИН мөр эсвэл админ үүсгэсэн.
     *
     * ⚠ ЭРХИЙН ШАЛГАЛТЫН ҮНДЭС. Багш өөрийн оруулсан агуулгыг л засаж,
     * устгаж чадна (`lib/api/contentAccess.ts`); админ бүгдийг. `null`
     * утга нь "эзэнгүй" гэсэн үг тул ЗӨВХӨН админ хөндөнө — эс бөгөөс
     * анхны агуулгыг хэн ч засах эрсдэлтэй.
     *
     * ⚠ Гадаад түлхүүр ТАВИАГҮЙ, зориуд: багшийн данс устсан ч түүний
     * оруулсан хичээл АГУУЛГА хэвээр үлдэх ёстой (сурагчдын ахиц түүн
     * дээр тогтдог). Устсан uid нь "эзэнгүй" гэж уншигдана.
     */
    createdBy: uidCol("created_by"),
  },
  (table) => [index("exercises_lesson_idx").on(table.lessonId, table.sortOrder)]
);

// ---------------------------------------------------------------------------
// Хичээлийн явц
// ---------------------------------------------------------------------------

/**
 * Хэрэглэгчийн дуусгасан хичээл бүр. Хичээлийн АГУУЛГА (дээрх `courses`/
 * `units`/`lessons`/`exercises`) ба энэ явцын хүснэгт ХООРОНДОО гадаад
 * түлхүүргүй (`courseSlug`/`lessonId` зөвхөн ТҮЛХҮҮРЭЭР холбогдоно) —
 * админ хичээл устгасан ч хэрэглэгчийн түүхэн явц (хэдэн оноо хэзээ
 * авсан) хэвээр үлдэх ёстой тул зориудаар CASCADE хийхгүй.
 */
export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    uid: uidCol("uid").notNull(),
    /** `lib/tactiq/courses.ts`-ийн `Course.slug` */
    courseSlug: varchar("course_slug", { length: 32 }).notNull(),
    /** `lib/tactiq/courses.ts`-ийн `Lesson.id` — бүх курст даяар өвөрмөц */
    lessonId: varchar("lesson_id", { length: 64 }).notNull(),
    /** Дуусгахад олгосон оноо — `Lesson.xpReward`-ийн тухайн үеийн хуулбар */
    xpEarned: integer("xp_earned").notNull().default(0),
    completedAt: timestamp("completed_at").notNull().defaultNow(),
    /**
     * ХИЧЭЭЛИЙГ ДАХИН ҮЗСЭН ТОО (анхныхыг оролцуулахгүй).
     *
     * ⚠ ЗӨВХӨН СТАТИСТИК: шагнал үүнээс ХАМААРАХГҮЙ — давталтын
     * оноо нь өдрөөр хязгаарлагдана (доорх).
     */
    repeatCount: integer("repeat_count").notNull().default(0),
    /**
     * ДАВТАЛТЫН ОНОО СҮҮЛД ОЛГОСОН ӨДӨР (`YYYY-MM-DD`, `lib/tactiq/day.ts`).
     *
     * ⚠ ЭНЭ БАГАНА НЬ «ТАРИАЛАН»-ЫГ ЗОГСООНО: хичээл тус бүрд
     * өдөрт ГАНЦ удаа давталтын оноо олгоно. Эс бөгөөс хамгийн амархан
     * хичээлээ дахин дахин дарах нь лигийн тэргүүнд гарах хамгийн хялбар
     * зам болно — суралцахгүйгээр оноо цуглуулна.
     */
    lastRepeatDay: varchar("last_repeat_day", { length: 10 }),
  },
  (table) => [
    // Нэг хэрэглэгч нэг хичээлийг ЗӨВХӨН НЭГ удаа дуусгасанд тооцогдоно —
    // давхар оноо олгохоос сэргийлнэ (`/api/learn/lessons/[lessonId]/complete`).
    uniqueIndex("lesson_progress_uid_lesson_uq").on(table.uid, table.lessonId),
    index("lesson_progress_uid_course_idx").on(table.uid, table.courseSlug),
  ]
);

/**
 * СУРАЛЦАХ ЗАМ ДАХЬ БЭЛГИЙН ХАЙРЦАГ («бэлэг хэсэг»).
 *
 * Зам дээр хэдэн хичээлийн дараа нэг хайрцаг байна (`CHEST_EVERY`). Өмнөх
 * хичээлүүдийг дуусгасан сурагч түүнийг НЭГ УДАА онгойлгож эрдэнэ авна.
 *
 * ⚠ ЯАГААД ХҮСНЭГТ ХЭРЭГТЭЙ ВЭ: «аль хайрцаг онгойлгогдсон» гэдгийг
 * хичээлийн явцаас ТООЦОЖ ОЛОХ БОЛОМЖГҮЙ — хичээлээ дуусгасан нь хайрцгаа
 * авсан гэсэн үг биш. Клиент талд (localStorage) санавал хэрэглэгч
 * төхөөрөмж солиход, эсвэл санах хэсгээ цэвэрлэхэд эрдэнийг ДАХИН ДАХИН
 * авах болно.
 *
 * ⚠ UNIQUE нь давхар нэхэмжлэлийн ЦОРЫН ГАНЦ хамгаалалт: хоёр товшилт
 * зэрэг ирвэл (давхар дарах, сүлжээ хоёр удаа илгээх) зөвхөн НЭГ нь
 * insert хийж чадна — `lesson_progress_uid_lesson_uq`-тай ижил зарчим.
 */
export const pathChests = pgTable(
  "path_chests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    uid: uidCol("uid").notNull(),
    /** `units.id` — хайрцаг нь СЭДЭВ дотор дугаарлагдана. */
    unitId: uuid("unit_id").notNull(),
    /** Сэдэв дотрох хайрцгийн дугаар (0-ээс). */
    chestIndex: integer("chest_index").notNull(),
    /** Олгосон эрдэнэ — хожим шагналыг өөрчилбөл хуучин мөр түүхэн утгаа хадгална. */
    gems: integer("gems").notNull().default(0),
    claimedAt: timestamp("claimed_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("path_chests_uid_unit_index_uq").on(table.uid, table.unitId, table.chestIndex),
    index("path_chests_uid_idx").on(table.uid),
  ]
);

// ---------------------------------------------------------------------------
// Онлайн шатар (P2P)
// ---------------------------------------------------------------------------

/**
 * Тоглогч хайх дараалал. Санамсаргүй хос үүсгэхэд ашиглана — чадвараар БИШ,
 * зөвхөн хэн хамгийн эрт хүлээж байгаагаар хослуулна (`/api/play/queue/join`).
 * Хэрэглэгч бүрт ЗӨВХӨН НЭГ мөр — дахин "хайх" дарвал `joinedAt` шинэчлэгдэнэ.
 */
export const chessQueue = pgTable("chess_queue", {
  /**
   * ⚠ `uid` нь ЦОРЫН ГАНЦ түлхүүр, (uid, game) БИШ: нэг тоглогч НЭГ л
   * тоглоом хайна. Хоёуланг зэрэг хайж чадвал хоёр өрөөнд зэрэг
   * оногдож, нэг талыг нь хаяхад нөгөө тоглогч хоосон өрөөнд хүлээнэ.
   */
  uid: uidCol("uid").primaryKey(),
  /** "chess" | "draughts" — хос нь ЗӨВХӨН ижил тоглоомын дараалалаас. */
  game: varchar("game", { length: 16 }).notNull().default("chess"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

/**
 * Хоёр тоглогчийн P2P шатрын тоглолт.
 *
 * ⚠ Тоглолтын НҮҮДЭЛ ЭНД ХАДГАЛАГДАХГҮЙ — тэдгээр нь WebRTC DataChannel-аар
 * шууд P2P урсдаг тул серверт ХЭЗЭЭ Ч хүрдэггүй. Энд зөвхөн хос ХЭН БЭ, ямар
 * өнгөтэй, дууссан эсэх — өрөөг олох, эрхийг шалгахад хэрэгтэй хамгийн бага
 * мэдээлэл л байна.
 */
export const chessRooms = pgTable(
  "chess_rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /**
     * "chess" | "draughts" (`lib/tactiq/playGame.ts`).
     *
     * ⚠ ХҮСНЭГТИЙН НЭР нь `chess_*` хэвээр ч агуулга нь ХОЁР тоглоом:
     * урилга, дараалал, сигналын систем хоёуланд нь ижил тул
     * хуулбарлахаас илүү нэг багана нэмэх нь зөв. Нэр солих нь бүх
     * индекс, миграцийг хөндөх бөгөөд үнэ цэнэ нь зөвхөн гоо сайхан.
     */
    game: varchar("game", { length: 16 }).notNull().default("chess"),
    /** Урьд нь дараалалд хүлээж байсан тал */
    whiteUid: uidCol("white_uid").notNull(),
    /** `join` дуудлагаараа хосыг үүсгэсэн тал */
    blackUid: uidCol("black_uid").notNull(),
    /** "active" | "finished" */
    status: varchar("status", { length: 16 }).notNull().default("active"),
    winnerUid: uidCol("winner_uid"),
    /** "checkmate" | "resignation" | "draw" | "disconnect" */
    endReason: varchar("end_reason", { length: 16 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("chess_rooms_white_uid_idx").on(table.whiteUid),
    index("chess_rooms_black_uid_idx").on(table.blackUid),
  ]
);

/**
 * Найзын урилга — "холбоос илгээж, зөвхөн тэр хүнтэй тоглох" зам.
 *
 * ⚠ `chessQueue`-ээс ТУСДАА: дараалал нь САНАМСАРГҮЙ хос үүсгэдэг тул урилга
 * хүлээж буй хүнийг тэнд байрлуулбал огт танихгүй хүнтэй холбогдож,
 * найз нь ирэхэд өрөө нь аль хэдийн дүүрсэн байна.
 *
 * `roomId` нь урилга ХҮЛЭЭН АВАГДМАГЦ бөглөгдөнө — урьсан тал үүнийг
 * ажиглаж (polling) өрөө рүү шилжинэ. Мөр нь дараа нь ч үлддэг тул нэг
 * холбоос ХОЁР ДАХЬ удаагаа ажиллахгүй (кодыг дамжуулсан гурав дахь хүн
 * тоглолтод оролцох боломжгүй).
 */
export const chessInvites = pgTable(
  "chess_invites",
  {
    /** Холбоост харагдах богино код — `/play/invite/<code>` */
    code: varchar("code", { length: 12 }).primaryKey(),
    /** "chess" | "draughts" — холбоос аль хуудас руу хөтлөхийг шийднэ. */
    game: varchar("game", { length: 16 }).notNull().default("chess"),
    hostUid: uidCol("host_uid").notNull(),
    /** Хүлээн авагч — зөвхөн хүлээж авсны дараа */
    guestUid: uidCol("guest_uid"),
    /** Үүссэн өрөө — `null` бол урилга ХҮЛЭЭГДЭЖ байна */
    roomId: uuid("room_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    /** Энэ хугацаанаас хойш холбоос идэвхгүй — хэн нэгэн хожим дарахад тоглогч нь аль хэдийн явсан байдаг. */
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => [index("chess_invites_host_idx").on(table.hostUid)]
);

/**
 * WebRTC холболт байгуулах ХОЁРЫН ХООРОНДЫН SDP/ICE мессежийн дараалал.
 *
 * ⚠ ЗӨВХӨН холболт ҮҮСГЭХ мөчид хэрэглэгдэнэ — `RTCDataChannel` нээгдмэгц
 * клиент энэ хүснэгтийг polling хийхээ болино (`lib/chess/webrtc.ts`). Тоглоом
 * бүрд хэдхэн мөр л бичигдэнэ, урт хугацаанд хуримтлагдахгүй.
 */
export const chessSignals = pgTable(
  "chess_signals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** `chessRooms.id` — албан ёсны гадаад түлхүүргүй, энэ схемийн бусад хэсгийн адил */
    roomId: uuid("room_id").notNull(),
    fromUid: uidCol("from_uid").notNull(),
    /** "offer" | "answer" | "ice" */
    type: varchar("type", { length: 16 }).notNull(),
    /** JSON.stringify хийсэн SDP эсвэл ICE candidate — payload нь opaque тул text хангалттай */
    payload: text("payload").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("chess_signals_room_created_idx").on(table.roomId, table.createdAt)]
);

// ---------------------------------------------------------------------------
// Систем
// ---------------------------------------------------------------------------

/**
 * Нэг мөртэй тохиргоо. `hasAdmin` нь "системд эзэн бий эсэх" — анхны
 * бүртгүүлэгчийг супер админ болгох шийдвэрийг ЗӨВХӨН нэг удаа гаргана.
 */
export const appConfig = pgTable("app_config", {
  id: varchar("id", { length: 16 }).primaryKey().default("app"),
  hasAdmin: boolean("has_admin").notNull().default(false),
  /** Платформын нэр — админ талаас солино */
  siteName: varchar("site_name", { length: 120 }).notNull().default("Tactiq"),
  /** Шинэ хэрэглэгчийн анхдагч өдрийн зорилт */
  defaultDailyGoal: integer("default_daily_goal").notNull().default(3),
  /** Зүрх бүрэн сэргэх хугацаа (минут) */
  heartRefillMinutes: integer("heart_refill_minutes").notNull().default(30),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Сургуулийн текстийн засвар (админ)
// ---------------------------------------------------------------------------

/**
 * Сургуулийн ТЕКСТИЙГ админ талаас засах — нэр, тайлбар, сэдвүүд.
 *
 * ⚠ Энэ нь сургуулийн ЖАГСААЛТ БИШ. Зургаан сургуулийн бүрэлдэхүүн
 * (`slug`, дүрс, өнгө, дараалал) `lib/tactiq/schools.ts`-д кодод хэвээр —
 * тэр нь ХОЁР шалтгаантай:
 *
 *   • Tailwind нь эх кодыг ТЕКСТЭЭР сканнердана. Градиент классыг DB-ээс
 *     уншвал (`from-indigo-500`) CSS-д огт үүсэхгүй, өнгө нь алга болно.
 *   • Дүрс нь Lucide-ийн React КОМПОНЕНТ — өгөгдлийн сангаар дамжуулж
 *     болохгүй.
 *
 * Тиймээс энэ хүснэгт нь ЗӨВХӨН дарж бичих (override) давхарга: мөр
 * байхгүй, эсвэл багана `null` бол кодын анхдагч утга хэрэглэгдэнэ.
 * Ингэснээр админ хэдий зөрүүтэй утга оруулсан ч сургууль өөрөө нүүр
 * хуудаснаас хэзээ ч алга болохгүй.
 */
export const schoolTexts = pgTable("school_texts", {
  /** `lib/tactiq/schools.ts`-ийн `slug` — кодод байхгүй slug-ийг уншихдаа алгасна. */
  slug: varchar("slug", { length: 16 }).primaryKey(),
  /** Бүгд NULLABLE: `null` = «кодын анхдагчийг хэрэглэ». */
  title: varchar("title", { length: 40 }),
  subtitle: varchar("subtitle", { length: 80 }),
  tagline: varchar("tagline", { length: 200 }),
  description: text("description"),
  /** `TopicGroup[]` — `null` бол кодын бүлгүүд хэвээр. */
  groups: jsonb("groups").$type<{ title: string | null; topics: string[] }[]>(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Мөрийн төрлүүд — route болон компонентууд эндээс лавлана
// ---------------------------------------------------------------------------

export type UserRow = typeof users.$inferSelect;
export type DeviceRow = typeof devices.$inferSelect;
export type AppConfigRow = typeof appConfig.$inferSelect;
export type SchoolTextRow = typeof schoolTexts.$inferSelect;
export type LessonProgressRow = typeof lessonProgress.$inferSelect;
export type PathChestRow = typeof pathChests.$inferSelect;
export type ChessQueueRow = typeof chessQueue.$inferSelect;
export type ChessRoomRow = typeof chessRooms.$inferSelect;
export type ChessInviteRow = typeof chessInvites.$inferSelect;
export type ChessSignalRow = typeof chessSignals.$inferSelect;

/**
 * PUSH ТОКЕН — төхөөрөмж тус бүрийн FCM токен.
 *
 * ⚠ `uid` нь ТҮЛХҮҮР БИШ: нэг хүн утас, ком, таблет гэсэн олон
 * төхөөрөмжтэй байж болно. Бүгдэд нь мэдэгдэл хүрэх ёстой — сурагч
 * тэмцээнээ утсандаа мэдээд ком дээрээ тоглоно.
 *
 * ⚠ `token` нь ДАВХАРДАХГҮЙ (unique): ижил токен хоёр хэрэглэгчид
 * оногдвол хуучин хэрэглэгч нөгөөгийнх мэдэгдлийг авна. FCM токен нь
 * хэрэглэгч гарч, өөр хүн нэвтрэхэд ДАХИН хэрэглэгддэг тул энэ нь
 * онолын эрсдэл биш.
 */
export const pushTokens = pgTable(
  "push_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    uid: uidCol("uid").notNull(),
    /** ⚠ `text`: FCM токен 150+ тэмдэгт, Google дээд хязгаар амлаагүй. */
    token: text("token").notNull(),
    /** Аль төхөөрөмж вэ — «ком дээрх мэдэгдлийг унтраа» гэж хэлэхэд. */
    label: varchar("label", { length: 64 }).notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    /**
     * Хамгийн сүүлд харагдсан мөч.
     *
     * ⚠ Хуучирсан токеныг цэвэрлэхэд: FCM нь устсан төхөөрөмжийн токенд
     * `messaging/registration-token-not-registered` гэж хариулдаг бөгөөд
     * тэр үед мөрийг устгана. Гэхдээ огт хэрэглэгдээгүй токен ч хурааж
     * хэвтэхээс сэргийлж цагийг бичнэ.
     */
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("push_tokens_token_uq").on(table.token),
    index("push_tokens_uid_idx").on(table.uid),
  ]
);

/**
 * ЧАНСАА (rating) — ТОГЛООМ ТУС БҮРД.
 *
 * Зохиомж: `docs/rating-system.md`.
 *
 * ⚠ `users.rating` -аас ЯЛГААТАЙ: тэр нь НЭГ багана бөгөөд шатар,
 * даамын тоглолтын ХОЛЬЦООС бүрддэг. Шатарт хүчтэй хүн даамд шинэхэн
 * байж мэднэ — тэр үед нэг тоо нь аль алинд зөв биш. `users.rating` нь
 * кодыг шилжүүлэх хугацаанд үлдэж, дараа нь хасагдана.
 *
 * ⚠ `provisional` БАГАНА БАЙХГҮЙ: `gamesPlayed < 10` гэдгээс гарна
 * (`isProvisional`). Хоёр эх сурвалж байвал тэд зөрөх бөгөөд аль нь
 * зөв гэдгийг хэн ч мэдэхгүй болно.
 */
export const playerRatings = pgTable(
  "player_ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uidCol("user_id").notNull(),
    /** "chess" | "checkers" */
    gameType: varchar("game_type", { length: 16 }).notNull(),
    /**
     * ОДОО зөвхөн `"all"`.
     *
     * ⚠ ХУРДААР САЛГААГҮЙ: 2 тоглоом × 4 хурд = 8 rating болговол сурагч
     * бүр 8 хэсэгт хуваагдаж, тус бүр нь ҮҮРД provisional байна
     * (`docs/rating-system.md` §0.4).
     */
    ratingType: varchar("rating_type", { length: 16 }).notNull().default("all"),

    rating: integer("rating").notNull().default(1500),
    peakRating: integer("peak_rating").notNull().default(1500),
    gamesPlayed: integer("games_played").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    draws: integer("draws").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    /** Хууль бус байдал шалгах хугацаанд бичилт зогсоно. */
    frozen: boolean("frozen").notNull().default(false),
    lastGameAt: timestamp("last_game_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("player_ratings_uq").on(table.userId, table.gameType, table.ratingType),
    index("player_ratings_user_idx").on(table.userId),
  ]
);

/**
 * ЧАНСААНЫ ТҮҮХ — тоглолт тус бүрийн бичилт.
 *
 * ⚠ `expectedScore`, `kFactor`, `weight` -ийг ХАДГАЛНА: «яагаад би 12
 * оноо авав?» гэсэн асуултад тооцоог ДАХИН хийхгүйгээр хариулах ёстой.
 * K-ийн дүрэм хожим өөрчлөгдвөл хуучин бичилт нь тухайн үеийн дүрмээр
 * тайлбарлагдсан хэвээр байна.
 *
 * ⚠ `(game_id, user_id)` дээр UNIQUE индекс: тоглолт хоёр удаа мэдэгдэж
 * болно (хоёр тал зэрэг илгээх, сүлжээ тасарч дахин оролдох). Индекс
 * байхгүй бол rating ХОЁР ДАХИН хөдөлнө.
 */
export const ratingHistory = pgTable(
  "rating_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uidCol("user_id").notNull(),
    gameType: varchar("game_type", { length: 16 }).notNull(),
    ratingType: varchar("rating_type", { length: 16 }).notNull().default("all"),

    /** Өрөөний id, эсвэл тэмцээний тоглолтын id. */
    gameId: varchar("game_id", { length: 64 }),
    tournamentId: varchar("tournament_id", { length: 64 }),

    opponentUid: uidCol("opponent_uid"),
    opponentRating: integer("opponent_rating"),
    /** 1 | 0.5 | 0 — `numeric` тул Drizzle нь МӨР болгож буцаана. */
    result: numeric("result", { precision: 2, scale: 1 }),
    expectedScore: numeric("expected_score", { precision: 6, scale: 5 }).notNull(),
    kFactor: integer("k_factor").notNull(),
    weight: numeric("weight", { precision: 3, scale: 2 }).notNull().default("1.0"),

    oldRating: integer("old_rating").notNull(),
    ratingChange: integer("rating_change").notNull(),
    newRating: integer("new_rating").notNull(),

    /** "game" | "tournament" | "decay" | "admin" */
    reason: varchar("reason", { length: 16 }).notNull().default("game"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("rating_history_user_created_idx").on(table.userId, table.createdAt),
    index("rating_history_tournament_idx").on(table.tournamentId),
  ]
);

export type PlayerRatingRow = typeof playerRatings.$inferSelect;
export type RatingHistoryRow = typeof ratingHistory.$inferSelect;

/**
 * ДАСГАЛЖУУЛАГЧИЙН (БАГШИЙН) АНКЕТ — `/tournament` хуудасны
 * «Дасгалжуулагч» таб дээр НИЙТЭД харагдана.
 *
 * ⚠ `users`-аас ТУСДАА: холбоо барих мэдээлэл нь зөвхөн багшид
 * хэрэгтэй бөгөөд НИЙТЭД гардаг. Нэвтрэлтийн мөртэй хольбол сурагчийн
 * хувийн өгөгдөл санамсаргүй нээгдэх зам үүснэ
 * (`drizzle/0050_coach_profiles.sql`).
 *
 * ⚠ `visible` анхдагчаар `false`: багш өөрөө зөвшөөрөх хүртэл утасны
 * дугаар нь хаана ч харагдахгүй.
 */
export const coachProfiles = pgTable(
  "coach_profiles",
  {
    /** Эзэн нь uid — нэг хүнд НЭГ анкет. */
    userId: uidCol("user_id").primaryKey(),

    title: varchar("title", { length: 80 }),
    bio: text("bio"),

    phone: varchar("phone", { length: 32 }),
    email: varchar("email", { length: 190 }),
    link: varchar("link", { length: 300 }),
    address: varchar("address", { length: 200 }),

    teachesChess: boolean("teaches_chess").notNull().default(false),
    teachesDraughts: boolean("teaches_draughts").notNull().default(false),
    /** ₮/цаг. `null` = «тохиролцоно». */
    priceMnt: integer("price_mnt"),

    visible: boolean("visible").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("coach_profiles_visible_idx").on(table.visible, table.updatedAt)]
);

export type CoachProfileRow = typeof coachProfiles.$inferSelect;

/**
 * СУРГАЛТЫН ТӨВҮҮД — нийтэд нээлттэй ЛАВЛАХ.
 *
 * ⚠ АДМИН УДИРДАНА, багш өөрөө ҮҮСГЭХГҮЙ. Шалтгаан: энэ жагсаалт
 * нь ХҮҮХЭД болон эцэг эхийг бодит хаяг руу чиглүүлнэ. Хэн дуртай
 * нь «сургалтын төв» гэж бүртгүүлээд хаягаа тавьдаг бол хяналтгүй
 * зар болно. Тиймээс үүсгэх, засах нь `requireAdmin`-ий ард.
 *
 * ⚠ `visible` АНХДАГЧААР `false`: админ мэдээллийг бүрэн бөглөж,
 * шалгасны дараа л нийтэд гаргана. Дутуу бөглөсөн төв жагсаалтад
 * гарах нь харсан хүнд «ажилладаггүй сайт» гэсэн сэтгэгдэл үлдээнэ.
 */
export const trainingCenters = pgTable(
  "training_centers",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    name: varchar("name", { length: 120 }).notNull(),
    /** Товч танилцуулга — юу заадаг, хэнд зориулсан. */
    description: text("description").notNull().default(""),

    /**
     * ЗУРАГ. Гадных URL (Firebase Storage эсвэл төвийн өөрийн сайт).
     *
     * ⚠ ХООСОН БАЙЖ БОЛНО: зураггүй төвийг жагсаалтаас хасах биш,
     * орлогч дүрсээр үзүүлнэ.
     */
    photoUrl: varchar("photo_url", { length: 500 }).notNull().default(""),

    /**
     * ЛОГО — төвийн таних тэмдэг.
     *
     * ⚠ `photoUrl`-ААС ӨӨР ЗОРИЛГОТОЙ: зураг нь байр, анги танхимыг
     * үзүүлдэг ӨРГӨН зураг; лого нь байгууллагын ЖИЖИГ тэмдэг
     * бөгөөд нэрийн хажууд гарна. Нэгтгэвэл хоёулан муу харагдана:
     * лого сунаж, эсвэл гэрэл зураг таних аргагүй болно.
     *
     * ⚠ Firebase Storage-ийн `training_centers/<id>/...` замд байршина
     * (`storage.rules` — бичих эрх зөвхөн админд).
     */
    logoUrl: varchar("logo_url", { length: 500 }).notNull().default(""),

    /** БАЙРШИЛ. `city` нь шүүлтүүрт, `address` нь бүрэн хаяг. */
    city: varchar("city", { length: 60 }).notNull().default(""),
    address: varchar("address", { length: 200 }).notNull().default(""),
    /** Газрын зургийн холбоос — дарахад шууд зам заана. */
    mapUrl: varchar("map_url", { length: 500 }).notNull().default(""),

    phone: varchar("phone", { length: 32 }).notNull().default(""),
    email: varchar("email", { length: 190 }).notNull().default(""),
    link: varchar("link", { length: 300 }).notNull().default(""),

    teachesChess: boolean("teaches_chess").notNull().default(false),
    teachesDraughts: boolean("teaches_draughts").notNull().default(false),

    visible: boolean("visible").notNull().default(false),
    /** Жагсаалтын дараалал — бага тоо дээшээ. */
    sortOrder: integer("sort_order").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("training_centers_visible_idx").on(table.visible, table.sortOrder)]
);

export type TrainingCenterRow = typeof trainingCenters.$inferSelect;


/**
 * АППУУДЫН ХӨӨРГҮҮР — «Апп» цэсэнд харагдах жагсаалт.
 *
 * ⚠ АДМИН БҮРТГЭНЭ, КОДОД ТОГТМОЛ БИШ. Эзний сонголт: шинэ апп
 * нэмэх бүрд код засаж, дахин deploy хийх шаардлагагүй байх.
 *
 * ⚠ `kind` НЬ НЭВТРЭЛТИЙГ ШИЙДНЭ — энэ нь гооё биш, АЮУЛГҮЙ
 * БАЙДЛЫН асуудал:
 *   • `link` — энгийн холбоос. Апп өөрөө нэвтрүүлнэ.
 *   • `tournament` — ТАСАЛБАРТАЙ дамжуулалт
 *     (`/api/tournament/session`). Энэ нь ХОЕР ТАЛЫН НУУЦ ТҮЛХҮҮР
 *     ба тэр апп дээр `exchange` эцсийн цэг байхыг шаардана.
 *     Тиймээс дурын аппд сонгож БОЛОХГҮЙ — одоогоор зөвхөн
 *     даамалын тэмцээний сервер тэр дүрмийг хэрэгжүүлсэн.
 *
 * ⚠ `visible` АНХДАГЧААР false — `training_centers`-тэй ижил шалтгаан:
 * дутуу бөглөсөн апп хүүхдийн нүдэнд тусах ёсгүй.
 */
export const apps = pgTable(
  "apps",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    name: varchar("name", { length: 80 }).notNull(),
    description: varchar("description", { length: 300 }).notNull().default(""),
    /** Лого — хоосон бол өнгөт үсэгтэй орлогч дүрс гарна. */
    logoUrl: varchar("logo_url", { length: 500 }).notNull().default(""),
    /** Аппын хаяг. `kind = "tournament"` үед хэрэглэгдэхгүй. */
    url: varchar("url", { length: 500 }).notNull().default(""),

    /** "link" | "tournament" — дээрх тайлбарыг үзнэ үү. */
    kind: varchar("kind", { length: 16 }).notNull().default("link"),
    /** `lib/tactiq/theme.ts`-ийн `ColorKey`. */
    color: varchar("color", { length: 16 }).notNull().default("violet"),

    visible: boolean("visible").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("apps_visible_idx").on(table.visible, table.sortOrder)]
);

export type AppRow = typeof apps.$inferSelect;
