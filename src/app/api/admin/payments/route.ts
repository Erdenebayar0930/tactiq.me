import { NextResponse } from "next/server";
import { desc, eq, gte, isNotNull, or, sql } from "drizzle-orm";

import { requireAdmin, serverError } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { payments, users } from "@/lib/db/schema";
import { APP_TIMEZONE } from "@/lib/tactiq/day";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Жагсаалтын дээд хэмжээ — хуудас хэт хүндрэхээс сэргийлнэ. */
const PAYMENT_LIMIT = 500;

/**
 * GET /api/admin/payments — ТӨЛБӨРИЙН ТАЙЛАН (зөвхөн админ).
 *
 * Гурван хэсэг:
 *   • `summary`     — нийт орлого, энэ сарын орлого, төлсөн хүний тоо,
 *                     идэвхтэй гишүүд, 7 хоногт дуусах гишүүд
 *   • `payments`    — сүүлийн төлбөрүүд (төлөгдсөн, хүлээгдэж буй, цуцлагдсан)
 *   • `subscribers` — эрхтэй (эсвэл эрх нь дууссан) хэрэглэгчид, ДУУСАХ
 *                     хугацаагаар эрэмбэлсэн
 *
 * ⚠ «Дуусах хугацаа» нь `users`-ийн `*_until` баганаас — төлбөрийн мөрөөс
 * тооцохгүй: урилгын урамшуулал, гэр бүлийн суудал, админы гар олголт зэрэг
 * төлбөргүй сунгалтууд зөвхөн тэнд л тусгагддаг.
 */
export async function GET(request: NextRequest) {
  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  try {
    const now = new Date();
    /*
     * ⚠ «Энэ сар» нь АППЫН цагийн бүсээр (Улаанбаатар), серверийнхээр БИШ —
     * сервер UTC дээр ажилладаг тул сарын эхний 8 цагийн төлбөр өмнөх
     * сард орчихно. `timestamp` баганууд UTC-ээр хадгалагддаг тул UTC руу
     * буцааж хөрвүүлнэ.
     */
    const monthStart = sql`(date_trunc('month', now() at time zone ${APP_TIMEZONE}) at time zone ${APP_TIMEZONE}) at time zone 'UTC'`;

    const [totals] = await db
      .select({
        paidCount: sql<number>`count(*) filter (where ${payments.status} = 'paid')::int`,
        pendingCount: sql<number>`count(*) filter (where ${payments.status} = 'pending')::int`,
        revenueMnt: sql<number>`coalesce(sum(${payments.amountMnt}) filter (where ${payments.status} = 'paid'), 0)::int`,
        monthRevenueMnt: sql<number>`coalesce(sum(${payments.amountMnt}) filter (where ${payments.status} = 'paid' and ${payments.paidAt} >= ${monthStart}), 0)::int`,
        payerCount: sql<number>`count(distinct ${payments.uid}) filter (where ${payments.status} = 'paid')::int`,
      })
      .from(payments);

    const byPlan = await db
      .select({
        kind: payments.kind,
        planId: payments.planId,
        count: sql<number>`count(*)::int`,
        amountMnt: sql<number>`coalesce(sum(${payments.amountMnt}), 0)::int`,
      })
      .from(payments)
      .where(eq(payments.status, "paid"))
      .groupBy(payments.kind, payments.planId)
      .orderBy(desc(sql`sum(${payments.amountMnt})`));

    const paymentRows = await db
      .select({
        id: payments.id,
        uid: payments.uid,
        email: users.email,
        displayName: users.displayName,
        kind: payments.kind,
        planId: payments.planId,
        amountMnt: payments.amountMnt,
        status: payments.status,
        provider: payments.provider,
        days: payments.days,
        promoCode: payments.promoCode,
        ebarimtType: payments.ebarimtType,
        registerNo: payments.registerNo,
        senderInvoiceNo: payments.senderInvoiceNo,
        paidAt: payments.paidAt,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .leftJoin(users, eq(users.uid, payments.uid))
      .orderBy(desc(payments.createdAt))
      .limit(PAYMENT_LIMIT);

    /*
     * Хэзээ нэгэн цагт эрх авсан БҮХ хэрэглэгч — дууссан нь ч орно: админ
     * «хэн сунгаагүй вэ» гэдгийг харах ёстой.
     */
    const subscriberRows = await db
      .select({
        uid: users.uid,
        email: users.email,
        displayName: users.displayName,
        premiumUntil: users.premiumUntil,
        familyUntil: users.familyUntil,
        tournamentTier: users.tournamentTier,
        tournamentTierUntil: users.tournamentTierUntil,
        paidTotalMnt: sql<number>`coalesce((select sum(p.amount_mnt) from ${payments} p where p.uid = ${users.uid} and p.status = 'paid'), 0)::int`,
        paidCount: sql<number>`(select count(*) from ${payments} p where p.uid = ${users.uid} and p.status = 'paid')::int`,
        lastPaidAt: sql<Date | null>`(select max(p.paid_at) from ${payments} p where p.uid = ${users.uid} and p.status = 'paid')`,
      })
      .from(users)
      .where(
        or(
          isNotNull(users.premiumUntil),
          isNotNull(users.familyUntil),
          isNotNull(users.tournamentTierUntil)
        )
      );

    const subscribers = subscriberRows
      .map((row) => {
        /*
         * Хамгийн ОРОЙ дуусах эрх нь «дуусах хугацаа» — хэрэглэгч аль нэгээр
         * нь эрхтэй л бол идэвхтэй гэж үзнэ.
         */
        const dates = [row.premiumUntil, row.familyUntil, row.tournamentTierUntil].filter(
          (value): value is Date => value instanceof Date
        );
        const until = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
        return {
          ...row,
          lastPaidAt: row.lastPaidAt ? new Date(row.lastPaidAt) : null,
          until,
          active: !!until && until > now,
        };
      })
      // Идэвхтэй нь эхэнд, дотроо ойрхон дуусах нь дээр; дууссан нь сүүлд.
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        const x = a.until?.getTime() ?? 0;
        const y = b.until?.getTime() ?? 0;
        return a.active ? x - y : y - x;
      });

    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const [registered] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(gte(users.createdAt, monthStart));

    return NextResponse.json({
      summary: {
        ...totals,
        activeCount: subscribers.filter((row) => row.active).length,
        expiringSoonCount: subscribers.filter(
          (row) => row.active && row.until && row.until <= weekAhead
        ).length,
        monthRegisteredCount: registered?.count ?? 0,
      },
      byPlan,
      payments: paymentRows,
      paymentLimit: PAYMENT_LIMIT,
      subscribers,
    });
  } catch (error) {
    return serverError(error, "Төлбөрийн тайлан татахад алдаа гарлаа");
  }
}
