import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { getRedis } from "@/lib/redis";

/**
 * ТЭМЦЭЭНИЙ ТАСАЛБАР — хоёр серверийн хооронд хэрэглэгчийг дамжуулах.
 *
 * Урсгал:
 *   1. Сурагч энд «Тэмцээн» дарна → `/api/tournament/session` тасалбар өгнө.
 *   2. Хөтөч `chess.daamal.org/...?ticket=…` руу шилжинэ.
 *   3. Тэмцээний СЕРВЕР (хөтөч БИШ) `/api/tournament/exchange` рүү нууц
 *      түлхүүртэйгээ залгаж, тасалбарыг Firebase custom token болгон солино.
 *
 * ⚠ Тасалбар нь URL-д ил явдаг тул түүнийг ӨӨРӨӨ нэвтрэлт гэж үзэхгүй:
 * тэр нь зөвхөн «энэ хүнийг солих эрх». Жинхэнэ токеныг ЗӨВХӨН нууц
 * түлхүүр мэдэх сервер, server-to-server сувгаар авна. Ингэснээр URL нь
 * түүх, Referer, лог руу нэвдэрсэн ч дангаараа хэрэггүй.
 *
 * ⚠ ХУГАЦАА МАШ БОГИНО (90 сек): тасалбар нь зөвхөн шилжилтийн хэдэн
 * секундыг л давах ёстой. Урт бол хуулбарлагдсан холбоос удаан аюултай.
 *
 * ⚠ Redis БАЙХ ШААРДЛАГАГҮЙ: тасалбар нь HMAC-аар гарын үсэг зурагдсан
 * (stateless) тул PM2 cluster-ийн аль ч instance шалгаж чадна. Redis
 * байгаа бол НЭМЭЛТЭЭР нэг удаагийн хэрэглээг баталгаажуулна (`jti`).
 * Redis-гүй бол дахин ашиглалт 90 секундын дотор БОЛОМЖТОЙ — тиймээс
 * cluster дээр Redis-ийг зөвлөнө.
 */
const TICKET_TTL_MS = 90_000;

export type TicketPayload = {
  /** Firebase uid — хоёр систем дээр ИЖИЛ таних тэмдэг */
  uid: string;
  email: string;
  /** Нэг удаагийн дугаар — дахин ашиглалт таслахад */
  jti: string;
  /** Дуусах мөч (мс, epoch) */
  exp: number;
};

function secret(): string {
  return process.env.TOURNAMENT_SHARED_SECRET?.trim() || "";
}

export function tournamentSecretConfigured(): boolean {
  return secret().length >= 32;
}

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString("base64url");

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

/** Тасалбар үүсгэх. Нууц түлхүүр тохируулаагүй бол `null`. */
export function createTicket(uid: string, email: string): string | null {
  if (!tournamentSecretConfigured()) return null;

  const payload: TicketPayload = {
    uid,
    email,
    jti: randomUUID(),
    exp: Date.now() + TICKET_TTL_MS,
  };

  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export type TicketError = "malformed" | "bad-signature" | "expired" | "used";

/**
 * Тасалбарыг шалгаж, агуулгыг нь буцаана.
 *
 * ⚠ Гарын үсгийг `timingSafeEqual`-аар харьцуулна — `===` нь эхний зөрөх
 * тэмдэгт дээр шууд зогсдог тул хариу ирэх ХУГАЦААГААР нь гарын үсгийг
 * тэмдэгт тэмдэгтээр таах боломж үлдээдэг.
 */
export async function consumeTicket(
  raw: string
): Promise<{ payload: TicketPayload } | { error: TicketError }> {
  const [body, signature] = raw.split(".");
  if (!body || !signature) return { error: "malformed" };

  const expected = Buffer.from(sign(body));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { error: "bad-signature" };
  }

  let payload: TicketPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return { error: "malformed" };
  }

  if (
    typeof payload?.uid !== "string" ||
    typeof payload?.jti !== "string" ||
    typeof payload?.exp !== "number"
  ) {
    return { error: "malformed" };
  }

  if (payload.exp <= Date.now()) return { error: "expired" };

  /*
   * НЭГ УДААГИЙН ХЭРЭГЛЭЭ — Redis байгаа үед.
   * `SET … NX` нь атомик: хоёр хүсэлт ЗЭРЭГ ирвэл зөвхөн нэг нь `OK` авна.
   * Redis унасан ч шилжилт бүтэлгүйтэх ёсгүй тул алдааг залгина.
   */
  const redis = getRedis();
  if (redis) {
    try {
      const ok = await redis.set(
        `tournament:ticket:${payload.jti}`,
        "1",
        "PX",
        Math.max(1, payload.exp - Date.now()),
        "NX"
      );
      if (ok !== "OK") return { error: "used" };
    } catch {
      // Redis хүрэхгүй байна — гарын үсэг ба хугацаа хэвээр хамгаална.
    }
  }

  return { payload };
}
