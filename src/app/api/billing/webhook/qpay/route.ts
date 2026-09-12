import { NextResponse } from "next/server";

import { findBySenderInvoiceNo, markPaid } from "@/lib/api/payments";
import { checkPayment } from "@/lib/api/qpay";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * QPay-ийн callback — `lib/api/qpay.ts`-ийн `createInvoice` энэ хаягийг
 * `callback_url` болгон бүртгүүлдэг.
 *
 * ⚠ CALLBACK-Т ИТГЭХГҮЙ. Энэ хаяг нь НЭЭЛТТЭЙ (QPay нэвтрэлтгүй дуудна)
 * тул хэн ч дуудаж чадна. Тиймээс "төлөгдсөн" гэсэн агуулгыг нь УНШИХГҮЙ —
 * зөвхөн "энэ дугаарыг дахин шалга" гэсэн ДОХИО гэж үзээд, төлбөрийг
 * QPay-ээс ӨӨРӨӨС нь (`checkPayment`) баталгаажуулна. Ингэснээр хуурамч
 * дуудлагаар үнэгүй Premium авах зам хаагдана.
 *
 * ⚠ 200 буцаана — алдаа гарсан ч. QPay нь 200 биш хариу авбал дахин дахин
 * оролдож, лог дүүргэнэ. Жинхэнэ баталгаа нь клиентийн poll (`/status`)
 * дээр ямар ч байсан давхар хийгддэг тул энд алдаа гарсан нь эцсийн биш.
 */
async function handle(request: NextRequest): Promise<NextResponse> {
  try {
    const no = request.nextUrl.searchParams.get("no") ?? "";
    if (!no) return NextResponse.json({ ok: true });

    const payment = await findBySenderInvoiceNo(no);
    if (!payment || payment.status === "paid") return NextResponse.json({ ok: true });

    if (await checkPayment(payment.invoiceId)) {
      await markPaid(payment.id);
    }
  } catch (error) {
    console.error("QPay webhook боловсруулахад алдаа гарлаа:", error);
  }

  return NextResponse.json({ ok: true });
}

// QPay нь тохиргооноос хамааран GET эсвэл POST-оор дууддаг — хоёуланг дэмжинэ.
export const GET = handle;
export const POST = handle;
