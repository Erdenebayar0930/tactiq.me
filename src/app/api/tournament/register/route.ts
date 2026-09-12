import { NextResponse } from "next/server";

import { badRequest, requireActiveUser, serverError } from "@/lib/api/auth";
import { attachInvoiceId, createPendingPayment } from "@/lib/api/payments";
import { createInvoice } from "@/lib/api/qpay";
import { rateLimit } from "@/lib/api/rateLimit";
import { claimFreeEntry, findEntry, syncEntry } from "@/lib/api/tournamentEntries";
import { getTournament } from "@/lib/api/tournamentServer";
import { TOURNAMENT_ENTRY_PLAN_ID } from "@/lib/billing";
import { tournamentEnabled } from "@/lib/tactiq/tournament";

import type { NextRequest } from "next/server";
import type { RemoteTournament } from "@/lib/api/tournamentServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOURNAMENT_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * ТЭМЦЭЭНД БҮРТГҮҮЛЭХ.
 *
 * Шийдвэрийн дараалал:
 *   1. аль хэдийн бүртгэгдсэн        → { status: "registered" }
 *   2. тэмцээн үнэгүй (`entryFeeMnt` 0) → шууд бүртгэнэ
 *   3. гишүүнчлэлийн сарын квот үлдсэн → шууд бүртгэнэ (квот хасагдана)
 *   4. эс бөгөөс                       → QPay нэхэмжлэл { status: "payment", checkout }
 *
 * ⚠ Үнэ, суудал, төлвийг ТЭМЦЭЭНИЙ СЕРВЕРЭЭС КЭШГҮЙ уншина — клиентээс
 * ирсэн ямар ч дүнд итгэхгүй.
 */
export async function POST(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const limited = await rateLimit(request, {
    name: "tournament-register",
    limit: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  if (!tournamentEnabled()) {
    return NextResponse.json(
      { error: "Тэмцээний систем идэвхгүй байна.", code: "tournament-disabled" },
      { status: 503 }
    );
  }

  const { caller } = result;

  try {
    const body = (await request.json().catch(() => ({}))) as { tournamentId?: unknown };
    const tournamentId = typeof body.tournamentId === "string" ? body.tournamentId.trim() : "";
    if (!TOURNAMENT_ID_RE.test(tournamentId)) return badRequest("Тэмцээний дугаар буруу.");

    let tournament: RemoteTournament | null;
    try {
      tournament = await getTournament(tournamentId);
    } catch (cause) {
      console.error("[tournament] тэмцээн татаж чадсангүй", cause);
      return NextResponse.json(
        { error: "Тэмцээний сервертэй холбогдож чадсангүй. Түр хүлээгээд дахин оролдоно уу.", code: "tournament-unavailable" },
        { status: 503 }
      );
    }

    if (!tournament) {
      return NextResponse.json({ error: "Тэмцээн олдсонгүй.", code: "not-found" }, { status: 404 });
    }

    const existing = await findEntry(caller.uid, tournamentId);
    if (existing) {
      if (!existing.syncedAt) await syncEntry(existing.id);
      return NextResponse.json({ status: "registered" });
    }

    if (tournament.status !== "upcoming") return badRequest("Энэ тэмцээний бүртгэл хаагдсан.");

    if (tournament.seats !== null && tournament.registered >= tournament.seats) {
      return NextResponse.json(
        { error: "Тэмцээний суудал дүүрсэн.", code: "tournament-full" },
        { status: 409 }
      );
    }

    const claim = await claimFreeEntry(caller.uid, tournamentId, tournament.entryFeeMnt === 0);

    if (claim.result !== "needs-payment") {
      if (claim.entryId) await syncEntry(claim.entryId);
      return NextResponse.json({ status: "registered" });
    }

    const planLabel = `${tournament.name} — оролцох төлбөр`;

    const payment = await createPendingPayment({
      uid: caller.uid,
      kind: "tournament",
      planId: TOURNAMENT_ENTRY_PLAN_ID,
      ref: tournamentId,
      amountMnt: tournament.entryFeeMnt,
      days: 0,
    });

    const invoice = await createInvoice({
      amountMnt: tournament.entryFeeMnt,
      description: `Daamal.org — ${planLabel}`.slice(0, 255),
      senderInvoiceNo: payment.senderInvoiceNo,
    });

    await attachInvoiceId(payment.id, invoice.invoiceId);

    return NextResponse.json({
      status: "payment",
      checkout: {
        senderInvoiceNo: payment.senderInvoiceNo,
        amountMnt: tournament.entryFeeMnt,
        planLabel,
        qrText: invoice.qrText,
        qrImageBase64: invoice.qrImageBase64,
        bankLinks: invoice.bankLinks,
        mock: invoice.mock,
      },
    });
  } catch (error) {
    return serverError(error, "Тэмцээнд бүртгүүлэхэд алдаа гарлаа.");
  }
}
