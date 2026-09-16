import "server-only";

import { createInvoice } from "@/lib/api/qpay";
import { qpayConfigured } from "@/lib/api/qpay";

/**
 * ТӨЛБӨРИЙН СУВГУУДЫН НЭГДСЭН ХЭЛБЭР.
 *
 * ⚠ ЯАГААД АБСТРАКЦ ХЭРЭГТЭЙ ВЭ: QPay нь ЗӨВХӨН Монголын банкны аппаар
 * ажилладаг — гадаадын хэрэглэгч тэр QR-ыг уншуулах апп байхгүй. Гадаад
 * картын суваг нэмэхэд `checkout` route, төлбөрийн дэлгэц, webhook
 * гурвуулаа «QPay» гэж хатуу бичигдсэн байвал тус бүрийг нь салгах
 * шаардлагатай болно.
 *
 * ⚠ ХОЁР ӨӨР УРСГАЛ, НЭГ ХЭЛБЭР:
 *   • QPay      — QR + банкны аппын холбоос, хэрэглэгч манай хуудсанд
 *                 үлдэж, төлбөрөө шалгуулна.
 *   • Карт      — гуравдагч талын хуудас руу ШИЛЖИНЭ, буцаж ирнэ.
 * Тиймээс `checkout`-ийн хариу нь `kind` талбартай нэгдэл: дэлгэц нь
 * аль нь ирснийг харж шийднэ, суваг бүрд тусдаа route хэрэггүй.
 *
 * ⚠ ДҮН НЬ СЕРВЕР ТАЛД. Суваг бүр `PLANS`-аас уншсан дүнг хүлээж авна —
 * клиентээс дүн авбал хэрэглэгч DevTools-оор үнээ өөрөө тогтооно.
 */

export const PROVIDER_IDS = ["qpay", "card"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export type CheckoutRequest = {
  /** Манай талын дугаар — webhook үүгээр буцаж ирнэ. */
  senderInvoiceNo: string;
  /** Төгрөгийн дүн — дотоод бүртгэлийн НЭГ валют. */
  amountMnt: number;
  description: string;
  /** НӨАТ-ын баримтад — зөвхөн QPay-д хамаатай. */
  registerNo?: string;
};

export type CheckoutResult =
  | {
      kind: "qr";
      provider: ProviderId;
      invoiceId: string;
      qrText: string;
      qrImageBase64: string | null;
      shortUrl: string | null;
      bankLinks: { name: string; link: string; logo: string | null; description: string | null }[];
      /** Жинхэнэ QPay руу хандаагүй (түлхүүргүй) эсэх. */
      mock: boolean;
      sandbox: boolean;
      /** Цэнэглэсэн валют ба дүн — `payments` мөрд бичигдэнэ. */
      currency: string;
      chargedAmount: number;
    }
  | {
      kind: "redirect";
      provider: ProviderId;
      /** Хэрэглэгчийг илгээх хаяг. */
      url: string;
      /** Гуравдагч талын сесс/нэхэмжлэлийн дугаар. */
      invoiceId: string;
      currency: string;
      chargedAmount: number;
    };

export type PaymentProvider = {
  id: ProviderId;
  /** Дэлгэцэнд харуулах нэр. */
  label: string;
  /** Богино тайлбар — хэрэглэгч аль сувгийг сонгохоо ойлгоно. */
  hint: string;
  /**
   * Тохируулагдсан эсэх.
   *
   * ⚠ Тохируулаагүй сувгийг дэлгэцэнд ХАРУУЛАХГҮЙ. «Тун удахгүй» гэж
   * харуулбал хэрэглэгч дараад хоосон алдаанд унана — санал байхгүй нь
   * эвдэрсэн саналаас дээр.
   */
  configured: () => boolean;
  createCheckout: (request: CheckoutRequest) => Promise<CheckoutResult>;
};

/**
 * QPay — Монголын банкны аппуудын нэгдсэн QR.
 *
 * ⚠ Түлхүүргүй үед ч `configured` нь ҮНЭН: `createInvoice` нь хуурамч
 * нэхэмжлэл буцаадаг бөгөөд тэр нь локал турших зориулалттай
 * (`lib/api/qpay.ts`). Энэ сувгийг нуувал хөгжүүлэгч төлбөрийн урсгалыг
 * огт харж чадахгүй болно.
 */
const qpayProvider: PaymentProvider = {
  id: "qpay",
  label: "Монголын банк (QPay)",
  hint: "Банкны аппаар QR уншуулж төлнө.",
  configured: () => true,
  createCheckout: async (request) => {
    const invoice = await createInvoice({
      amountMnt: request.amountMnt,
      description: request.description,
      senderInvoiceNo: request.senderInvoiceNo,
      registerNo: request.registerNo,
    });

    return {
      kind: "qr",
      provider: "qpay",
      invoiceId: invoice.invoiceId,
      qrText: invoice.qrText,
      qrImageBase64: invoice.qrImageBase64,
      shortUrl: invoice.shortUrl,
      bankLinks: invoice.bankLinks,
      mock: invoice.mock,
      sandbox: invoice.sandbox,
      currency: "MNT",
      chargedAmount: request.amountMnt,
    };
  },
};

/**
 * ГАДААД КАРТ — хараахан ТОХИРУУЛААГҮЙ.
 *
 * ⚠ ХУУРАМЧ ХЭРЭГЖҮҮЛЭЛТ БИЧИХГҮЙ. Төлбөрийн сувгийг «дүр эсгэж»
 * ажиллуулбал хэрэглэгч төлсөн гэж бодоод эрх авахгүй, эсвэл эсрэгээр
 * төлөөгүй атлаа эрх авна. Тиймээс адаптер бодитоор бичигдэх хүртэл
 * `configured` нь ХУДАЛ бөгөөд суваг дэлгэцэнд огт гарахгүй.
 *
 * Адаптер бичихэд хэрэгтэй зүйл:
 *   1. Merchant данс (Paddle / Lemon Squeezy / 2Checkout — Stripe нь
 *      Монголд бүртгэлтэй байгууллагыг дэмждэггүй).
 *   2. `CARD_PROVIDER_*` env түлхүүрүүд.
 *   3. `createCheckout` → сесс үүсгээд `{ kind: "redirect", url }` буцаана.
 *   4. `/api/billing/webhook/<суваг>` → `markPaid(senderInvoiceNo)`.
 *   5. `PLANS`-ийн `amountUsdCents` (`lib/billing.ts`) — ханшийг
 *      ГҮЙЛГЭЭНИЙ ҮЕД тооцохгүй, урьдчилан тогтоосон үнэ хэрэглэнэ.
 */
const cardProvider: PaymentProvider = {
  id: "card",
  label: "Гадаад карт (Visa / Mastercard)",
  hint: "Олон улсын картаар төлнө.",
  configured: () => false,
  createCheckout: async () => {
    throw new Error("Гадаад картын суваг хараахан тохируулагдаагүй байна.");
  },
};

const PROVIDERS: Record<ProviderId, PaymentProvider> = {
  qpay: qpayProvider,
  card: cardProvider,
};

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && (PROVIDER_IDS as readonly string[]).includes(value);
}

export function providerById(id: ProviderId): PaymentProvider {
  return PROVIDERS[id];
}

/** Дэлгэцэнд санал болгох сувгууд — тохируулагдсан нь л. */
export function availableProviders(): { id: ProviderId; label: string; hint: string }[] {
  return PROVIDER_IDS.filter((id) => PROVIDERS[id].configured()).map((id) => ({
    id,
    label: PROVIDERS[id].label,
    hint: PROVIDERS[id].hint,
  }));
}

/** QPay нь тохируулагдсан эсэх — дэлгэцийн анхааруулгад. */
export { qpayConfigured };
