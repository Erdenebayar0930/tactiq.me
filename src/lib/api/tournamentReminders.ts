import "server-only";

import { and, inArray, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { pushTokens, tournamentEntries } from "@/lib/db/schema";
import { adminMessaging } from "@/lib/firebaseAdmin";
import { listUpcomingTournaments } from "@/lib/api/tournamentServer";

/**
 * ТЭМЦЭЭН ЭХЛЭХИЙН 10 МИНУТЫН ӨМНӨХ МЭДЭГДЭЛ.
 *
 * ⚠ ЯАГААД 10 МИНУТ: сурагч гар утсаа авч, апп нээж, хөлөг ачаалах
 * хугацаа. 1 минут бол хоцорно, 30 минут бол мартана.
 *
 * ⚠ ЯАГААД CRON ХЭРЭГТЭЙ ВЭ: энэ аппын бусад тооцоо (лиг, гишүүнчлэл)
 * нь «хэрэглэгч эргэж ирэхэд тооцно» гэсэн зарчимтай тул cron огт
 * байхгүй. Гэвч мэдэгдэл нь эсрэгээрээ — хэрэглэгч ИРЭЭГҮЙ байхад
 * ажиллах ёстой. Тиймээс энэ ганц ажил гадны хуваарьтай
 * (`/api/cron/tournament-reminders`).
 *
 * ⚠ ДАВХАР ИЛГЭЭХГҮЙ: илгээгч минут тутам ажиллана; `reminderSentAt`
 * тэмдэглэхгүй бол сурагч 10 минутын цонхонд 10 удаа мэдэгдэл авч,
 * мэдэгдлийг бүрмөсөн унтраана.
 */

/** Хэдэн минутын өмнө сануулах вэ. */
export const REMINDER_LEAD_MIN = 10;

/**
 * Цонхны ӨРГӨН.
 *
 * ⚠ Яг «10 минут» гэж шалгаж БОЛОХГҮЙ: cron нь секунд сэкундээр таарч
 * ажилладаггүй (ачаалал, хоцролт). Цонх байхгүй бол нэг минут алгасахад
 * тэр тэмцээний мэдэгдэл ОГТ явахгүй. Өргөн цонх + `reminderSentAt`
 * хоёр нь «алгасахгүй, давхардахгүй» -г хамтдаа баталгаажуулна.
 */
const WINDOW_MIN = 4;

export type ReminderResult = {
  /**
   * ⚠ ОНОШИЛГОО: энэ ажил ХЯНАГЧГҮЙ (хүн харахгүй) ажилладаг тул
   * «юу ч илгээгдээгүй» гэсэн хариу нь «тэмцээн байсангүй» гэсэн үү,
   * эсвэл «жагсаалт татагдсангүй» гэсэн үү гэдгийг ялгах ёстой.
   */
  window: { from: string; to: string };
  /** Жагсаалтаас ирсэн БҮХ тэмцээний тоо (цонхоор шүүхээс өмнө). */
  listed: number;
  tournaments: number;
  users: number;
  sent: number;
  /** Устсан төхөөрөмжийн токен — цэвэрлэгдсэн тоо. */
  pruned: number;
};

export async function sendTournamentReminders(now = new Date()): Promise<ReminderResult> {
  const from = new Date(now.getTime() + (REMINDER_LEAD_MIN - WINDOW_MIN) * 60_000);
  const to = new Date(now.getTime() + REMINDER_LEAD_MIN * 60_000);

  const all = await listUpcomingTournaments();
  const upcoming = all.filter((tournament) => {
    const at = new Date(tournament.startsAt).getTime();
    return at >= from.getTime() && at <= to.getTime();
  });

  const window = { from: from.toISOString(), to: to.toISOString() };

  if (upcoming.length === 0) {
    return { window, listed: all.length, tournaments: 0, users: 0, sent: 0, pruned: 0 };
  }

  const entries = await db
    .select({
      id: tournamentEntries.id,
      uid: tournamentEntries.uid,
      tournamentId: tournamentEntries.tournamentId,
    })
    .from(tournamentEntries)
    .where(
      and(
        inArray(
          tournamentEntries.tournamentId,
          upcoming.map((tournament) => tournament.id)
        ),
        // ⚠ Зөвхөн ИЛГЭЭГЭЭГҮЙ бүртгэл.
        isNull(tournamentEntries.reminderSentAt)
      )
    );

  if (entries.length === 0) {
    return { window, listed: all.length, tournaments: upcoming.length, users: 0, sent: 0, pruned: 0 };
  }

  const tokens = await db
    .select({ id: pushTokens.id, uid: pushTokens.uid, token: pushTokens.token })
    .from(pushTokens)
    .where(
      inArray(
        pushTokens.uid,
        entries.map((entry) => entry.uid)
      )
    );

  const byUid = new Map<string, { id: string; token: string }[]>();
  for (const row of tokens) {
    const list = byUid.get(row.uid);
    if (list) list.push(row);
    else byUid.set(row.uid, [row]);
  }

  const nameById = new Map(upcoming.map((tournament) => [tournament.id, tournament.name]));

  let sent = 0;
  let pruned = 0;
  const dead: string[] = [];
  const done: string[] = [];

  for (const entry of entries) {
    const devices = byUid.get(entry.uid) ?? [];

    /*
     * ⚠ ТӨХӨӨРӨМЖГҮЙ хүнийг ч «илгээсэн» гэж тэмдэглэнэ: тэр хүн
     * мэдэгдэл огт асаагаагүй бөгөөд минут тутам түүнийг дахин дахин
     * шалгах нь дэмий ажил. Дараагийн тэмцээнд шинэ бүртгэл үүснэ.
     */
    done.push(entry.id);
    if (devices.length === 0) continue;

    const name = nameById.get(entry.tournamentId) ?? "Тэмцээн";

    for (const device of devices) {
      try {
        await adminMessaging().send({
          token: device.token,
          notification: {
            title: `${name} — ${REMINDER_LEAD_MIN} минутын дараа`,
            body: "Тэмцээн эхлэх гэж байна. Апп-аа нээгээд бэлдээрэй!",
          },
          /*
           * ⚠ `data.url` — мэдэгдэл дээр дарахад ХААШАА очих вэ.
           * Service worker үүнийг уншиж цонх нээнэ
           * (`public/firebase-messaging-sw.js`).
           */
          data: { url: "/apps" },
          webpush: {
            fcmOptions: { link: "/apps" },
            notification: { icon: "/icons/icon-192x192.png", badge: "/icons/icon-192x192.png" },
          },
        });
        sent += 1;
      } catch (cause) {
        /*
         * ⚠ УСТСАН ТӨХӨӨРӨМЖИЙН токеныг ЦЭВЭРЛЭНЭ: хэрэглэгч аппаа
         * устгасан, хөтчийн өгөгдлөө арчсан бол токен үүрд хүчингүй.
         * Үлдээвэл илгээгч сар бүр улам удаан ажиллана.
         */
        const code = (cause as { errorInfo?: { code?: string }; code?: string })?.errorInfo?.code ??
          (cause as { code?: string })?.code ?? "";
        if (
          code.includes("registration-token-not-registered") ||
          code.includes("invalid-argument")
        ) {
          dead.push(device.id);
        } else {
          console.error("[reminder] илгээж чадсангүй", code || cause);
        }
      }
    }
  }

  if (done.length > 0) {
    await db
      .update(tournamentEntries)
      .set({ reminderSentAt: now })
      .where(inArray(tournamentEntries.id, done));
  }

  if (dead.length > 0) {
    await db.delete(pushTokens).where(inArray(pushTokens.id, dead));
    pruned = dead.length;
  }

  return {
    window,
    listed: all.length,
    tournaments: upcoming.length,
    users: entries.length,
    sent,
    pruned,
  };
}
