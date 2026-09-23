import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";

import { badRequest, notFound, requireAdmin, serverError } from "@/lib/api/auth";
import { isUploadUnder } from "@/lib/api/uploads";
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

/**
 * ХОЛБООС ЗААВАЛ https БАЙХ.
 *
 * ⚠ ЯАГААД: `mapUrl`, `link` хоёр нь лавлахын карт дээр
 * `<a href={...}>` болж рендерлэгдэнэ. React нь `href`-ийг
 * ЦЭВЭРЛЭДЭГГҮЙ — `javascript:` схем тавивал тэр холбоосыг
 * дарсан ХЭРЭГЛЭГЧИЙН хөтөч дээр код ажиллана.
 *
 * ⚠ Энэ нь АДМИН → СУПЕР ӐРХ ҮСЭХ зам: админ бол бүрэн
 * итгэлтэй түвшин БИШ (`requireSuper` тусдаа байдаг нь яг түүнд).
 *
 * ⚠ АХАН ДҮҮ ХИЙСЭН ДҮРЭМ: `api/admin/apps` ба `api/coaches/me` хоёулаа
 * яг ийм шалгалттай. Энэ файл дутуу байсан.
 *
 * @returns цэвэрлэгдсэн хаяг, хоосон ч болох; `null` бол ХОРИГЛОХ.
 */
function safeUrl(value: unknown, max: number, allowUpload = false): string | null {
  const raw = text(value, max);
  if (!raw) return "";
  /*
   * Зураг, лого нь манай серверт байршсан (`/api/uploads/training_centers/…`)
   * байж болно — харьцангуй хаяг тул `https:` шалгалтыг давахгүй.
   */
  if (allowUpload && isUploadUnder(raw, "training_centers")) return raw;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString().slice(0, max) : null;
  } catch {
    return null;
  }
}

const URL_FIELDS = ["photoUrl", "logoUrl", "mapUrl", "link"] as const;
/** Манай серверт байршуулсан зураг байж болох талбарууд. */
const UPLOAD_FIELDS = new Set<string>(["photoUrl", "logoUrl"]);

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

  const urls: Record<string, string> = {};
  for (const field of URL_FIELDS) {
    const value = safeUrl(body[field], LIMITS[field], UPLOAD_FIELDS.has(field));
    if (value === null) return badRequest("Холбоос https:// -ээр эхлэх ёстой.");
    urls[field] = value;
  }

  try {
    const [row] = await db
      .insert(trainingCenters)
      .values({
        name,
        description: text(body.description, 2000),
        photoUrl: urls.photoUrl,
        logoUrl: urls.logoUrl,
        city: text(body.city, LIMITS.city),
        address: text(body.address, LIMITS.address),
        mapUrl: urls.mapUrl,
        phone: text(body.phone, LIMITS.phone),
        email: text(body.email, LIMITS.email),
        link: urls.link,
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
  for (const field of URL_FIELDS) {
    if (!(field in body)) continue;
    const value = safeUrl(body[field], LIMITS[field], UPLOAD_FIELDS.has(field));
    if (value === null) return badRequest("Холбоос https:// -ээр эхлэх ёстой.");
    patch[field] = value;
  }
  if ("city" in body) patch.city = text(body.city, LIMITS.city);
  if ("address" in body) patch.address = text(body.address, LIMITS.address);
  if ("phone" in body) patch.phone = text(body.phone, LIMITS.phone);
  if ("email" in body) patch.email = text(body.email, LIMITS.email);
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
