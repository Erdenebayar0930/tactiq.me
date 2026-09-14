import { NextResponse } from "next/server";

import { badRequest, forbidden, requireActiveUser, serverError } from "@/lib/api/auth";
import { createInvoice } from "@/lib/api/qpay";
import { attachInvoiceId, createPendingPayment } from "@/lib/api/payments";
import {
  isEbarimtType,
  isParentOnlyPlan,
  isPlanId,
  isValidRegisterNo,
  PLANS,
} from "@/lib/billing";
import { promoCommission, resolvePromo } from "@/lib/api/promo";
import { hasRole } from "@/lib/permissions";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Premium худалдан авалт эхлүүлнэ — QPay нэхэмжлэл үүсгээд QR буцаана.
 *
 * ⚠ Клиентээс ЗӨВХӨН `planId` авна. Дүн нь СЕРВЕР дээрх `PLANS`-аас л
 * уншигдана — эс бөгөөс хэрэглэгч дүнгээ өөрөө сонгоно.
 */
export async function POST(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const { caller } = result;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      planId?: unknown;
      promoCode?: unknown;
      ebarimtType?: unknown;
      registerNo?: unknown;
    };

    // `body` нь `any`/`unknown` тул `isPlanId`-ийн нарийсгалт ажиллахын тулд
    // утгыг ТУСДАА хувьсагчид гаргана.
    const planId = body.planId;
    if (!isPlanId(planId)) return badRequest("Танихгүй багц.");

    /**
     * ⚠ ЖИНХЭНЭ ХААЛТ ЭНД. Гэр бүлийн багцыг `/parent` цэснээс л санал
     * болгодог боловч клиентийн нуулт нь хамгаалалт БИШ — хэн ч энэ route
     * руу `planId: "family"` илгээж чадна. Сурагчийн данс тэр багцыг авбал
     * суудлаа хэнд ч өгч чадахгүй (холбоосыг зөвхөн эцэг эх үүсгэдэг) тул
     * мөнгө нь дэмий үрэгдэнэ.
     *
     * `hasRole` нь НЭМЭЛТ эрхийг ч хардаг — багш+эцэг эх хосолсон данс
     * (`secondaryRole`) энд хаагдахгүй.
     */
    if (isParentOnlyPlan(planId) && !hasRole(caller.user!, "parent")) {
      return forbidden(
        "Гэр бүлийн багцыг зөвхөн эцэг эхийн эрхтэй хэрэглэгч авна.",
        "family-parent-only"
      );
    }

    const plan = PLANS[planId];

    /**
     * СУРТАЛЧЛАГЧИЙН КОД (заавал биш).
     *
     * ⚠ Клиентээс ЗӨВХӨН кодын ТЕКСТ авна — хямдруулсан дүнг НЬ БИШ.
     * Хямдралыг сервер `resolvePromo` дотор дахин тооцно; клиент илгээсэн
     * ямар ч дүн үл тоомсорлогдоно.
     *
     * ⚠ Буруу/идэвхгүй/өөрийн код бол ТАТГАЛЗАХГҮЙ, зүгээр л хямдралгүй
     * үргэлжилнэ. Худалдан авалтыг таслах нь орлого алдах эрсдэл — харин
     * клиент нь кодыг УРЬДЧИЛЖ шалгадаг (`/api/promo/validate`) тул
     * хэрэглэгч гэнэтийн үнэ хардаггүй.
     */
    const promo =
      typeof body.promoCode === "string" && body.promoCode.trim() !== ""
        ? await resolvePromo(body.promoCode, caller.uid, plan.amountMnt)
        : null;

    const amountMnt = promo ? promo.amountMnt : plan.amountMnt;

    /**
     * НӨАТ-ын баримт.
     *
     * ⚠ Байгууллага сонгосон бол регистр ЗААВАЛ зөв байх ёстой — эс
     * бөгөөс баримт нь хэний ч нэр дээр гарахгүй бөгөөд хэрэглэгч
     * төлсний ДАРАА л мэдэх болно. Тиймээс нэхэмжлэл үүсэхийн ӨМНӨ
     * татгалзана: буруу регистртэй бол мөнгө авахаас өмнө зогсоох нь
     * буцаалт хийхээс хамаагүй хямд.
     */
    const ebarimtType = isEbarimtType(body.ebarimtType) ? body.ebarimtType : "citizen";
    const rawRegister = typeof body.registerNo === "string" ? body.registerNo.trim() : "";

    if (ebarimtType === "organization" && !isValidRegisterNo(rawRegister)) {
      return badRequest("Байгууллагын регистрийн дугаар 7 оронтой байх ёстой.");
    }

    // Хувь хүн сонгосон бол регистрийг ХАДГАЛАХГҮЙ — шаардлагагүй
    // хувийн мэдээллийг санд үлдээхгүй.
    const registerNo = ebarimtType === "organization" ? rawRegister : "";

    // Мөрийг нэхэмжлэлийн ӨМНӨ үүсгэнэ: `senderInvoiceNo` нь QPay-д
    // дамжуулах шаардлагатай бөгөөд webhook түүгээр буцаж ирнэ.
    const payment = await createPendingPayment({
      uid: caller.uid,
      planId,
      amountMnt,
      days: plan.days,
      promoCode: promo?.code ?? null,
      promoterUid: promo?.promoterUid ?? null,
      commissionMnt: promo ? promoCommission(promo) : 0,
      discountPercent: promo?.discountPercent ?? 0,
      ebarimtType,
      registerNo,
    });

    const invoice = await createInvoice({
      amountMnt,
      description: `Daamal.org — ${plan.label}`,
      senderInvoiceNo: payment.senderInvoiceNo,
      registerNo: registerNo || undefined,
    });

    await attachInvoiceId(payment.id, invoice.invoiceId);

    return NextResponse.json({
      senderInvoiceNo: payment.senderInvoiceNo,
      amountMnt,
      planLabel: plan.label,
      // Кодыг хэрэглэсэн эсэхийг клиентэд ил хэлнэ — нэхэмжлэлийн
      // дүн яагаад бага байгааг хэрэглэгч ойлгох ёстой.
      promoCode: promo?.code ?? null,
      discountMnt: promo?.discountMnt ?? 0,
      ebarimtType,
      registerNo,
      qrText: invoice.qrText,
      qrImageBase64: invoice.qrImageBase64,
      bankLinks: invoice.bankLinks,
      // Компьютер дээр аппын схем ажиллахгүй тул вэб хувилбар нь хэрэгтэй.
      shortUrl: invoice.shortUrl,
      sandbox: invoice.sandbox,
      mock: invoice.mock,
    });
  } catch (error) {
    return serverError(error, "Нэхэмжлэл үүсгэхэд алдаа гарлаа");
  }
}
