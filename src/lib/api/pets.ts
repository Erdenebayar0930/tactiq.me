import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { pets, users } from "@/lib/db/schema";
import {
  canCare,
  CARE_BREAK_HOURS,
  claimableMilestones,
  findSpecies,
  MAX_PETS,
  petState,
} from "@/lib/tactiq/pets";

import type { PetRow } from "@/lib/db/schema";

/**
 * ТЭЖЭЭВРИЙН серверийн үйлдлүүд.
 *
 * ⚠ ЗООСНЫ КОД. Гурван дүрэм:
 *
 *   1. ҮНИЙГ СЕРВЕР УНШИНА (`lib/tactiq/pets.ts`). Клиентээс үнэ авбал
 *      хэрэглэгч 1 зоосоор амьтны цэцэрлэг цуглуулна.
 *   2. ЗООС ХАСАХ нь АТОМИК — нөхцөлт UPDATE. Уншаад-бодоод-бичвэл хоёр таб
 *      зэрэг дарахад нэг үнээр хоёр удаа авна.
 *   3. АСАРГАА ӨДӨРТ НЭГ УДАА. Хугацааг СЕРВЕР шалгана: клиент товчоо
 *      хэдэн ч удаа дарж чадах ба тэр бүрд шагналын дараалал өсөх ёсгүй.
 */

export type PetView = PetRow & {
  mood: "happy" | "hungry" | "sad";
  msToNextCare: number;
  claimable: { days: number; gems: number; label: string }[];
};

function toView(row: PetRow, now: Date): PetView {
  const state = petState(row.lastCareAt, now);

  /*
   * ⚠ Дараалал тасарсныг УНШИЛТЫН үед харуулна, гэхдээ санд ЭНД
   * БИЧИХГҮЙ: уншилт нь бичих үйлдэл хийвэл жагсаалт татах бүрд бичилт
   * үүсч, кэш/олон табны зан төлөв төвөгтэй болно. Санд байгаа тоо нь
   * дараагийн АСАРГААНЫ үед (`carePet`) шинэчлэгдэнэ.
   */
  const careStreak = state.streakBroken ? 0 : row.careStreak;
  const claimed = (row.claimedMilestones ?? []) as number[];

  return {
    ...row,
    careStreak,
    mood: state.mood,
    msToNextCare: state.msToNextCare,
    claimable: claimableMilestones(careStreak, claimed),
  };
}

export async function listPets(uid: string): Promise<PetView[]> {
  const now = new Date();
  const rows = await db.select().from(pets).where(eq(pets.uid, uid)).orderBy(asc(pets.createdAt));
  return rows.map((row) => toView(row, now));
}

export type BuyOutcome =
  | { ok: true; pet: PetView; gems: number }
  | { ok: false; reason: "unknown" | "no-gems" | "limit" };

export async function buyPet(uid: string, speciesId: string): Promise<BuyOutcome> {
  const species = findSpecies(speciesId);
  if (!species) return { ok: false, reason: "unknown" };

  const [count] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(pets)
    .where(eq(pets.uid, uid));

  if ((count?.n ?? 0) >= MAX_PETS) return { ok: false, reason: "limit" };

  /*
   * ⚠ Зоосыг ЭХЛЭЭД нөхцөлт UPDATE-ээр хасна. Хэрэв хүрэлцэхгүй бол НЭГ Ч
   * мөр өөрчлөгдөхгүй тул тэжээвэр ч үүсэхгүй. Эсрэг дараалалаар хийвэл
   * (эхлээд тэжээвэр үүсгээд дараа нь зоос хасах) зоос хүрэлцэхгүй үед
   * үнэгүй тэжээвэр үлдэнэ.
   */
  const paid = await db
    .update(users)
    .set({ gems: sql`${users.gems} - ${species.price}`, updatedAt: new Date() })
    .where(and(eq(users.uid, uid), sql`${users.gems} >= ${species.price}`))
    .returning({ gems: users.gems });

  if (paid.length === 0) return { ok: false, reason: "no-gems" };

  const [row] = await db.insert(pets).values({ uid, species: species.id }).returning();

  return { ok: true, pet: toView(row, new Date()), gems: paid[0].gems };
}

export type CareOutcome =
  | { ok: true; pet: PetView; gems: number }
  | { ok: false; reason: "not-found" | "no-gems" | "too-soon" };

/**
 * Хооллох / услах.
 *
 * ⚠ Дарааллыг СЕРВЕР шийднэ: сүүлийн асаргаанаас хойш `CARE_BREAK_HOURS`
 * өнгөрсөн бол 1-ээс эхэлнэ, эс бөгөөс +1. Клиентээс ирсэн ямар ч тоог
 * хүлээж авахгүй.
 */
export async function carePet(uid: string, petId: string): Promise<CareOutcome> {
  const now = new Date();

  const [row] = await db
    .select()
    .from(pets)
    .where(and(eq(pets.id, petId), eq(pets.uid, uid)))
    .limit(1);

  // ⚠ `uid` нөхцөлд ОРСОН: үүнгүй бол хэрэглэгч бусдын тэжээврийн ID-г
  // таамаглаад асарч, тэдний дарааллыг өсгөж чадна.
  if (!row) return { ok: false, reason: "not-found" };

  if (!canCare(row.lastCareAt, now)) return { ok: false, reason: "too-soon" };

  const species = findSpecies(row.species);
  const cost = species?.careCost ?? 0;

  if (cost > 0) {
    const paid = await db
      .update(users)
      .set({ gems: sql`${users.gems} - ${cost}`, updatedAt: now })
      .where(and(eq(users.uid, uid), sql`${users.gems} >= ${cost}`))
      .returning({ gems: users.gems });

    if (paid.length === 0) return { ok: false, reason: "no-gems" };

    const updated = await applyCare(row, now);
    return { ok: true, pet: toView(updated, now), gems: paid[0].gems };
  }

  const updated = await applyCare(row, now);
  const [me] = await db.select({ gems: users.gems }).from(users).where(eq(users.uid, uid)).limit(1);
  return { ok: true, pet: toView(updated, now), gems: me?.gems ?? 0 };
}

async function applyCare(row: PetRow, now: Date): Promise<PetRow> {
  const broken = petState(row.lastCareAt, now).streakBroken;
  const nextStreak = row.lastCareAt === null || broken ? 1 : row.careStreak + 1;

  const [updated] = await db
    .update(pets)
    .set({
      lastCareAt: now,
      careStreak: nextStreak,
      bestStreak: Math.max(row.bestStreak, nextStreak),
      totalCare: row.totalCare + 1,
      updatedAt: now,
    })
    // ⚠ `lastCareAt` нөхцөл: хоёр хүсэлт ЗЭРЭГ ирвэл хоёр дахь нь юу ч
    // хийхгүй — эс бөгөөс нэг өдөрт хоёр удаа тоологдоно.
    .where(
      and(
        eq(pets.id, row.id),
        row.lastCareAt === null
          ? sql`${pets.lastCareAt} is null`
          : eq(pets.lastCareAt, row.lastCareAt)
      )
    )
    .returning();

  return updated ?? row;
}

export type ClaimOutcome =
  | { ok: true; pet: PetView; gems: number; reward: number }
  | { ok: false; reason: "not-found" | "not-earned" };

/**
 * Асаргааны шагнал авах.
 *
 * ⚠ Шагналыг ЗӨВХӨН НЭГ УДАА: `claimedMilestones` жагсаалтад нэмэгдсэн
 * эсэхийг UPDATE-ийн НӨХЦӨЛД шалгана. Уншаад-шалгаад-бичвэл хоёр таб
 * зэрэг дарахад хоёр удаа олгогдоно.
 */
export async function claimMilestone(
  uid: string,
  petId: string,
  days: number
): Promise<ClaimOutcome> {
  const now = new Date();

  const [row] = await db
    .select()
    .from(pets)
    .where(and(eq(pets.id, petId), eq(pets.uid, uid)))
    .limit(1);

  if (!row) return { ok: false, reason: "not-found" };

  const view = toView(row, now);
  const milestone = view.claimable.find((item) => item.days === days);
  if (!milestone) return { ok: false, reason: "not-earned" };

  const claimedUpdate = await db
    .update(pets)
    .set({
      claimedMilestones: sql`${pets.claimedMilestones} || ${JSON.stringify([days])}::jsonb`,
      updatedAt: now,
    })
    .where(
      and(
        eq(pets.id, row.id),
        sql`not (${pets.claimedMilestones} @> ${JSON.stringify([days])}::jsonb)`
      )
    )
    .returning();

  // Хоёр дахь зэрэгцээ хүсэлт — аль хэдийн олгогдсон.
  if (claimedUpdate.length === 0) return { ok: false, reason: "not-earned" };

  const [me] = await db
    .update(users)
    .set({ gems: sql`${users.gems} + ${milestone.gems}`, updatedAt: now })
    .where(eq(users.uid, uid))
    .returning({ gems: users.gems });

  return {
    ok: true,
    pet: toView(claimedUpdate[0], now),
    gems: me?.gems ?? 0,
    reward: milestone.gems,
  };
}

/** Нэрлэх — хүүхэд тэжээвэртээ нэр өгөх нь хамгийн эхний холбоо. */
export async function renamePet(uid: string, petId: string, name: string): Promise<PetView | null> {
  const clean = name.trim().slice(0, 40);

  const [updated] = await db
    .update(pets)
    .set({ name: clean, updatedAt: new Date() })
    .where(and(eq(pets.id, petId), eq(pets.uid, uid)))
    .returning();

  return updated ? toView(updated, new Date()) : null;
}

export { CARE_BREAK_HOURS };
