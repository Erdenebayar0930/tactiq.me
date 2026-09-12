import { NextResponse } from "next/server";

import { badRequest, notFound, requireAdmin, serverError } from "@/lib/api/auth";
import {
  createPromoCode,
  getPromoStats,
  listPromoCodes,
  recordPayout,
  setPromoActive,
} from "@/lib/api/promo";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { PROMO_COMMISSION_PERCENT, PROMO_DISCOUNT_PERCENT } from "@/lib/billing";
import { eq } from "drizzle-orm";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * СУРТАЛЧЛАГЧИЙН КОДЫГ УДИРДАХ — зөвхөн админ.
 *
 * ⚠ Хэрэглэгч өөртөө код үүсгэдэг байвал хоёр данс нээгээд хоорондоо
 * хямдрал/шимтгэлээ солилцох замаар 20% алдагдал үүсгэнэ. Тиймээс энэ
 * route бүхэлдээ `requireAdmin`-ий ард.
 */
export async function GET(request: NextRequest) {
  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  try {
    const codes = await listPromoCodes();

    /*
     * Код бүрийн эзний ҮЗҮҮЛЭЛТИЙГ хамт өгнө — админ хэнд хэдэн төгрөг
     * өгөх ёстойгоо НЭГ дэлгэцээс харах ёстой. Эзэн давхардвал ижил
     * тооцоо давтагдана; кодын тоо цөөн (хэдэн арав) тул энэ нь асуудал
     * биш, харин эзэн бүрээр бүлэглэх нь UI-г төвөгтэй болгоно.
     */
    const owners = [...new Set(codes.map((row) => row.ownerUid))];
    const stats = await Promise.all(
      owners.map(async (uid) => [uid, await getPromoStats(uid)] as const)
    );

    return NextResponse.json({
      codes,
      stats: Object.fromEntries(
        stats.map(([uid, value]) => [
          uid,
          {
            sales: value.sales,
            revenueMnt: value.revenueMnt,
            earnedMnt: value.earnedMnt,
            paidOutMnt: value.paidOutMnt,
            balanceMnt: value.balanceMnt,
          },
        ])
      ),
      defaults: {
        discountPercent: PROMO_DISCOUNT_PERCENT,
        commissionPercent: PROMO_COMMISSION_PERCENT,
      },
    });
  } catch (error) {
    return serverError(error, "Кодуудыг татахад алдаа гарлаа");
  }
}

/** Шинэ код үүсгэх, эсвэл олгосон төлбөр бүртгэх. */
export async function POST(request: NextRequest) {
  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    // --- Олгосон төлбөр бүртгэх ---
    if (body.action === "payout") {
      const promoterUid = typeof body.promoterUid === "string" ? body.promoterUid : "";
      const amountMnt = Math.round(Number(body.amountMnt));

      if (!promoterUid || !Number.isFinite(amountMnt)) {
        return badRequest("Сурталчлагч ба дүнг зөв оруулна уу.");
      }

      const ok = await recordPayout({
        promoterUid,
        amountMnt,
        note: typeof body.note === "string" ? body.note.slice(0, 200) : "",
        createdBy: result.caller.uid,
      });

      if (!ok) return badRequest("Дүн эерэг бүхэл тоо байх ёстой.");
      return NextResponse.json({ ok: true });
    }

    // --- Шинэ код ---
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body.code === "string" ? body.code : "";

    if (!email || !code) return badRequest("Имэйл ба кодыг оруулна уу.");

    const [owner] = await db
      .select({ uid: users.uid })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!owner) return notFound("Тухайн имэйлтэй хэрэглэгч олдсонгүй.");

    const created = await createPromoCode({
      code,
      ownerUid: owner.uid,
      discountPercent: Number(body.discountPercent ?? PROMO_DISCOUNT_PERCENT),
      commissionPercent: Number(body.commissionPercent ?? PROMO_COMMISSION_PERCENT),
      note: typeof body.note === "string" ? body.note.slice(0, 200) : "",
      createdBy: result.caller.uid,
    });

    if (!created) {
      return badRequest(
        "Код үүсгэж чадсангүй: код нь 4-24 тэмдэгт (үсэг, тоо, зураас), хувь нь 1-50 " +
          "байх ёстой бөгөөд ижил код аль хэдийн бүртгэгдсэн байж болзошгүй."
      );
    }

    return NextResponse.json({ code: created });
  } catch (error) {
    return serverError(error, "Код үүсгэхэд алдаа гарлаа");
  }
}

/** Кодыг идэвхжүүлэх / идэвхгүй болгох. */
export async function PATCH(request: NextRequest) {
  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      code?: unknown;
      active?: unknown;
    };

    if (typeof body.code !== "string" || typeof body.active !== "boolean") {
      return badRequest("Код ба төлөвийг зөв илгээнэ үү.");
    }

    const ok = await setPromoActive(body.code, body.active);
    if (!ok) return notFound("Код олдсонгүй.");

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error, "Кодын төлөв солиход алдаа гарлаа");
  }
}
