import { NextResponse } from "next/server";

import { requireAdmin, serverError } from "@/lib/api/auth";
import {
  clearTournamentListCache,
  deleteTournament,
  listAllTournaments,
  saveTournament,
  TournamentServerError,
} from "@/lib/api/tournamentServer";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ТЭМЦЭЭНИЙ ТОВ (нэг удаагийн) — АДМИНЫ дамжуулагч.
 *
 * «Тов» гэдэг нь тодорхой өдөр, тодорхой цагт болох тэмцээн. Олон
 * хоногийн дараах ч байж болно; давтамжтай бол СЕРИ хэрэглэнэ
 * (`../series`).
 */
export async function GET(request: NextRequest) {
  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  try {
    return NextResponse.json({ tournaments: await listAllTournaments() });
  } catch (cause) {
    if (cause instanceof TournamentServerError) {
      return NextResponse.json({ error: cause.message }, { status: 503 });
    }
    return serverError(cause, "Тэмцээний жагсаалт татахад алдаа гарлаа");
  }
}

export async function POST(request: NextRequest) {
  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  const body = await request.json().catch(() => ({}));

  try {
    await saveTournament(body);
    clearTournamentListCache();
    return NextResponse.json({ ok: true });
  } catch (cause) {
    if (cause instanceof TournamentServerError) {
      return NextResponse.json({ error: cause.message }, { status: 400 });
    }
    return serverError(cause, "Тов хадгалахад алдаа гарлаа");
  }
}

export async function DELETE(request: NextRequest) {
  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id шаардлагатай." }, { status: 400 });

  try {
    await deleteTournament(id);
    clearTournamentListCache();
    return NextResponse.json({ ok: true });
  } catch (cause) {
    if (cause instanceof TournamentServerError) {
      return NextResponse.json({ error: cause.message }, { status: 400 });
    }
    return serverError(cause, "Тов цуцлахад алдаа гарлаа");
  }
}
