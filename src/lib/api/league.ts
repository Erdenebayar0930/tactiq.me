import "server-only";

import { and, asc, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  courseLeagues,
  courses,
  leagueCohorts,
  leagueMembers,
  lessonProgress,
  users,
} from "@/lib/db/schema";
import { courseSchools } from "@/lib/db/courses";
import { addDays, daysBetween, startOfWeek, today } from "@/lib/tactiq/day";
import {
  clampTier,
  COHORT_SIZE,
  IDLE_WEEKS_TO_DEMOTE,
  leagueKeyForSchool,
  leagueKeysForSchools,
  leagueOrder,
  leagueTitle,
  nextTier,
  outcomeForRank,
  type LeagueOutcome,
} from "@/lib/tactiq/league";


/**
 * Долоо хоногийн лиг — серверийн тал.
 *
 * ⚠ CRON БАЙХГҮЙ, ДҮГНЭЛТ ЗАЛХУУ. Долоо хоног солигдоход бүх хэрэглэгчийг
 * нэг дор дүгнэх ажил энэ төсөлд ажиллуулах газаргүй (PM2 cluster —
 * нэг cron бүх instance дээр давхар гүйнэ). Оронд нь хэрэглэгч эргэж
 * ирэхэд ӨӨРИЙНХ НЬ өмнөх долоо хоног дүгнэгдэнэ.
 *
 * Энэ нь зөвхөн ЭНЭ ШАЛТГААНААР зөв ажиллана: долоо хоног дуусмагц тухайн
 * бүлгийн XP-үүд ХӨЛДӨНӨ (`league_members` мөр нь долоо хоног тус бүрд
 * тусад нь) — тиймээс хэрэглэгч маргааш ч, гурван сарын дараа ч орж ирсэн
 * ЯГ ИЖИЛ байр, ЯГ ИЖИЛ үр дүн гарна.
 *
 * ⚠ БҮХ ЗҮЙЛ СУРГУУЛЬ ТУС БҮРД (`leagueKey`, `lib/tactiq/league.ts`). Бүлэг,
 * гишүүнчлэл, шат гурвуулаа лигийн түлхүүрээр салгагдана — нэг сурагч
 * Mind-д Алт, Codely-д Хүрэл лигт зэрэг байж болно. Түлхүүр нь хүснэгтүүдийн
 * `course_slug` баганад хадгалагдана.
 */

/** Долоо хоногийн түлхүүр — Даваа гарагийн огноо. */
export const currentWeekKey = (): string => startOfWeek(today());

/** `db` болон гүйлгээний `tx` хоёуланг хүлээж авахын тулд бүтцээр нь. */
type Executor = Pick<typeof db, "select" | "insert" | "update">;

/**
 * Курсын XP орох лигүүд — курсын БҮХ сургууль (`courses.schools`).
 *
 * Курс олдохгүй бол «Бусад» — XP алга болохгүй.
 */
export async function leagueKeysForCourse(courseSlug: string): Promise<string[]> {
  const [row] = await db
    .select({ school: courses.school, schools: courses.schools })
    .from(courses)
    .where(eq(courses.slug, courseSlug))
    .limit(1);
  return leagueKeysForSchools(row ? courseSchools(row) : []);
}

/**
 * Тухайн лиг, шат, долоо хоногийн ДҮҮРЭЭГҮЙ бүлгийг олно, байхгүй бол үүсгэнэ.
 *
 * ⚠ Бүлгийн мөрийг `FOR UPDATE`-ээр түгжинэ: хоёр хэрэглэгч зэрэг нэгдэхэд
 * хоёулаа `memberCount = 29`-ийг хараад хоёулаа нэмэгдвэл бүлэг 31 болно.
 * Түгжээ нь тоолол-шийдвэр-бичилтийг дараалуулна.
 *
 * ⚠ Хязгаараас ХЭТЭРСЭН тохиолдол ч эвдрэхгүй: `memberCount` нь зөвхөн
 * бүлэг СОНГОХОД хэрэглэгддэг тоо, дүгнэлт нь `league_members`-ийн БОДИТ
 * мөрүүдээр явагдана (`outcomeForRank`-д бодит `size` дамжина).
 */
async function findOrCreateCohort(
  tx: Executor,
  leagueKey: string,
  tier: number,
  weekKey: string
): Promise<string> {
  const [open] = await tx
    .select({ id: leagueCohorts.id })
    .from(leagueCohorts)
    .where(
      and(
        eq(leagueCohorts.courseSlug, leagueKey),
        eq(leagueCohorts.tier, tier),
        eq(leagueCohorts.weekKey, weekKey),
        lt(leagueCohorts.memberCount, COHORT_SIZE)
      )
    )
    // Хамгийн дүүрсэн бүлгийг ЭХЛЭЖ дүүргэнэ — эс бөгөөс олон хагас хоосон
    // бүлэг үүсч, өрсөлдөөн сонирхолгүй болно.
    .orderBy(desc(leagueCohorts.memberCount))
    .limit(1)
    .for("update");

  if (open) {
    await tx
      .update(leagueCohorts)
      .set({ memberCount: sql`${leagueCohorts.memberCount} + 1` })
      .where(eq(leagueCohorts.id, open.id));
    return open.id;
  }

  const [created] = await tx
    .insert(leagueCohorts)
    .values({ courseSlug: leagueKey, tier, weekKey, memberCount: 1 })
    .returning({ id: leagueCohorts.id });

  return created.id;
}

/**
 * ӨМНӨХ долоо хоногийн дүгнэгдээгүй мөрүүдийг дүгнэнэ (БҮХ лигийнх).
 *
 * Ихэвчлэн ганц мөр байна, гэхдээ удаан завсарласан хэрэглэгчид олон мөр
 * байж болно — эрт нь эхэлж дүгнэгдэх ёстой (шат нь дараалан хөдөлнө).
 *
 * ⚠ ИДЕМПОТЕНТ: `settled_at IS NULL` нөхцөлт UPDATE-ээр байрыг нэхэмжилнэ.
 * Хэдэн хүсэлт зэрэг ирсэн шат НЭГ Л удаа өөрчлөгдөнө.
 */
export async function settlePastWeeks(
  uid: string
): Promise<{ leagueKey: string; outcome: LeagueOutcome }[]> {
  const weekKey = currentWeekKey();

  const pending = await db
    .select({
      id: leagueMembers.id,
      cohortId: leagueMembers.cohortId,
      leagueKey: leagueMembers.courseSlug,
      tier: leagueMembers.tier,
      xp: leagueMembers.xp,
      createdAt: leagueMembers.createdAt,
    })
    .from(leagueMembers)
    .where(
      and(
        eq(leagueMembers.uid, uid),
        isNull(leagueMembers.settledAt),
        lt(leagueMembers.weekKey, weekKey)
      )
    )
    .orderBy(asc(leagueMembers.weekKey));

  const outcomes: { leagueKey: string; outcome: LeagueOutcome }[] = [];

  for (const row of pending) {
    /*
     * Байрыг тоолол-оор гаргана: "надаас илүү XP-тэй, эсвэл ижил XP-тэй ч
     * ЭРТ нэгдсэн" гишүүдийн тоо + 1.
     *
     * Тэнцсэн үед ЭРТ нэгдсэн нь дээгүүр — санамсаргүй биш: ижил XP дээр
     * `id`-аар эрэмбэлбэл дараалал нь uuid-ийн санамсаргүй утгаас хамаарч
     * дуудалт бүрд ӨӨР гарч болзошгүй.
     */
    const [better] = await db
      .select({ value: sql<number>`count(*)` })
      .from(leagueMembers)
      .where(
        and(
          eq(leagueMembers.cohortId, row.cohortId),
          sql`(${leagueMembers.xp} > ${row.xp} OR (${leagueMembers.xp} = ${row.xp} AND ${leagueMembers.createdAt} < ${row.createdAt}))`
        )
      );

    const [total] = await db
      .select({ value: sql<number>`count(*)` })
      .from(leagueMembers)
      .where(eq(leagueMembers.cohortId, row.cohortId));

    const rank = Number(better?.value ?? 0) + 1;
    const size = Number(total?.value ?? 1);
    const outcome = outcomeForRank(rank, size, row.tier);

    // Байрыг НЭГ УДАА нэхэмжилнэ — өөр хүсэлт түрүүлсэн бол алгасна.
    const claimed = await db
      .update(leagueMembers)
      .set({ rank, outcome, settledAt: new Date() })
      .where(and(eq(leagueMembers.id, row.id), isNull(leagueMembers.settledAt)))
      .returning({ id: leagueMembers.id });

    if (claimed.length === 0) continue;

    /*
     * Шинэ шатыг ТУХАЙН ЛИГИЙН мөрөнд бичнэ.
     *
     * ⚠ `onConflictDoUpdate` ЗААВАЛ: мөр байхгүй байж болно (анхны шат нь
     * мөргүй илэрхийлэгддэг) бөгөөд байж ч болно (өмнө нь дэвшсэн). Хоёр
     * тохиолдлыг тусад нь бичвэл хоёр дахь долоо хоногийг дүгнэхэд unique
     * зөрчил гарна.
     */
    await db
      .insert(courseLeagues)
      .values({
        uid,
        courseSlug: row.leagueKey,
        tier: nextTier(row.tier, outcome),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [courseLeagues.uid, courseLeagues.courseSlug],
        set: { tier: nextTier(row.tier, outcome), updatedAt: new Date() },
      });

    outcomes.push({ leagueKey: row.leagueKey, outcome });
  }

  return outcomes;
}

/**
 * ЭНЭ долоо хоногийн гишүүнчлэлийг баталгаажуулж, XP нэмнэ.
 *
 * Курсийн XP тэр курсийн БҮХ СУРГУУЛИЙН лиг бүрт орно
 * (`leagueKeysForCourse`) — жишээ нь Mind ба Life хоёуланд байгаа курсын
 * хичээл хоёр лигт хоёуланд нь тоологдоно.
 *
 * ⚠ ЗААВАЛ `settlePastWeeks`-ийн ДАРАА дуудагдана: эс бөгөөс хуучин шатаар
 * нь бүлэгт оруулж, дараа нь дүгнэлт шатыг өөрчилснөөр хэрэглэгч буруу
 * шатны бүлэгт үлдэнэ.
 */
export async function addWeeklyXp(
  uid: string,
  courseSlug: string,
  xp: number
): Promise<void> {
  // Курсгүй XP-г лигт оруулах газар байхгүй — чимээгүй алгасна.
  if (!courseSlug) return;

  const leagueKeys = await leagueKeysForCourse(courseSlug);
  const weekKey = currentWeekKey();

  // Лиг бүр ТУСДАА гүйлгээ — нэг лигийн түгжээ нөгөөг нь хүлээлгэхгүй.
  for (const leagueKey of leagueKeys) {
    await addWeeklyXpToLeague(uid, leagueKey, weekKey, xp);
  }
}

/** НЭГ лигт XP нэмнэ (бүлэгт нэгдээгүй бол нэгдүүлнэ). */
async function addWeeklyXpToLeague(
  uid: string,
  leagueKey: string,
  weekKey: string,
  xp: number
): Promise<void> {
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: leagueMembers.id })
      .from(leagueMembers)
      .where(
        and(
          eq(leagueMembers.uid, uid),
          eq(leagueMembers.courseSlug, leagueKey),
          eq(leagueMembers.weekKey, weekKey)
        )
      )
      .limit(1);

    if (existing) {
      if (xp > 0) {
        await tx
          .update(leagueMembers)
          .set({ xp: sql`${leagueMembers.xp} + ${xp}` })
          .where(eq(leagueMembers.id, existing.id));
      }
      return;
    }

    /*
     * Тухайн ЛИГИЙН шат. Мөр байхгүй бол хамгийн доод шат (Хүрэл) —
     * урьдчилж мөр үүсгэх шаардлагагүй (`schema.ts`).
     */
    const [standing] = await tx
      .select({ tier: courseLeagues.tier })
      .from(courseLeagues)
      .where(and(eq(courseLeagues.uid, uid), eq(courseLeagues.courseSlug, leagueKey)))
      .limit(1);

    const tier = clampTier(standing?.tier ?? 0);
    const cohortId = await findOrCreateCohort(tx, leagueKey, tier, weekKey);

    /*
     * `onConflictDoNothing` — хоёр хүсэлт ЗЭРЭГ ирвэл дээрх SELECT хоёуланд
     * нь хоосон буцаах боломжтой (уралдаан). Unique индекс барих ба хоёр
     * дахь оролдлого чимээгүй унтарна. Тэр тохиолдолд бүлгийн `memberCount`
     * нэг илүү тоологдох ч дүгнэлт БОДИТ мөрүүдээр явагддаг тул зөв хэвээр.
     */
    await tx
      .insert(leagueMembers)
      .values({ cohortId, uid, courseSlug: leagueKey, weekKey, tier, xp })
      .onConflictDoNothing();

    /*
     * "Хамгийн сүүлд өрсөлдсөн долоо хоног"-ийг тэмдэглэнэ — урт
     * завсарлагаар шат бууруулах тооцооны ЦОРЫН ГАНЦ эх сурвалж
     * (`applyIdleDecay`).
     *
     * ⚠ Шатыг ЭНД бичихгүй, зөвхөн `lastWeekKey`-г: тухайн мөрийн шат нь
     * дүгнэлтээр л өөрчлөгдөх ёстой. `onConflictDoUpdate`-д `tier` оруулбал
     * бүлэгт нэгдэх бүрд шат нь өөрөө өөрөөрөө дарагдана.
     */
    await tx
      .insert(courseLeagues)
      .values({ uid, courseSlug: leagueKey, tier, lastWeekKey: weekKey, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [courseLeagues.uid, courseLeagues.courseSlug],
        set: { lastWeekKey: weekKey, updatedAt: new Date() },
      });
  });
}

/**
 * УРТ ЗАВСАРЛАГААР шат бууруулна.
 *
 * ДҮРЭМ: долоо хоног өнжих нь шийтгэлгүй (тэр долоо хоногт бүлэгт огт
 * нэгддэггүй тул дүгнэгдэх мөр байхгүй). Харин `IDLE_WEEKS_TO_DEMOTE`
 * долоо хоног дараалан хичээл эхлүүлээгүй бол нэг шат буурна.
 *
 * ⚠ ИДЕМПОТЕНТ, `lastWeekKey`-г УРАГШЛУУЛСНААР. Шат бууруулах бүрд
 * тэмдэглэгээг `IDLE_WEEKS_TO_DEMOTE` долоо хоногоор шилжүүлнэ — тиймээс
 * нэг өдөрт хэдэн ч удаа дуудсан ижил үр дүн гарна. Хэрэв тэмдэглэгээг
 * ОДООГИЙН долоо хоног болгож тавьбал хагас жил ирээгүй хүн ганцхан шат
 * буух байсан; урагшлуулснаар алгассан САР БҮРД нэг шат буурна.
 *
 * ⚠ `settlePastWeeks`-ийн ДАРАА дуудагдана: дүгнэлт нь шатыг өөрчилдөг тул
 * өмнө нь дуудвал хуучин шат дээр тооцоолно.
 */
async function applyIdleDecay(uid: string, leagueKey: string): Promise<void> {
  const [row] = await db
    .select({ tier: courseLeagues.tier, lastWeekKey: courseLeagues.lastWeekKey })
    .from(courseLeagues)
    .where(and(eq(courseLeagues.uid, uid), eq(courseLeagues.courseSlug, leagueKey)))
    .limit(1);

  // Мөр байхгүй = хэзээ ч эхлээгүй. Буух шат ч, тэмдэглэгээ ч байхгүй.
  if (!row?.lastWeekKey) return;

  const weekKey = currentWeekKey();
  let tier = clampTier(row.tier);
  let marker = row.lastWeekKey;
  const idleDays = IDLE_WEEKS_TO_DEMOTE * 7;

  /*
   * ⚠ `daysBetween(a, b)` нь `a - b` (`lib/tactiq/day.ts`). `marker` нь
   * ӨНГӨРСӨН огноо тул `daysBetween(weekKey, marker)` гэж бичих ЁСТОЙ —
   * эсрэгээр бичвэл үргэлж СӨРӨГ гарч, бууралт ХЭЗЭЭ Ч ажиллахгүй.
   */
  while (tier > 0 && daysBetween(weekKey, marker) >= idleDays) {
    tier -= 1;
    marker = addDays(marker, idleDays);
  }

  /*
   * Хамгийн доод шатанд хүрсэн ч тэмдэглэгээг УРАГШЛУУЛНА — эс бөгөөс
   * хоцорсон тэмдэглэгээ үүрд үлдэж, хэрэглэгч эргэж ирээд нэг долоо
   * хоног өрсөлдөөд дараа нь дахин өнжвөл шууд буух эрсдэлтэй.
   */
  if (tier === 0) {
    while (daysBetween(weekKey, marker) >= idleDays) marker = addDays(marker, idleDays);
  }

  if (marker === row.lastWeekKey) return;

  await db
    .update(courseLeagues)
    .set({ tier, lastWeekKey: marker, updatedAt: new Date() })
    .where(and(eq(courseLeagues.uid, uid), eq(courseLeagues.courseSlug, leagueKey)));
}

export type LeagueStanding = {
  uid: string;
  displayName: string;
  photoUrl: string | null;
  xp: number;
  rank: number;
  isMe: boolean;
};

export type LeagueView = {
  leagueKey: string;
  tier: number;
  weekKey: string;
  size: number;
  standings: LeagueStanding[];
  /** ЭНЭ лигийн өмнөх долоо хоногийн үр дүн — дүгнэлт саяхан гарсан бол. */
  lastOutcome: LeagueOutcome | null;
  /**
   * ЭНЭ долоо хоногт тэмцээнд орсон эсэх.
   *
   * `false` = энэ сургуулийн курсээр энэ долоо хоногт хичээл эхлүүлээгүй.
   * Тэр үед `standings` ХООСОН — өөр хэн нэгний бүлгийг үзүүлэх нь утгагүй.
   */
  joined: boolean;
};

/**
 * Хэрэглэгчийн ЭНЭ долоо хоногийн тухайн лигийн бүлгийн жагсаалт.
 *
 * ⚠ Дүгнэлт, нэгдэлтийг ЭНД гүйцэтгэнэ — жагсаалт нээх нь хэрэглэгч эргэж
 * ирсэн гэдгийн хамгийн найдвартай дохио.
 */
export async function leagueView(uid: string, leagueKey: string): Promise<LeagueView> {
  const settled = await settlePastWeeks(uid);
  await applyIdleDecay(uid, leagueKey);

  const lastOutcome =
    settled.filter((item) => item.leagueKey === leagueKey).at(-1)?.outcome ?? null;
  const weekKey = currentWeekKey();

  const [me] = await db
    .select({ cohortId: leagueMembers.cohortId, tier: leagueMembers.tier })
    .from(leagueMembers)
    .where(
      and(
        eq(leagueMembers.uid, uid),
        eq(leagueMembers.courseSlug, leagueKey),
        eq(leagueMembers.weekKey, weekKey)
      )
    )
    .limit(1);

  /*
   * ⚠ ЖАГСААЛТ НЭЭХ НЬ ТЭМЦЭЭНД ОРУУЛАХГҮЙ. Урьд нь энд `addWeeklyXp(uid, 0)`
   * дуудагдаж, хуудас нээмэгц бүлэгт нэгддэг байв.
   *
   * Тэмцээнд ХИЧЭЭЛ ЭХЛЭХЭД л ордог (`addWeeklyXp`, хичээл дуусгах зам).
   * Ингэснээр л "долоо хоногт хичээл эхлүүлээгүй бол өнжинө" гэсэн дүрэм
   * биелнэ: жагсаалт хараад л бүлэгт орчихдог байсан бол хичээл хийгээгүй
   * хүн 0 XP-тэй дүгнэгдэж, өнжихийн оронд ДООШ БУУНА.
   */
  if (!me) {
    const [standing] = await db
      .select({ tier: courseLeagues.tier })
      .from(courseLeagues)
      .where(and(eq(courseLeagues.uid, uid), eq(courseLeagues.courseSlug, leagueKey)))
      .limit(1);

    return {
      leagueKey,
      tier: clampTier(standing?.tier ?? 0),
      weekKey,
      size: 0,
      standings: [],
      lastOutcome,
      joined: false,
    };
  }

  const rows = await db
    .select({
      uid: leagueMembers.uid,
      xp: leagueMembers.xp,
      joinedAt: leagueMembers.createdAt,
      displayName: users.displayName,
      photoUrl: users.photoUrl,
    })
    .from(leagueMembers)
    .innerJoin(users, eq(users.uid, leagueMembers.uid))
    .where(eq(leagueMembers.cohortId, me.cohortId))
    // Тэнцсэн үед ЭРТ нэгдсэн нь дээгүүр — `settlePastWeeks`-тэй ИЖИЛ дүрэм.
    .orderBy(desc(leagueMembers.xp), asc(leagueMembers.createdAt));

  return {
    leagueKey,
    tier: me.tier,
    weekKey,
    size: rows.length,
    standings: rows.map((row, index) => ({
      uid: row.uid,
      displayName: row.displayName,
      photoUrl: row.photoUrl,
      xp: row.xp,
      rank: index + 1,
      isMe: row.uid === uid,
    })),
    lastOutcome,
    joined: true,
  };
}

export type LeagueOption = {
  /** Сургуулийн slug эсвэл "other". */
  key: string;
  /** «Mind · Оюун ухаан» */
  title: string;
  /** Тухайн лиг дэх одоогийн шат. */
  tier: number;
  /** ЭНЭ долоо хоногт тэр лигт тэмцээнд орсон эсэх. */
  joined: boolean;
};

/**
 * Сурагчийн сонгож болох лигүүд — хичээл эхэлсэн курсуудын СУРГУУЛИУД.
 *
 * "Эхэлсэн" гэдэгт лигт нэгдэж байсан лигийг ЧУХ оруулна: хэрэглэгч тэр
 * сургуулийн курсээ орхисон ч өнгөрсөн долоо хоногийн үр дүн, шат нь үлдэнэ.
 */
export async function leagueOptions(uid: string): Promise<LeagueOption[]> {
  const weekKey = currentWeekKey();

  const started = await db
    .select({ courseSlug: lessonProgress.courseSlug })
    .from(lessonProgress)
    .where(eq(lessonProgress.uid, uid))
    .groupBy(lessonProgress.courseSlug);

  const startedCourses =
    started.length === 0
      ? []
      : await db
          .select({ school: courses.school, schools: courses.schools })
          .from(courses)
          .where(inArray(courses.slug, started.map((row) => row.courseSlug)));

  const standings = await db
    .select({ key: courseLeagues.courseSlug, tier: courseLeagues.tier })
    .from(courseLeagues)
    .where(eq(courseLeagues.uid, uid));

  const joinedRows = await db
    .select({ key: leagueMembers.courseSlug })
    .from(leagueMembers)
    .where(and(eq(leagueMembers.uid, uid), eq(leagueMembers.weekKey, weekKey)));

  const keys = new Set<string>([
    // Курс олон сургуульд байвал тус бүрийн лиг сонголтонд гарна.
    ...startedCourses.flatMap((row) => leagueKeysForSchools(courseSchools(row))),
    // Хуучин мөрийн түлхүүр танигдахгүй бол «Бусад»-д тооцно.
    ...standings.map((row) => leagueKeyForSchool(row.key)),
  ]);

  const tierByKey = new Map(standings.map((row) => [row.key, row.tier]));
  const joined = new Set(joinedRows.map((row) => row.key));

  return [...keys]
    .map((key) => ({
      key,
      title: leagueTitle(key),
      tier: clampTier(tierByKey.get(key) ?? 0),
      joined: joined.has(key),
    }))
    // Шат өндөртэй нь эхэнд, тэнцвэл сургуулийн тогтмол дарааллаар — дараалал
    // нь ачаалал бүрд ижил байх ёстой.
    .sort((x, y) => y.tier - x.tier || leagueOrder(x.key) - leagueOrder(y.key));
}
