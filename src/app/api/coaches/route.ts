import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";

import { requireActiveUser, serverError } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { coachProfiles, users } from "@/lib/db/schema";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ДАСГАЛЖУУЛАГЧДЫН ЖАГСААЛТ — холбоо барих мэдээлэлтэй.
 *
 * ⚠ ЗӨВХӨН `visible = true` мөрүүд: анкет нь анхдагчаар НУУЦЛАГДСАН
 * (`drizzle/0050_coach_profiles.sql`). Багш «нийтэд харуул» гэж
 * дарсны дараа л утас, хаяг нь гарна.
 *
 * ⚠ НЭВТРЭЛТ ШААРДАНА: утасны дугаарын жагсаалт нээлттэй байвал
 * автомат хуулагч (scraper) багш нарын дугаарыг цуглуулна. Сурагч
 * нэвтэрсэн байх нь тэр хорыг бүрэн зогсоохгүй ч ил жагсаалт байхаас
 * хамаагүй дээр.
 *
 * ⚠ КЭШЛЭХГҮЙ: жагсаалт нь багш өөрөө анкет засах мөчид шинэчлэгдэх
 * ёстой. Багш өөрийн мэдээллээ засаад 60 секунд хуучин утга харвал
 * «хадгалагдсангүй» гэж бодож дахин дахин дарна.
 */
export async function GET(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  try {
    const rows = await db
      .select({
        uid: coachProfiles.userId,
        title: coachProfiles.title,
        bio: coachProfiles.bio,
        phone: coachProfiles.phone,
        email: coachProfiles.email,
        link: coachProfiles.link,
        address: coachProfiles.address,
        teachesChess: coachProfiles.teachesChess,
        teachesDraughts: coachProfiles.teachesDraughts,
        priceMnt: coachProfiles.priceMnt,
        displayName: users.displayName,
        photoUrl: users.photoUrl,
      })
      .from(coachProfiles)
      /*
       * ⚠ INNER JOIN нь эзэнгүй болсон анкетыг өөрөө хаяна (хаяг
       * устгагдсан), `status`-ын шалгалт нь хаагдсан хаягийг хаяна.
       */
      .innerJoin(users, eq(users.uid, coachProfiles.userId))
      .where(and(eq(coachProfiles.visible, true), eq(users.status, "active")))
      .orderBy(desc(coachProfiles.updatedAt))
      .limit(100);

    return NextResponse.json({ coaches: rows });
  } catch (error) {
    return serverError(error, "Дасгалжуулагчдын жагсаалт татахад алдаа гарлаа");
  }
}
