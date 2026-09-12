import "server-only";

import { and, eq, isNull, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { friendQuests, users } from "@/lib/db/schema";
import { areFriends, orderPair } from "@/lib/api/friends";
import { currentWeekKey } from "@/lib/api/league";
import { daysBetween, today } from "@/lib/tactiq/day";

/**
 * Найзын хосын долоо хоногийн ХАМТЫН зорилт.
 *
 * Хоёр найз НЭГ зорилтод (`QUEST_GOAL_XP`) хамтдаа хүрнэ. Хувь нэмэр нь
 * тусад нь бичигдэх ба НИЙЛБЭРЭЭР дүгнэгдэнэ — өөрөөр хэлбэл нэг нь
 * бага идэвхтэй байсан ч нөгөө нь нөхөж чадна.
 *
 * ⚠ ЛИГЭЭС ЯЛГААТАЙ нь энэ бол ХАМТЫН АЖИЛЛАГАА, өрсөлдөөн БИШ: лиг нь
 * "хэн илүү вэ", даалгавар нь "хамтдаа хүрэх үү" гэдгийг асууна. Хоёр өөр
 * сэдэл — нэгийг нь нөгөөгөөр орлуулж болохгүй.
 */

/** Долоо хоногийн хосын зорилт (XP). */
export const QUEST_GOAL_XP = 300;

/** Зорилтод хүрсэн ХОЁУЛАНД нь олгох зоос. */
export const QUEST_REWARD_GEMS = 30;

export type QuestView = {
  weekKey: string;
  goalXp: number;
  myXp: number;
  friendXp: number;
  totalXp: number;
  percent: number;
  /**
   * Даалгавар дуусахад үлдсэн ӨДӨР (Ням гараг хүртэл, өнөөдрийг оруулаад).
   *
   * ⚠ Клиент талд тооцож БОЛОХГҮЙ. Хэрэглэгчийн төхөөрөмжийн цаг, цагийн
   * бүс буруу байж болох ба тэр үед "1 өдөр үлдлээ" гэж яаруулах, эсвэл
   * аль хэдийн дууссан даалгаврыг идэвхтэй мэт харуулах эрсдэлтэй. Сервер
   * нь `APP_TIMEZONE`-оор ганц үнэнийг тогтооно (`lib/tactiq/day.ts`).
   */
  daysLeft: number;
  completed: boolean;
  friend: { uid: string; displayName: string; photoUrl: string | null };
};

/** Тухайн долоо хоногийн миний идэвхтэй даалгавар (байвал). */
export async function currentQuest(uid: string): Promise<QuestView | null> {
  const weekKey = currentWeekKey();

  const otherUid = sql<string>`CASE WHEN ${friendQuests.userAUid} = ${uid} THEN ${friendQuests.userBUid} ELSE ${friendQuests.userAUid} END`;

  const [row] = await db
    .select({
      userAUid: friendQuests.userAUid,
      goalXp: friendQuests.goalXp,
      xpA: friendQuests.xpA,
      xpB: friendQuests.xpB,
      completedAt: friendQuests.completedAt,
      friendUid: users.uid,
      friendName: users.displayName,
      friendPhoto: users.photoUrl,
    })
    .from(friendQuests)
    .innerJoin(users, eq(users.uid, otherUid))
    .where(
      and(
        eq(friendQuests.weekKey, weekKey),
        or(eq(friendQuests.userAUid, uid), eq(friendQuests.userBUid, uid))
      )
    )
    .limit(1);

  if (!row) return null;

  const iAmA = row.userAUid === uid;
  const myXp = iAmA ? row.xpA : row.xpB;
  const friendXp = iAmA ? row.xpB : row.xpA;
  const totalXp = myXp + friendXp;

  return {
    weekKey,
    goalXp: row.goalXp,
    myXp,
    friendXp,
    totalXp,
    percent: Math.min(100, Math.round((totalXp / row.goalXp) * 100)),
    /*
     * Даваа = 7 өдөр, Ням = 1 өдөр. `daysBetween(a, b)` нь `a - b` тул
     * өнөөдрөөс Даваа хүртэлх зөрүү нь 0-6 болно (`lib/tactiq/day.ts`).
     */
    daysLeft: Math.max(0, 7 - daysBetween(today(), weekKey)),
    completed: row.completedAt !== null,
    friend: { uid: row.friendUid, displayName: row.friendName, photoUrl: row.friendPhoto },
  };
}

export type StartQuestOutcome =
  | { ok: true; quest: QuestView }
  | { ok: false; reason: "not-friends" | "busy" | "friend-busy" };

/**
 * Найзтайгаа энэ долоо хоногийн даалгавар эхлүүлнэ.
 *
 * ⚠ Нэг хүн долоо хоногт ЗӨВХӨН НЭГ даалгавартай. Олон найзтай зэрэг
 * даалгавартай байвал нэг хичээлийн XP олон даалгаварт давхар тоологдож,
 * шагнал үржинэ.
 */
export async function startQuest(
  uid: string,
  friendUid: string
): Promise<StartQuestOutcome> {
  if (!(await areFriends(uid, friendUid))) return { ok: false, reason: "not-friends" };

  const weekKey = currentWeekKey();

  // Хоёр талын аль нэг нь аль хэдийн даалгавартай эсэх.
  const busy = await db
    .select({ userAUid: friendQuests.userAUid, userBUid: friendQuests.userBUid })
    .from(friendQuests)
    .where(
      and(
        eq(friendQuests.weekKey, weekKey),
        or(
          eq(friendQuests.userAUid, uid),
          eq(friendQuests.userBUid, uid),
          eq(friendQuests.userAUid, friendUid),
          eq(friendQuests.userBUid, friendUid)
        )
      )
    );

  for (const row of busy) {
    if (row.userAUid === uid || row.userBUid === uid) return { ok: false, reason: "busy" };
    return { ok: false, reason: "friend-busy" };
  }

  const { a, b } = orderPair(uid, friendUid);

  await db
    .insert(friendQuests)
    .values({ weekKey, userAUid: a, userBUid: b, goalXp: QUEST_GOAL_XP })
    .onConflictDoNothing();

  const quest = await currentQuest(uid);

  // Уралдаанд ялагдсан (найз нь ЯГ зэрэг өөр даалгавар эхлүүлсэн) —
  // `currentQuest` нь тэр өөр даалгаврыг буцаана, энэ нь ч зөв төлөв.
  return quest ? { ok: true, quest } : { ok: false, reason: "busy" };
}

/**
 * Хичээлээр олсон XP-г идэвхтэй даалгаварт нэмнэ.
 *
 * ⚠ ХИЧЭЭЛ ДУУСГАХ УРСГАЛААС дуудагдана
 * (`api/learn/lessons/[lessonId]/complete`). Ямар ч
 * тохиолдолд ШИДЭХГҮЙ — даалгаврын алдаа хичээлийн оноог унагаах ёсгүй.
 *
 * @returns шагнал ЯГ ОДОО олгогдсон эсэх (клиент баярлуулахад)
 */
export async function addQuestXp(uid: string, xp: number): Promise<boolean> {
  if (xp <= 0) return false;

  const weekKey = currentWeekKey();

  /*
   * Хувь нэмрийг НЭМЭГДҮҮЛЭХ, ба ЗОРИЛТОД ХҮРСЭН эсэхийг ИЖИЛ UPDATE-д
   * шийднэ — `CASE` нь `completed_at`-ыг НЭГ Л удаа тавина (аль хэдийн
   * тавигдсан бол хэвээр үлдээнэ). Ингэснээр "дууссан мөч" нь хожим
   * хичээл дуусгах бүрд урагшилж, түүх гуйвахгүй.
   */
  const [row] = await db
    .update(friendQuests)
    .set({
      xpA: sql`${friendQuests.xpA} + CASE WHEN ${friendQuests.userAUid} = ${uid} THEN ${xp} ELSE 0 END`,
      xpB: sql`${friendQuests.xpB} + CASE WHEN ${friendQuests.userBUid} = ${uid} THEN ${xp} ELSE 0 END`,
      completedAt: sql`CASE
        WHEN ${friendQuests.completedAt} IS NOT NULL THEN ${friendQuests.completedAt}
        WHEN ${friendQuests.xpA} + ${friendQuests.xpB} + ${xp} >= ${friendQuests.goalXp} THEN now()
        ELSE NULL
      END`,
    })
    .where(
      and(
        eq(friendQuests.weekKey, weekKey),
        or(eq(friendQuests.userAUid, uid), eq(friendQuests.userBUid, uid))
      )
    )
    .returning({
      id: friendQuests.id,
      completedAt: friendQuests.completedAt,
    });

  // Даалгаваргүй, эсвэл зорилтод хараахан хүрээгүй.
  if (!row?.completedAt) return false;

  /*
   * Шагналыг НЭГ УДАА нэхэмжилнэ.
   *
   * ⚠ `returning` нь UPDATE-ийн ДАРААХ утгыг өгдөг тул дээрх `completedAt`
   * нь "ЭНЭ дуудалтаар дуусав уу" гэдгийг хэлж ЧАДАХГҮЙ — дууссаны дараах
   * хичээл бүр ч гэсэн тавигдсан утгыг буцаана. Тиймээс `rewarded_at IS
   * NULL` нөхцөлт UPDATE л жинхэнэ хамгаалалт: хэдэн хичээл дуусгасан ч,
   * хоёр тал зэрэг дуусгасан ч зоос НЭГ Л удаа олгогдоно.
   */
  const claimed = await db
    .update(friendQuests)
    .set({ rewardedAt: new Date() })
    .where(and(eq(friendQuests.id, row.id), isNull(friendQuests.rewardedAt)))
    .returning({
      userAUid: friendQuests.userAUid,
      userBUid: friendQuests.userBUid,
    });

  if (claimed.length === 0) return false;

  const { userAUid, userBUid } = claimed[0];

  await db
    .update(users)
    .set({ gems: sql`${users.gems} + ${QUEST_REWARD_GEMS}`, updatedAt: new Date() })
    .where(or(eq(users.uid, userAUid), eq(users.uid, userBUid)));

  return true;
}
