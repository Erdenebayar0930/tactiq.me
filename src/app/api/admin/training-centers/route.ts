import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";

import { badRequest, notFound, requireAdmin, serverError } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { trainingCenters } from "@/lib/db/schema";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * СУРГАЛТЫН ТӨВИЙГ УДИРДАХ — ЗӨВХӨН АДМИН.
 *
 * ⚠ ЯАГААД БАГШ ӨӨРӨӨ БИШ ВЭ: энэ жагсаалт нь хүүхэд, эцэг эхийг
 * БОДИТ ХАЯГ руу чиглүүлдэг. Хэн дуртай нь «сургалтын төв» гэж
 * бүртгүүлээд хаягаа тавьдаг бол хяналтгүй зар болно. Багшийн анкет
 * (`/api/coaches`) нь өөр — тэр нь ХУВЬ ХҮНИЙ холбоо барих мэдээлэл
 * бөгөөд багш өөрөө хариуцдаг.
 */

/** Талбарын хязгаар — санд орохоос ӨМНӨ таслана (схемтэй ижил). */
const LIMITS = {
  name: 120,
  photoUrl: 500,
  logoUrl: 500,
  city: 60,
  address: 200,
  mapUrl: 500,
  phone: 32,
  email: 190,
  link: 300,
} as const;

type Body = Record<string, unknown>;

/**
 * Бичвэр талбарыг цэвэрлэнэ.
 *
 * ⚠ `null`/`undefined` → `""`. Схем нь NULL зөвшөөрдөггүй (анхдагч `''`)
 * тул энд нэгтгэвэл доор нь шалгах газар бүрд `?? ""` бичих
 * шаардлагагүй болно.
 */
const text = (value: unknown, max: number): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const flag = (value: unknown): boolean => value === true;

/** Админы бүрэн жагсаалт — нуусан төвүүд ч орно. */
export async function GET(request: NextRequest) {
  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  try {
    const centers = await db
      .select()
      .from(trainingCenters)
      .orderBy(asc(trainingCenters.sortOrder), asc(trainingCenters.name));
    return NextResponse.json({ centers });
  } catch (error) {
    return serverError(error, "Сургалтын төвүүдийг татахад алдаа гарлаа");
  }
}

export async function POST(request: NextRequest) {
  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  const body = (await request.json().catch(() => ({}))) as Body;
  const name = text(body.name, LIMITS.name);
  if (name.length < 2) return badRequest("Нэр дор хаяж 2 тэмдэгт байх ёстой.");

  try {
    const [row] = await db
      .insert(trainingCenters)
      .values({
        name,
        description: text(body.description, 2000),
        photoUrl: text(body.photoUrl, LIMITS.photoUrl),
        logoUrl: text(body.logoUrl, LIMITS.logoUrl),
        city: text(body.city, LIMITS.city),
        address: text(body.address, LIMITS.address),
        mapUrl: text(body.mapUrl, LIMITS.mapUrl),
        phone: text(body.phone, LIMITS.phone),
        email: text(body.email, LIMITS.email),
        link: text(body.link, LIMITS.link),
        teachesChess: flag(body.teachesChess),
        teachesDraughts: flag(body.teachesDraughts),
        /*
         * ⚠ ШИНЭ ТӨВ НУУЦЛАГДСАН ТӨРНӨ. Админ мэдээллийг шалгаад
         * «нийтэд харуул» гэж зориуд дарна.
         */
        visible: false,
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
      })
      .returning();

    return NextResponse.json({ center: row });
  } catch (error) {
    return serverError(error, "Сургалтын төв үүсгэхэд алдаа гарлаа");
  }
}

export async function PATCH(request: NextRequest) {
  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  const body = (await request.json().catch(() => ({}))) as Body;
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return badRequest("Төвийн id дутуу байна.");

  /*
   * ⚠ ЗӨВХӨН ИРСЭН ТАЛБАРЫГ ЗАСНА. Бүхлээр нь дарж бичвэл зөвхөн
   * «харагдах» тугийг сольсон хүсэлт бусад талбарыг хоосон болгоно.
   */
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if ("name" in body) {
    const name = text(body.name, LIMITS.name);
    if (name.length < 2) return badRequest("Нэр дор хаяж 2 тэмдэгт байх ёстой.");
    patch.name = name;
  }
  if ("description" in body) patch.description = text(body.description, 2000);
  if ("photoUrl" in body) patch.photoUrl = text(body.photoUrl, LIMITS.photoUrl);
  if ("logoUrl" in body) patch.logoUrl = text(body.logoUrl, LIMITS.logoUrl);
  if ("city" in body) patch.city = text(body.city, LIMITS.city);
  if ("address" in body) patch.address = text(body.address, LIMITS.address);
  if ("mapUrl" in body) patch.mapUrl = text(body.mapUrl, LIMITS.mapUrl);
  if ("phone" in body) patch.phone = text(body.phone, LIMITS.phone);
  if ("email" in body) patch.email = text(body.email, LIMITS.email);
  if ("link" in body) patch.link = text(body.link, LIMITS.link);
  if ("teachesChess" in body) patch.teachesChess = flag(body.teachesChess);
  if ("teachesDraughts" in body) patch.teachesDraughts = flag(body.teachesDraughts);
  if ("visible" in body) patch.visible = flag(body.visible);
  if (typeof body.sortOrder === "number") patch.sortOrder = body.sortOrder;

  try {
    const [row] = await db
      .update(trainingCenters)
      .set(patch)
      .where(eq(trainingCenters.id, id))
      .returning();
    if (!row) return notFound("Сургалтын төв олдсонгүй.");
    return NextResponse.json({ center: row });
  } catch (error) {
    return serverError(error, "Сургалтын төв засахад алдаа гарлаа");
  }
}

export async function DELETE(request: NextRequest) {
  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return badRequest("Төвийн id дутуу байна.");

  try {
    const [row] = await db
      .delete(trainingCenters)
      .where(eq(trainingCenters.id, id))
      .returning({ id: trainingCenters.id });
    if (!row) return notFound("Сургалтын төв олдсонгүй.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error, "Сургалтын төв устгахад алдаа гарлаа");
  }
}
