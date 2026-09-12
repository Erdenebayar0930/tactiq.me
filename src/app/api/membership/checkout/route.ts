import { NextResponse } from "next/server";

import { badRequest, forbidden, requireActiveUser, serverError } from "@/lib/api/auth";
import { attachInvoiceId, createPendingPayment } from "@/lib/api/payments";
import { createInvoice } from "@/lib/api/qpay";
import {
  activeMembershipTier,
  isMembershipTierId,
  MEMBERSHIP_TIERS,
  tierRank,
} from "@/lib/billing";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Тэмцээний гишүүнчлэл худалдан авах — QPay нэхэмжлэл үүсгээд QR буцаана.
 *
 * Төлөгдсөнийг `/api/billing/status` (poll) ба QPay webhook шалгана —
 * `markPaid` нь `payments.kind`-аар салаалж гишүүнчлэлийг сунгана.
 *
 * ⚠ Клиентээс ЗӨВХӨН `tierId` авна. Дүн нь `MEMBERSHIP_TIERS`-аас л уншигдана.
 */
export async function POST(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const { caller } = result;

  try {
    const body = (await request.json().catch(() => ({}))) as { tierId?: unknown };
    const tierId = body.tierId;
    if (!isMembershipTierId(tierId)) return badRequest("Танихгүй гишүүнчлэл.");

    /*
     * ⚠ ДООД түвшин рүү идэвхтэй байхад шилжүүлэхгүй: `extendMembership` нь
     * өөр түвшин авахад хугацааг ОДООНООС эхлүүлдэг тул Gold-ийн үлдсэн
     * хоногтой хүн Bronze авбал илүү үнэтэй эрхээ шатаана. Хугацаа нь
     * дууссаны дараа ямар ч түвшин авч болно.
     */
    const current = activeMembershipTier(
      caller.user?.tournamentTier,
      caller.user?.tournamentTierUntil
    );
    if (current && tierRank(tierId) < tierRank(current)) {
      return forbidden(
        "Идэвхтэй гишүүнчлэлээс доод түвшин рүү шилжих боломжгүй. Хугацаа дууссаны дараа сонгоно уу.",
        "membership-downgrade"
      );
    }

    const tier = MEMBERSHIP_TIERS[tierId];
    const planLabel = `${tier.label} гишүүнчлэл`;

    const payment = await createPendingPayment({
      uid: caller.uid,
      kind: "membership",
      planId: tierId,
      amountMnt: tier.amountMnt,
      days: tier.days,
    });

    const invoice = await createInvoice({
      amountMnt: tier.amountMnt,
      description: `Daamal.org — ${planLabel}`,
      senderInvoiceNo: payment.senderInvoiceNo,
    });

    await attachInvoiceId(payment.id, invoice.invoiceId);

    return NextResponse.json({
      senderInvoiceNo: payment.senderInvoiceNo,
      amountMnt: tier.amountMnt,
      planLabel,
      qrText: invoice.qrText,
      qrImageBase64: invoice.qrImageBase64,
      bankLinks: invoice.bankLinks,
      mock: invoice.mock,
    });
  } catch (error) {
    return serverError(error, "Нэхэмжлэл үүсгэхэд алдаа гарлаа");
  }
}
