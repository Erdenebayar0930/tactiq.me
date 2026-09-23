import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { badRequest, requireTeacher, serverError } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { coachProfiles } from "@/lib/db/schema";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * БАГШИЙН ӨӨРИЙН АНКЕТ — унших ба засах.
 *
 * ⚠ ЗӨВХӨН БАГШ (`requireTeacher`): сурагч өөрийгөө «дасгалжуулагч»
 * гэж нийтэд гаргах нь жагсаалтыг үнэ цэнгүй болгоно. Багш эрхийг
 * админ өгдөг тул энэ хил нь хяналтын цэг.
 *
 * ⚠ ӨӨРИЙН МӨРИЙГ Л засна — `uid` нь токеноос гардаг, биед ОРОХГҮЙ:
 * эс бөгөөс багш бусад багшийн холбоо барих мэдээллийг дарж бичих
 * боломжтой болно.
 */

/** Хоосон мөрийг `null` болгоно — «бичээгүй» гэдгийг санд ил үзүүлнэ. */
function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

/**
 * ⚠ ЗӨВХӨН https холбоос: `javascript:` схем нь анкетыг дарж жагсаалт
 * үзэж байгаа сурагчийн хөтөч дээр код ажиллуулах зам болно.
 */
function link(value: unknown): string | null {
  const raw = text(value, 300);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString().slice(0, 300) : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const result = await requireTeacher(request);
  if ("error" in result) return result.error;

  try {
    const [row] = await db
      .select()
      .from(coachProfiles)
      .where(eq(coachProfiles.userId, result.caller.uid))
      .limit(1);

    // ⚠ `null` нь АЛДАА БИШ: анкет хараахан бөглөөгүй гэсэн үг.
    return NextResponse.json({ profile: row ?? null });
  } catch (error) {
    return serverError(error, "Анкет татахад алдаа гарлаа");
  }
}

export async function PUT(request: NextRequest) {
  const result = await requireTeacher(request);
  if ("error" in result) return result.error;

  try {
    const body = await request.json().catch(() => null);

    /*
     * ⚠ БИЕ НЬ ОБЪЕКТ БИШ БОЛ ТАТГАЛЗАНА, чимээгүй ХООСОН
     * анкет бичихгүй. Урьд нь `catch(() => ({}))` байсан тул клиент
     * давхар stringify хийсэн цагаан толгой илгээхэд талбар бүр
     * `undefined` болж, багшийн бөглөсөн бүхэн АЛДАГДАЖ байв (бодитоор
     * тохиолдсон). Алдааг ЧИМЭЭТЭЙ болгов: дараагийн удаа
     * ийм алдаа гарвал өгөгдөл устахын оронд 400 буцна.
     */
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return badRequest("Анкетын өгөгдөл буруу ирлээ.");
    }

    const phone = text(body.phone, 32);
    const email = text(body.email, 190);
    const visible = body.visible === true;

    /*
     * ⚠ НИЙТЭД ГАРГАХАД ХОЛБОО БАРИХ ЗАМ ШААРДАНА: холбоо барих
     * боломжгүй анкет нь жагсаалтад зүгээр л хий орон зай эзэлнэ —
     * сурагч дарж, дуудах дугаар олдохгүй.
     */
    if (visible && !phone && !email) {
      return badRequest("Нийтэд харуулахын тулд утас эсвэл и-мэйл оруулна уу.");
    }

    const values = {
      title: text(body.title, 80),
      bio: text(body.bio, 2000),
      phone,
      email,
      link: link(body.link),
      address: text(body.address, 200),
      teachesChess: body.teachesChess === true,
      teachesDraughts: body.teachesDraughts === true,
      priceMnt:
        Number.isFinite(body.priceMnt) && Number(body.priceMnt) > 0
          ? Math.min(1_000_000, Math.round(Number(body.priceMnt)))
          : null,
      visible,
      updatedAt: new Date(),
    };

    /*
     * ⚠ UPSERT: анкет байхгүй үед хоёр өөр хүсэлт (хоёр таб) зэрэг
     * хадгалбал «аль хэдийн байна» гэсэн алдаа гарах ба багш өөрийн
     * бичсэнээ алдана.
     */
    const [row] = await db
      .insert(coachProfiles)
      .values({ userId: result.caller.uid, ...values })
      .onConflictDoUpdate({ target: coachProfiles.userId, set: values })
      .returning();

    return NextResponse.json({ profile: row });
  } catch (error) {
    return serverError(error, "Анкет хадгалахад алдаа гарлаа");
  }
}
