import { NextResponse } from "next/server";

import { badRequest, forbidden, requireActiveUser, serverError } from "@/lib/api/auth";
import { isProviderId, providerById } from "@/lib/api/paymentProviders";
import { attachInvoiceId, createPendingPayment, setChargedAmount } from "@/lib/api/payments";
import {
  isEbarimtType,
  isParentOnlyPlan,
  isRetiredPlan,
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
      provider?: unknown;
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
    /*
     * ⚠ ЗАРАГДАХАА БОЛЬСОН багц — ШИНЭ нэхэмжлэл үүсгэхгүй.
     *
     * Дэлгэцэнд ч гарахгүй боловч клиент нь хамгаалалт БИШ: хуучин
     * хавчуурга, хуулсан холбоос (`?buy=family`) энэ route руу шууд
     * ирнэ. Аль хэдийн худалдаж авсан хүний эрх хөндөгдөхгүй — энэ нь
     * зөвхөн ШИНЭ худалдан авалтын хаалт.
     */
    if (isRetiredPlan(planId)) {
      return badRequest("Энэ багц зарагдахаа больсон.");
    }

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

    /*
     * ТӨЛБӨРИЙН СУВАГ. Заагаагүй бол QPay — хуучин клиент (кэшлэгдсэн
     * JS) суваг илгээхгүй тул тэднийг эвдэхгүй.
     *
     * ⚠ Тохируулаагүй сувгийг ТАТГАЛЗАНА: `providerById` нь мөрийг
     * буцаадаг ч `createCheckout` нь алдаа шиднэ. Урьдчилж шалгаснаар
     * хэрэглэгчид ойлгомжтой мессеж очно, мөн ХООСОН төлбөрийн мөр
     * үүсэхгүй.
     */
    const providerId = isProviderId(body.provider) ? body.provider : "qpay";
    const provider = providerById(providerId);

    if (!provider.configured()) {
      return badRequest("Энэ төлбөрийн суваг одоогоор боломжгүй байна.");
    }

    // Мөрийг нэхэмжлэлийн ӨМНӨ үүсгэнэ: `senderInvoiceNo` нь сувагт
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
      provider: providerId,
    });

    const checkout = await provider.createCheckout({
      amountMnt,
      description: `Daamal.org — ${plan.label}`,
      senderInvoiceNo: payment.senderInvoiceNo,
      registerNo: registerNo || undefined,
    });

    await attachInvoiceId(payment.id, checkout.invoiceId);
    await setChargedAmount(payment.id, checkout.currency, checkout.chargedAmount);

    /*
     * ⚠ ХАРИУ НЬ СУВГААС ХАМААРНА: QR суваг нь QR + банкны холбоос,
     * картын суваг нь ЗӨВХӨН шилжих хаяг буцаана. Дэлгэц `kind`-ээр
     * ялгаж зурна — нэг хэлбэрт шахвал картын хариунд утгагүй хоосон
     * талбарууд үлдэнэ.
     */
    const common = {
      senderInvoiceNo: payment.senderInvoiceNo,
      amountMnt,
      planLabel: plan.label,
      // Кодыг хэрэглэсэн эсэхийг клиентэд ил хэлнэ — нэхэмжлэлийн
      // дүн яагаад бага байгааг хэрэглэгч ойлгох ёстой.
      promoCode: promo?.code ?? null,
      discountMnt: promo?.discountMnt ?? 0,
      ebarimtType,
      registerNo,
      provider: providerId,
      currency: checkout.currency,
      chargedAmount: checkout.chargedAmount,
    };

    if (checkout.kind === "redirect") {
      return NextResponse.json({ ...common, kind: "redirect", url: checkout.url });
    }

    return NextResponse.json({
      ...common,
      kind: "qr",
      qrText: checkout.qrText,
      qrImageBase64: checkout.qrImageBase64,
      bankLinks: checkout.bankLinks,
      // Компьютер дээр аппын схем ажиллахгүй тул вэб хувилбар нь хэрэгтэй.
      shortUrl: checkout.shortUrl,
      sandbox: checkout.sandbox,
      mock: checkout.mock,
    });
  } catch (error) {
    return serverError(error, "Нэхэмжлэл үүсгэхэд алдаа гарлаа");
  }
}
