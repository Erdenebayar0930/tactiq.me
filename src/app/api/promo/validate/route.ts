import { NextResponse } from "next/server";

import { badRequest, requireActiveUser, serverError } from "@/lib/api/auth";
import { isOwnPromoCode, resolvePromo } from "@/lib/api/promo";
import { rateLimit } from "@/lib/api/rateLimit";
import { isPlanId, PLANS } from "@/lib/billing";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Сурталчлагчийн кодыг ТӨЛӨХИЙН ӨМНӨ шалгана — хэрэглэгч хямдралаа
 * харчихаад QR руу орно.
 *
 * ⚠ Энэ нь ЗӨВХӨН УРЬДЧИЛСАН ХАРАГДАЦ. Жинхэнэ хямдралыг `checkout` route
 * дахин тооцно — клиент энд ирсэн дүнг хадгалаад дараа нь илгээх боломж
 * ОГТ байхгүй (`checkout` нь зөвхөн кодын текст авна).
 *
 * ⚠ ХУРДНЫ ХЯЗГААР ЗААВАЛ: код таах оролдлого (brute force) нь бусдын
 * кодыг олж, өөрийн худалдан авалтдаа ашиглах эсвэл шимтгэлийг нь хуурах
 * боломж нээнэ. Кодууд нь богино, таамаглахуйц (жишээ нь "BAYAR10") тул
 * хязгааргүй бол секундэд мянгаар шалгаж болно.
 */
export async function POST(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const limited = await rateLimit(request, {
    limit: 20,
    windowMs: 60_000,
    name: "promo-validate",
  });
  if (limited) return limited;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      code?: unknown;
      planId?: unknown;
    };

    const planId = body.planId;
    if (!isPlanId(planId)) return badRequest("Танихгүй багц.");
    if (typeof body.code !== "string") return badRequest("Код оруулна уу.");

    const promo = await resolvePromo(body.code, result.caller.uid, PLANS[planId].amountMnt);

    if (!promo) {
      /*
       * ⚠ "байхгүй код" ба "идэвхгүй код"-ыг ЯЛГАХГҮЙ: ялгавал код таагч
       * аль нь БОДИТ болохыг мэдэж авна.
       *
       * ⚠ ГЭХДЭЭ "ӨӨРИЙН КОД" гэдгийг ИЛ ХЭЛНЭ. Тэр нь нуух зүйл БИШ
       * (хэрэглэгч кодоо өөрөө эзэмшинэ) бөгөөс хэлэхгүй бол
       * сурталчлагч өөрийн кодоо туршаад «код ажиллахгүй байна» гэсэн
       * мухардалд ордог — бодитоор тохиолдсон.
       */
      const own = await isOwnPromoCode(body.code, result.caller.uid);
      return NextResponse.json(
        { valid: false, reason: own ? "own-code" : "unknown" },
        { status: 200 }
      );
    }

    return NextResponse.json({
      valid: true,
      code: promo.code,
      discountPercent: promo.discountPercent,
      amountMnt: promo.amountMnt,
      discountMnt: promo.discountMnt,
    });
  } catch (error) {
    return serverError(error, "Код шалгахад алдаа гарлаа");
  }
}
