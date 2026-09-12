import "server-only";

import { and, eq, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { friendships, leagueMembers, users } from "@/lib/db/schema";
import { currentWeekKey } from "@/lib/api/league";

/**
 * Найзын холбоо.
 *
 * ⚠ ХОСЫГ ЭРЭМБЭЛЖ ХАДГАЛНА (`schema.ts`-ийн `friendships` тайлбар). Тиймээс
 * энэ файлын БҮХ функц эхлээд `orderPair()`-ээр дамжина — "хэн хэнд илгээв"
 * гэдгийг `requestedBy` тусад нь хадгална.
 */

/** Хосыг цагаан толгойн дарааллаар байрлуулна — unique индексийн урьдач нөхцөл. */
function orderPair(x: string, y: string): { a: string; b: string } {
  return x < y ? { a: x, b: y } : { a: y, b: x };
}

export type FriendSummary = {
  uid: string;
  displayName: string;
  photoUrl: string | null;
  xp: number;
  level: number;
  streakDays: number;
  rating: number;
  /** ЭНЭ долоо хоногт цуглуулсан XP — найзуудын жагсаалт эрэмбэлэхэд. */
  weeklyXp: number;
};

export type FriendsView = {
  friends: FriendSummary[];
  /** Надад ирсэн, хариу хүлээж буй хүсэлтүүд. */
  incoming: FriendSummary[];
  /** Миний илгээсэн, хариу хүлээж буй хүсэлтүүд. */
  outgoing: FriendSummary[];
};

/**
 * Найзууд ба хүлээгдэж буй хүсэлтүүд — НЭГ асуулгаар.
 *
 * ⚠ Гурван тусдаа асуулга явуулбал (найз / ирсэн / илгээсэн) ижил join
 * гурван удаа давтагдана. Оронд нь бүх холбоог нэг удаа уншаад JS талд
 * ангилна — мөрийн тоо нь хэдэн зуугаас хэтрэхгүй.
 */
export async function friendsView(uid: string): Promise<FriendsView> {
  const weekKey = currentWeekKey();

  /*
   * Нөгөө талын uid-ыг SQL дотор сонгоно (`CASE`): хос эрэмбэлэгдсэн тул
   * "нөгөө тал" нь мөр бүрд өөр багана байна. JS талд шийдвэл нэг join-оор
   * хоёр хэрэглэгчийн мөр татах шаардлагатай болно.
   */
  const otherUid = sql<string>`CASE WHEN ${friendships.userAUid} = ${uid} THEN ${friendships.userBUid} ELSE ${friendships.userAUid} END`;

  const rows = await db
    .select({
      status: friendships.status,
      requestedBy: friendships.requestedBy,
      uid: users.uid,
      displayName: users.displayName,
      photoUrl: users.photoUrl,
      xp: users.xp,
      streakDays: users.streakDays,
      rating: users.rating,
      /*
       * ⚠ JOIN БИШ, НИЙЛБЭРИЙН ДЭД АСУУЛГА. Лиг сургууль тус бүрд тусдаа тул
       * нэг хүн долоо хоногт хэд хэдэн `league_members` мөртэй байж болно —
       * JOIN хийвэл найз нь жагсаалтад хэд дахин давхардаж, XP нь хуваагдана.
       */
      weeklyXp: sql<number>`COALESCE((SELECT sum(lm.xp) FROM ${leagueMembers} lm WHERE lm.uid = ${users.uid} AND lm.week_key = ${weekKey}), 0)`,
    })
    .from(friendships)
    .innerJoin(users, eq(users.uid, otherUid))
    .where(or(eq(friendships.userAUid, uid), eq(friendships.userBUid, uid)));

  const view: FriendsView = { friends: [], incoming: [], outgoing: [] };

  for (const row of rows) {
    const summary: FriendSummary = {
      uid: row.uid,
      displayName: row.displayName,
      photoUrl: row.photoUrl,
      xp: row.xp,
      // Түвшинг ЭНД тооцохгүй — дуудагч `levelFromXp`-ээр гаргана
      // (`lib/tactiq/xp.ts` нь энэ файлын хамаарлыг нэмэхээс сэргийлэв).
      level: 0,
      streakDays: row.streakDays,
      rating: row.rating,
      weeklyXp: Number(row.weeklyXp ?? 0),
    };

    if (row.status === "accepted") view.friends.push(summary);
    else if (row.requestedBy === uid) view.outgoing.push(summary);
    else view.incoming.push(summary);
  }

  // Найзуудыг ЭНЭ ДОЛОО ХОНОГИЙН XP-ээр — "хэн идэвхтэй байна" гэдэг нь
  // нийт XP-ээс илүү сонирхолтой (нийт нь хэзээ ч буурдаггүй тул
  // эрт эхэлсэн хүн үүрд тэргүүлнэ).
  view.friends.sort((x, y) => y.weeklyXp - x.weeklyXp || y.xp - x.xp);

  return view;
}

export type FriendRequestOutcome =
  | { ok: true; friend: { uid: string; displayName: string }; status: "pending" | "accepted" }
  | { ok: false; reason: "not-found" | "self" | "already" };

/**
 * Найзын хүсэлт илгээнэ (сурагчийн хувийн кодоор).
 *
 * ⚠ ХАРИУ ХҮСЭЛТ АВТОМАТААР ЗӨВШӨӨРӨГДӨНӨ: Б хүн А-д хүсэлт илгээчихсэн
 * байхад А нь Б рүү хүсэлт илгээвэл энэ нь "зөвшөөрч байна" гэсэн үг —
 * "аль хэдийн хүсэлт байна" гэж алдаа өгвөл хэрэглэгч гацна.
 */
export async function sendFriendRequest(
  uid: string,
  code: string
): Promise<FriendRequestOutcome> {
  const [target] = await db
    .select({ uid: users.uid, displayName: users.displayName })
    .from(users)
    .where(eq(users.studentInviteCode, code))
    .limit(1);

  if (!target) return { ok: false, reason: "not-found" };
  if (target.uid === uid) return { ok: false, reason: "self" };

  const { a, b } = orderPair(uid, target.uid);

  const [existing] = await db
    .select()
    .from(friendships)
    .where(and(eq(friendships.userAUid, a), eq(friendships.userBUid, b)))
    .limit(1);

  if (existing) {
    if (existing.status === "accepted") return { ok: false, reason: "already" };

    // Миний өөрийн хүсэлт хэвээрээ — давхар илгээх нь юу ч өөрчлөхгүй.
    if (existing.requestedBy === uid) {
      return { ok: true, friend: target, status: "pending" };
    }

    // Нөгөө тал өмнө нь илгээсэн байсан — энэ бол зөвшөөрөл.
    await db
      .update(friendships)
      .set({ status: "accepted", respondedAt: new Date() })
      .where(eq(friendships.id, existing.id));

    return { ok: true, friend: target, status: "accepted" };
  }

  await db
    .insert(friendships)
    .values({ userAUid: a, userBUid: b, requestedBy: uid, status: "pending" })
    // Хоёр хүн ЯГ ЗЭРЭГ бие бие рүүгээ илгээх ховор уралдаан — unique индекс
    // барих ба хоёр дахь оролдлого чимээгүй унтарна.
    .onConflictDoNothing();

  return { ok: true, friend: target, status: "pending" };
}

/**
 * Ирсэн хүсэлтийг зөвшөөрнө.
 *
 * ⚠ `requestedBy <> uid` нөхцөл ЗААВАЛ: эс бөгөөс хэрэглэгч ӨӨРИЙН илгээсэн
 * хүсэлтээ зөвшөөрч, хүссэн хүнээ найз болгож чадна.
 */
export async function acceptFriendRequest(uid: string, otherUid: string): Promise<boolean> {
  const { a, b } = orderPair(uid, otherUid);

  const updated = await db
    .update(friendships)
    .set({ status: "accepted", respondedAt: new Date() })
    .where(
      and(
        eq(friendships.userAUid, a),
        eq(friendships.userBUid, b),
        eq(friendships.status, "pending"),
        sql`${friendships.requestedBy} <> ${uid}`
      )
    )
    .returning({ id: friendships.id });

  return updated.length > 0;
}

/**
 * Найзаас хасах, эсвэл хүсэлтээс татгалзах/цуцлах.
 *
 * Мөрийг УСТГАНА, "declined" гэж хадгалахгүй — эс бөгөөс татгалзсан хүн
 * дахин хүсэлт илгээх боломжгүй болно.
 */
export async function removeFriend(uid: string, otherUid: string): Promise<boolean> {
  const { a, b } = orderPair(uid, otherUid);

  const removed = await db
    .delete(friendships)
    .where(and(eq(friendships.userAUid, a), eq(friendships.userBUid, b)))
    .returning({ id: friendships.id });

  return removed.length > 0;
}

/** Хоёр хүн НАЙЗ мөн үү — хосын даалгавар үүсгэхийн өмнө шалгана. */
export async function areFriends(x: string, y: string): Promise<boolean> {
  const { a, b } = orderPair(x, y);

  const [row] = await db
    .select({ id: friendships.id })
    .from(friendships)
    .where(
      and(
        eq(friendships.userAUid, a),
        eq(friendships.userBUid, b),
        eq(friendships.status, "accepted")
      )
    )
    .limit(1);

  return !!row;
}

export { orderPair };
