import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";

import { badRequest, notFound, requireAdmin, serverError } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { apps } from "@/lib/db/schema";
import { COLOR_KEYS } from "@/lib/tactiq/theme";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * «АПП» ЖАГСААЛТЫГ УДИРДАХ — ЗӨВХӨН АДМИН.
 *
 * ⚠ ЭНЭ ЖАГСААЛТ НЬ ХҮҮХДИЙГ ГАДНЫ САЙТ РУУ ХӨТӨЛНӨ. Хэн дуртай нь
 * бичдэг бол хортой хаяг тавих зам болно. Тиймээс `requireAdmin`-ий ард.
 *
 * ⚠ ЗӨВХӨН https: `javascript:` схем нь жагсаалт үзэж буй сурагчийн
 * хөтөч дээр код ажиллуулах зам болно (`api/coaches/me`-тэй ижил дүрэм).
 */

const LIMITS = { name: 80, description: 300, logoUrl: 500, url: 500 } as const;

/** `kind` нь нэвтрэлтийг шийддэг тул ХАТУУ жагсаалтаас. */
const KINDS = ["link", "tournament"] as const;

type Body = Record<string, unknown>;

const text = (value: unknown, max: number): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const flag = (value: unknown): boolean => value === true;

/**
 * ⚠ ХОЛБООС ЗААВАЛ https БАЙХ. Хоосон нь зөвшөөрөгдөнө: `tournament`
 * төрөл нь хаяг ашигладаггүй (тасалбар нь өөрөө хаягийг буцаана).
 */
function safeUrl(value: unknown): string | null {
  const raw = text(value, LIMITS.url);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString().slice(0, LIMITS.url) : null;
  } catch {
    return null;
  }
}

const kindOf = (value: unknown): string =>
  typeof value === "string" && (KINDS as readonly string[]).includes(value) ? value : "link";

const colorOf = (value: unknown): string =>
  typeof value === "string" && (COLOR_KEYS as readonly string[]).includes(value) ? value : "violet";

/** Админы бүрэн жагсаалт — нуусан аппууд ч орно. */
export async function GET(request: NextRequest) {
  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  try {
    const rows = await db.select().from(apps).orderBy(asc(apps.sortOrder), asc(apps.name));
    return NextResponse.json({ apps: rows });
  } catch (error) {
    return serverError(error, "Аппуудыг татахад алдаа гарлаа");
  }
}

export async function POST(request: NextRequest) {
  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body || typeof body !== "object") return badRequest("Өгөгдөл буруу ирлээ.");

  const name = text(body.name, LIMITS.name);
  if (name.length < 2) return badRequest("Нэр дор хаяж 2 тэмдэгт байх ёстой.");

  try {
    const [row] = await db
      .insert(apps)
      .values({
        name,
        description: text(body.description, LIMITS.description),
        logoUrl: text(body.logoUrl, LIMITS.logoUrl),
        url: safeUrl(body.url) ?? "",
        kind: kindOf(body.kind),
        color: colorOf(body.color),
        // ⚠ ШИНЭ АПП НУУЦЛАГДСАН ТӨРНӨ — админ шалгаад зориуд нээнэ.
        visible: false,
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
      })
      .returning();

    return NextResponse.json({ app: row });
  } catch (error) {
    return serverError(error, "Апп үүсгэхэд алдаа гарлаа");
  }
}

export async function PATCH(request: NextRequest) {
  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body || typeof body !== "object") return badRequest("Өгөгдөл буруу ирлээ.");

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return badRequest("Аппын id дутуу байна.");

  // ⚠ ЗӨВХӨН ИРСЭН ТАЛБАРЫГ ЗАСНА — эс бөгөөс «нуух» товч бусдыг цэвэрлэнэ.
  const patch: Record<string, unknown> = { updatedAt: new Date() };

  if ("name" in body) {
    const name = text(body.name, LIMITS.name);
    if (name.length < 2) return badRequest("Нэр дор хаяж 2 тэмдэгт байх ёстой.");
    patch.name = name;
  }
  if ("description" in body) patch.description = text(body.description, LIMITS.description);
  if ("logoUrl" in body) patch.logoUrl = text(body.logoUrl, LIMITS.logoUrl);
  if ("url" in body) {
    const url = safeUrl(body.url);
    if (url === null) return badRequest("Холбоос https:// -ээр эхлэх ёстой.");
    patch.url = url;
  }
  if ("kind" in body) patch.kind = kindOf(body.kind);
  if ("color" in body) patch.color = colorOf(body.color);
  if ("visible" in body) patch.visible = flag(body.visible);
  if (typeof body.sortOrder === "number") patch.sortOrder = body.sortOrder;

  try {
    const [row] = await db.update(apps).set(patch).where(eq(apps.id, id)).returning();
    if (!row) return notFound("Апп олдсонгүй.");
    return NextResponse.json({ app: row });
  } catch (error) {
    return serverError(error, "Апп засахад алдаа гарлаа");
  }
}

export async function DELETE(request: NextRequest) {
  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return badRequest("Аппын id дутуу байна.");

  try {
    const [row] = await db.delete(apps).where(eq(apps.id, id)).returning({ id: apps.id });
    if (!row) return notFound("Апп олдсонгүй.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error, "Апп устгахад алдаа гарлаа");
  }
}
