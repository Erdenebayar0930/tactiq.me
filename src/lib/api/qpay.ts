import "server-only";

/**
 * QPay v2 (https://merchant.qpay.mn/v2) — Монголын банкны аппуудын БҮГДЭЭР
 * уншигдах нэг QR кодыг үүсгэдэг нэхэмжлэлийн систем.
 *
 * ⚠ SANDBOX ГОРИМ: `QPAY_CLIENT_ID`/`QPAY_CLIENT_SECRET`/`QPAY_INVOICE_CODE`
 * тохируулаагүй үед (`qpayConfigured === false`) жинхэнэ QPay рүү ОГТ
 * хандахгүй — `createInvoice` нь хуурамч (mock) нэхэмжлэл буцаана. Ингэснээр
 * жинхэнэ мерчадад бүртгүүлэхээс өмнө бүтэн урсгалыг (checkout → QR →
 * "төлөгдсөн") локал орчинд турших боломжтой. Жинхэнэ түлхүүрүүдээ
 * `.env.local`-руу оруулмагц кодыг ЗАСАХГҮЙГЭЭР шууд бодит горимд шилжинэ.
 */

const BASE_URL = process.env.QPAY_BASE_URL || "https://merchant.qpay.mn/v2";
const CLIENT_ID = process.env.QPAY_CLIENT_ID;
const CLIENT_SECRET = process.env.QPAY_CLIENT_SECRET;
const INVOICE_CODE = process.env.QPAY_INVOICE_CODE;

export const qpayConfigured = Boolean(CLIENT_ID && CLIENT_SECRET && INVOICE_CODE);

type CachedToken = { token: string; expiresAt: number };
const globalForQpay = globalThis as unknown as { __qpayToken?: CachedToken };

/** OAuth токеныг санах ойд кэшлэнэ — нэхэмжлэл бүрд дахин нэвтрэхгүй. */
async function getToken(): Promise<string> {
  const cached = globalForQpay.__qpayToken;
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${BASE_URL}/auth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}` },
  });

  if (!res.ok) {
    throw new Error(`QPay нэвтрэлт амжилтгүй боллоо (${res.status})`);
  }

  const data = (await res.json()) as { access_token: string; expires_in?: number };

  globalForQpay.__qpayToken = {
    token: data.access_token,
    // 60 секунд эрт сэлгэнэ — хүсэлт нислээр байх зуур токен дуусахаас сэргийлнэ
    expiresAt: Date.now() + (Number(data.expires_in ?? 3600) - 60) * 1000,
  };

  return globalForQpay.__qpayToken.token;
}

export type QpayInvoice = {
  invoiceId: string;
  qrText: string;
  qrImageBase64: string | null;
  /**
   * Банкны аппуудын deep link (QPay "urls" талбар).
   *
   * ⚠ `logo` нь QPay-ийн сервер дээрх ЖИЖИГ зураг — банкийг НЭРЭЭР нь
   * бус, ТЭМДГЭЭР нь таних нь хамаагүй хурдан. Байхгүй байж болно тул
   * дэлгэц нь `null`-ыг дүрсээр нөхөх ёстой.
   */
  bankLinks: { name: string; link: string; logo: string | null; description: string | null }[];
  /** `true` бол жинхэнэ QPay рүү ОГТ хандаагүй, зөвхөн локал турших зорилготой */
  mock: boolean;
};

/**
 * Нэг удаагийн нэхэмжлэл үүсгэнэ.
 *
 * `senderInvoiceNo` нь БИДНИЙ талын дугаар — QPay үүнийг webhook дотроо
 * буцааж илгээдэг тул мөрөө (`subscriptions`) хайхад ашиглана.
 */
export async function createInvoice(params: {
  amountMnt: number;
  description: string;
  senderInvoiceNo: string;
  /**
   * НӨАТ-ын баримтын хүлээн авагч — БАЙГУУЛЛАГА бол регистрийн дугаар.
   *
   * ⚠ Хувь хүнд ЮУ Ч дамжуулахгүй: QPay нь иргэний баримтыг төлбөр
   * хийсэн дансны эзэнтэй өөрөө холбодог. Хоосон `register` илгээвэл
   * зарим тохиолдолд нэхэмжлэл татгалзагддаг тул талбарыг БҮРМӨСӨН
   * орхино.
   */
  registerNo?: string;
}): Promise<QpayInvoice> {
  if (!qpayConfigured) {
    return {
      invoiceId: `mock-${params.senderInvoiceNo}`,
      qrText: `MOCK-QPAY-INVOICE:${params.senderInvoiceNo}:${params.amountMnt}`,
      qrImageBase64: null,
      bankLinks: [],
      mock: true,
    };
  }

  const token = await getToken();
  const callbackUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/billing/webhook/qpay?no=${encodeURIComponent(params.senderInvoiceNo)}`
    : undefined;

  const res = await fetch(`${BASE_URL}/invoice`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      invoice_code: INVOICE_CODE,
      sender_invoice_no: params.senderInvoiceNo,
      invoice_receiver_code: "terminal",
      invoice_description: params.description,
      amount: params.amountMnt,
      ...(callbackUrl ? { callback_url: callbackUrl } : {}),
      /*
       * ⚠ Байгууллагын НӨАТ. QPay v2-ийн `invoice_receiver_data.register`
       * талбар нь e-barimt-ыг байгууллагын нэр дээр гаргуулна.
       *
       * ⚠ Мерчант тус бүрийн тохиргооноос хамаарч талбарын нэр зөрж
       * болзошгүй — жинхэнэ орчинд эхний байгууллагын төлбөр дээр
       * баримт зөв гарсан эсэхийг ЗААВАЛ шалгаж хараарай. Регистрийг
       * бид өөрсдөө ч мөрд (`payments.registerNo`) хадгалдаг тул QPay
       * талд алдаа гарсан ч баримтыг гараар гаргах мэдээлэл бүрэн байна.
       */
      ...(params.registerNo
        ? { invoice_receiver_data: { register: params.registerNo } }
        : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(`QPay нэхэмжлэл үүсгэхэд алдаа гарлаа (${res.status})`);
  }

  const data = (await res.json()) as {
    invoice_id: string;
    qr_text: string;
    qr_image?: string;
    urls?: { name: string; link: string; logo?: string; description?: string }[];
  };

  return {
    invoiceId: data.invoice_id,
    qrText: data.qr_text,
    qrImageBase64: data.qr_image ?? null,
    bankLinks: Array.isArray(data.urls)
      ? data.urls.map((u) => ({
          name: u.name,
          link: u.link,
          logo: u.logo ?? null,
          description: u.description ?? null,
        }))
      : [],
    mock: false,
  };
}

/**
 * QPay-с "энэ нэхэмжлэл төлөгдсөн үү" гэдгийг ШУУД лавлана (webhook
 * ирэхийг хүлээхгүй, харин клиент poll хийхэд ашиглана — локал хөгжүүлэлт
 * дээр QPay-ийн webhook манай `localhost`-руу хүрч чадахгүй тул ЭНЭ л
 * найдвартай зам).
 */
export async function checkPayment(invoiceId: string): Promise<boolean> {
  if (!qpayConfigured || invoiceId.startsWith("mock-")) return false;

  const token = await getToken();
  const res = await fetch(`${BASE_URL}/payment/check`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ object_type: "INVOICE", object_id: invoiceId }),
  });

  if (!res.ok) return false;

  const data = (await res.json()) as { count?: number };
  return Number(data.count ?? 0) > 0;
}
