import { NextResponse } from "next/server";

import { badRequest, forbidden, requireActiveUser, serverError } from "@/lib/api/auth";
import { findBySenderInvoiceNo, markPaid } from "@/lib/api/payments";
import { toPublicUser } from "@/lib/api/publicUser";
import { checkPayment, qpayConfigured } from "@/lib/api/qpay";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Нэхэмжлэл төлөгдсөн эсэхийг шалгана — клиент QR харуулж байхдаа poll хийнэ.
 *
 * ⚠ Webhook-ийг ХҮЛЭЭХГҮЙ байх шалтгаан: локал хөгжүүлэлт дээр QPay манай
 * `localhost` руу хүрч чадахгүй, продакшн дээр ч webhook саатах/алдагдах
 * боломжтой. Poll бол хэрэглэгчийн харж буй дэлгэцийн НАЙДВАРТАЙ зам.
 *
 * ⚠ Төлөгдсөн эсэхийг ЗӨВХӨН QPay хэлнэ (`checkPayment`). Клиент "төлсөн"
 * гэж мэдэгдэх ямар ч зам БАЙХГҮЙ.
 */
export async function GET(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const { caller } = result;

  try {
    const no = request.nextUrl.searchParams.get("no") ?? "";
    if (!no) return badRequest("Нэхэмжлэлийн дугаар алга.");

    const payment = await findBySenderInvoiceNo(no);
    if (!payment) return badRequest("Ийм нэхэмжлэл олдсонгүй.");

    // ⚠ ӨӨРИЙНХӨӨ төлбөрийг л асууж болно. Дугаар нь санамсаргүй боловч
    // эзэмшлийг шалгахгүй бол таамагласан дугаараар бусдын худалдан
    // авалтын дүн, багцыг харах боломжтой болно.
    if (payment.uid !== caller.uid) return forbidden("Энэ нэхэмжлэл танийх биш.");

    let paid = payment.status === "paid";

    if (!paid) {
      /*
       * ⚠ ТӨЛӨГДСӨН ГЭЖ ЗӨВХӨН QPAY ХЭЛНЭ. Баталгаажаагүй бол урсгал
       * АМЖИЛТГҮЙ — Premium олгогдохгүй.
       *
       * SANDBOX: QPay тохируулаагүй үед `checkPayment` ямагт `false`
       * буцаадаг тул mock нэхэмжлэл хэзээ ч дуусахгүй. Локал турших
       * зам нээлттэй байх ёстой ч тэр нь ГУРВАН нөхцөл ЗЭРЭГ биелж байж
       * ажиллана:
       *
       *   1. `QPAY_SANDBOX_AUTOPAY=true` гэж ИЛ асаасан байх
       *   2. QPay тохируулаагүй байх
       *   3. продакшн БИШ байх
       *
       * ⚠ (1)-ийг нэмсэн шалтгаан: өмнө нь тохиргоо дутуу орчин бүр
       * автоматаар «төлөгдсөн» болгодог байсан — өөрөөр хэлбэл QPay
       * түлхүүр нь орхигдсон staging дээр хэн ч үнэгүй Premium авах
       * боломжтой байв. Одоо тэр зам ИЛ шийдвэрээр л нээгдэнэ.
       */
      const sandboxAutoConfirm =
        process.env.QPAY_SANDBOX_AUTOPAY === "true" &&
        !qpayConfigured &&
        process.env.NODE_ENV !== "production" &&
        payment.invoiceId.startsWith("mock-");

      paid = sandboxAutoConfirm || (await checkPayment(payment.invoiceId));
      if (paid) await markPaid(payment.id);
    }

    // Төлөгдсөн бол ШИНЭЧЛЭГДСЭН хэрэглэгчийг хамт буцаана — клиент
    // тусад нь дахин татахгүйгээр Premium төлөвөө шууд шинэчилнэ.
    const [row] = paid
      ? await db.select().from(users).where(eq(users.uid, caller.uid)).limit(1)
      : [];

    return NextResponse.json({
      status: paid ? "paid" : "pending",
      user: row ? toPublicUser(row) : null,
      /*
       * Клиент нь «яагаад хүлээсэн хэвээр байна вэ» гэдгийг ойлгуулах
       * ёстой: QPay огт тохируулаагүй орчинд төлбөр ХЭЗЭЭ Ч
       * баталгаажихгүй тул хэрэглэгчийг дэмий хүлээлгэхгүй, шууд
       * амжилтгүй гэж хэлнэ.
       */
      qpayConfigured,
    });
  } catch (error) {
    return serverError(error, "Төлбөрийн төлөв шалгахад алдаа гарлаа");
  }
}
