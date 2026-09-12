import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";

import { badRequest, requireActiveUser, serverError } from "@/lib/api/auth";
import { toPublicUser } from "@/lib/api/publicUser";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { findBackground, findBanner, findFrame } from "@/lib/tactiq/shop";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ЗООСНЫ ДЭЛГҮҮР — аватарын хүрээ ба профайлын банер.
 *
 * ⚠ ЗООСНЫ КОД. Хоёр дүрэм:
 *
 *   1. ҮНИЙГ СЕРВЕР УНШИНА (`lib/tactiq/shop.ts`). Клиентээс үнэ авбал
 *      хэрэглэгч 1 зоосоор бүгдийг цуглуулна.
 *   2. ХАСАЛТ НЬ АТОМИК. Уншаад-бодоод-бичвэл хоёр таб зэрэг дарахад нэг
 *      үнээр хоёр зүйл авна. Тиймээс нөхцөлт UPDATE — `gems >= үнэ` ба
 *      «аль хэдийн эзэмшээгүй» хоёулаа UPDATE-ийн ДОТОР шалгагдана.
 *
 * ⚠ Хүрээ, банер хоёрыг НЭГ route-д барьсан: логик нь үсэг үсгээрээ ижил
 * (каталогоос үнэ уншиж, зоос хасаад жагсаалтад нэмэх) бөгөөд хоёр
 * тусдаа файл болговол атомик хасалтын нарийн ширийн хоёр газар
 * давхардаж, нэг нь хожим өөрчлөгдөхөд чимээгүй зөрнө.
 */

type ItemKind = "frame" | "banner" | "background";

/** Каталогийн нэг мөр — хүрээ ба банерийн ЕРӨНХИЙ хэлбэр. */
function resolveItem(kind: ItemKind, id: string) {
  if (kind === "frame") {
    const frame = findFrame(id);
    return frame
      ? { gems: frame.gems, ownedColumn: users.ownedFrames, equipColumn: users.avatarFrame }
      : null;
  }

  if (kind === "banner") {
    const banner = findBanner(id);
    return banner
      ? { gems: banner.gems, ownedColumn: users.ownedBanners, equipColumn: users.bannerTheme }
      : null;
  }

  const background = findBackground(id);
  return background
    ? {
        gems: background.gems,
        ownedColumn: users.ownedBackgrounds,
        equipColumn: users.bgTheme,
      }
    : null;
}

export async function POST(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const { caller } = result;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: unknown;
      kind?: unknown;
      itemId?: unknown;
      /** Хуучин нэр — зөвхөн хүрээнд хэрэглэгдэж байсан. */
      frameId?: unknown;
    };

    const kind: ItemKind =
      body.kind === "banner"
        ? "banner"
        : body.kind === "background"
          ? "background"
          : "frame";
    const itemId =
      typeof body.itemId === "string"
        ? body.itemId
        : typeof body.frameId === "string"
          ? body.frameId
          : "";

    const owned = (
      kind === "frame"
        ? caller.user!.ownedFrames
        : kind === "banner"
          ? caller.user!.ownedBanners
          : caller.user!.ownedBackgrounds
    ) as string[] | null;
    const ownedList = owned ?? [];

    /* ---------- Зүүх (үнэгүй) ---------- */
    if (body.action === "equip") {
      /*
       * ⚠ Зөвхөн ЭЗЭМШСЭН зүйлийг зүүнэ. Эс бөгөөс хэрэглэгч DevTools-оор
       * дурын id илгээгээд төлбөргүй чимэглэл авна. "" (чимэглэлгүй) нь
       * ямагт зөвшөөрөгдөнө — хэрэглэгч чимэглэлээ тайлах эрхтэй.
       */
      if (itemId !== "" && !resolveItem(kind, itemId)) return badRequest("Танихгүй зүйл.");
      if (itemId !== "" && !ownedList.includes(itemId)) {
        return badRequest("Энэ зүйлийг та эзэмшээгүй байна.");
      }

      const [row] = await db
        .update(users)
        .set(
          kind === "frame"
            ? { avatarFrame: itemId, updatedAt: new Date() }
            : kind === "banner"
              ? { bannerTheme: itemId, updatedAt: new Date() }
              : { bgTheme: itemId, updatedAt: new Date() }
        )
        .where(eq(users.uid, caller.uid))
        .returning();

      return NextResponse.json({ user: toPublicUser(row) });
    }

    /* ---------- Худалдаж авах ---------- */
    const item = resolveItem(kind, itemId);
    if (!item) return badRequest("Танихгүй зүйл.");
    if (ownedList.includes(itemId)) return badRequest("Та үүнийг аль хэдийн авсан байна.");

    const json = JSON.stringify([itemId]);

    /*
     * ⚠ Талбарын нэрийг ДИНАМИКААР угсрахгүй, ИЛ бичив: тооцоолсон
     * түлхүүр (`[кind === "frame" ? ... ]`) нь TypeScript-ийн шалгалтыг
     * тойрч гарах ба алдаатай нэр бичихэд ЧИМЭЭГҮЙ буруу багана
     * шинэчлэгдэнэ. Мөнгөний кодод тийм эрсдэл хүлээх шалтгаангүй.
     *
     * Худалдаж авмагц ШУУД зүүнэ — хэрэглэгч юу авснаа тэр дороо харна.
     */
    const patch =
      kind === "frame"
        ? {
            gems: sql`${users.gems} - ${item.gems}`,
            ownedFrames: sql`${users.ownedFrames} || ${json}::jsonb`,
            avatarFrame: itemId,
            updatedAt: new Date(),
          }
        : kind === "banner"
          ? {
              gems: sql`${users.gems} - ${item.gems}`,
              ownedBanners: sql`${users.ownedBanners} || ${json}::jsonb`,
              bannerTheme: itemId,
              updatedAt: new Date(),
            }
          : {
              gems: sql`${users.gems} - ${item.gems}`,
              ownedBackgrounds: sql`${users.ownedBackgrounds} || ${json}::jsonb`,
              bgTheme: itemId,
              updatedAt: new Date(),
            };

    const updated = await db
      .update(users)
      .set(patch)
      .where(
        and(
          eq(users.uid, caller.uid),
          sql`${users.gems} >= ${item.gems}`,
          sql`not (${item.ownedColumn} @> ${json}::jsonb)`
        )
      )
      .returning();

    if (updated.length === 0) return badRequest("Зоос хүрэлцэхгүй байна.");

    return NextResponse.json({ user: toPublicUser(updated[0]) });
  } catch (error) {
    return serverError(error, "Худалдан авалт хийхэд алдаа гарлаа");
  }
}
