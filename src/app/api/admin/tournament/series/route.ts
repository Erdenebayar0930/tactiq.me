import { NextResponse } from "next/server";

import { requireAdmin, serverError } from "@/lib/api/auth";
import {
  clearTournamentListCache,
  deleteSeries,
  listSeries,
  saveSeries,
  setSeriesActive,
  TournamentServerError,
} from "@/lib/api/tournamentServer";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ДАВТАМЖТАЙ ТЭМЦЭЭНИЙ СЕРИ — АДМИНЫ дамжуулагч.
 *
 * ⚠ Хөтөч тэмцээний сервер рүү ШУУД хандахгүй: нууц түлхүүр (
 * `TOURNAMENT_SHARED_SECRET`) хөтчид гарвал хэн ч тэмцээн үүсгэж,
 * устгаж чадна. Энэ route админ эрхийг шалгаад л дамжуулна.
 *
 * ⚠ АЛДААНЫ БИЧВЭРИЙГ хувиргахгүй: тэмцээний сервер «Эхлэх цаг: "HH:MM"
 * хэлбэртэй байх ёстой» гэж хэлдэг бөгөөд админ түүнийг харах ёстой.
 */
export async function GET(request: NextRequest) {
  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  try {
    return NextResponse.json({ series: await listSeries() });
  } catch (cause) {
    if (cause instanceof TournamentServerError) {
      return NextResponse.json({ error: cause.message }, { status: 503 });
    }
    return serverError(cause, "Серийн жагсаалт татахад алдаа гарлаа");
  }
}

export async function POST(request: NextRequest) {
  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  const body = await request.json().catch(() => ({}));

  try {
    await saveSeries(body);
    // Админ хадгалаад жагсаалтаа ТЭР ДАРУЙ харах ёстой.
    clearTournamentListCache();
    return NextResponse.json({ ok: true });
  } catch (cause) {
    if (cause instanceof TournamentServerError) {
      return NextResponse.json({ error: cause.message }, { status: 400 });
    }
    return serverError(cause, "Сери хадгалахад алдаа гарлаа");
  }
}

export async function PATCH(request: NextRequest) {
  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  const body = (await request.json().catch(() => ({}))) as { id?: unknown; active?: unknown };
  if (typeof body.id !== "string") {
    return NextResponse.json({ error: "id шаардлагатай." }, { status: 400 });
  }

  try {
    await setSeriesActive(body.id, Boolean(body.active));
    clearTournamentListCache();
    return NextResponse.json({ ok: true });
  } catch (cause) {
    if (cause instanceof TournamentServerError) {
      return NextResponse.json({ error: cause.message }, { status: 400 });
    }
    return serverError(cause, "Серийг өөрчлөхөд алдаа гарлаа");
  }
}

export async function DELETE(request: NextRequest) {
  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id шаардлагатай." }, { status: 400 });

  try {
    await deleteSeries(id);
    clearTournamentListCache();
    return NextResponse.json({ ok: true });
  } catch (cause) {
    if (cause instanceof TournamentServerError) {
      return NextResponse.json({ error: cause.message }, { status: 400 });
    }
    return serverError(cause, "Сери устгахад алдаа гарлаа");
  }
}
