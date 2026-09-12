import { NextResponse } from "next/server";

import { requireActiveUser, serverError } from "@/lib/api/auth";
import { buyStreakFreeze, streakCalendar } from "@/lib/api/streak";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/learn/streak — дарааллын хуанли ба мөсний төлөв. */
export async function GET(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  try {
    return NextResponse.json(await streakCalendar(result.caller.uid));
  } catch (error) {
    return serverError(error, "Дарааллын мэдээлэл уншихад алдаа гарлаа");
  }
}

/**
 * POST /api/learn/streak — зоосоор нэг мөс худалдаж авна.
 *
 * ⚠ Биед ЮУ Ч авахгүй. Үнэ, хязгаар бүгд серверт (`lib/streakFreeze.ts`) —
 * клиентээс тоо хүлээж авбал хэрэглэгч DevTools-оор 0 зоосоор мөс авна.
 */
export async function POST(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  try {
    const outcome = await buyStreakFreeze(result.caller.uid);

    if (!outcome.ok) {
      const message =
        outcome.reason === "no-gems"
          ? "Зоос хүрэлцэхгүй байна."
          : outcome.reason === "full"
            ? "Мөсний сав дүүрсэн байна — эхлээд хэрэглээрэй."
            : "Мөс худалдаж авах хязгаарт хүрсэн байна.";

      return NextResponse.json(
        { error: message, code: outcome.reason },
        { status: 400 }
      );
    }

    return NextResponse.json({
      gems: outcome.gems,
      freezes: outcome.freezes,
    });
  } catch (error) {
    return serverError(error, "Мөс худалдаж авахад алдаа гарлаа");
  }
}
