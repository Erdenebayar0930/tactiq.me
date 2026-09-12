import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { devices } from "@/lib/db/schema";
import { MAX_DEVICES } from "@/lib/deviceLimit";

export { MAX_DEVICES };

export type DeviceInfo = {
  id: string;
  label: string;
  createdAt: Date;
  lastSeenAt: Date;
  /** Одоо хүсэлт илгээж буй хөтчийнх мөн эсэх — устгах жагсаалтад тодотгоно */
  isCurrent: boolean;
};

/**
 * User-Agent-ыг хүн уншихад ойлгомжтой товч тодорхойлолт болгоно.
 *
 * Бүтэн parser БИШ — таних түгээмэл товчлол олдохгүй бол "Тодорхойгүй
 * төхөөрөмж" гэж буцаана. Зорилго нь хэрэглэгчид "аль нь аль вэ" гэдгийг
 * ялгахад тусална, яг тоног төхөөрөмжийн загварыг тодорхойлох биш.
 */
export function describeUserAgent(userAgent: string | null): string {
  const ua = userAgent ?? "";

  const os = /windows/i.test(ua)
    ? "Windows"
    : /mac os|macintosh/i.test(ua)
      ? "Mac"
      : /android/i.test(ua)
        ? "Android"
        : /iphone|ipad|ios/i.test(ua)
          ? "iOS"
          : /linux/i.test(ua)
            ? "Linux"
            : "";

  const browser = /edg\//i.test(ua)
    ? "Edge"
    : /chrome\//i.test(ua)
      ? "Chrome"
      : /firefox\//i.test(ua)
        ? "Firefox"
        : /safari\//i.test(ua)
          ? "Safari"
          : "";

  const label = [browser, os].filter(Boolean).join(", ");
  return label || "Тодорхойгүй төхөөрөмж";
}

/**
 * Мөрүүдийг `DeviceInfo` болгож хувиргаад, ижил нэртэй (жишээ нь хоёулаа
 * "Chrome, Windows") ХЭД ХЭДЭН БОДИТ ӨӨР төхөөрөмжийг ялгаатай харуулна.
 *
 * `describeUserAgent` зөвхөн хөтөч+OS-г тодорхойлдог тул өөр 2 компьютер
 * ижил хослолтой байвал (нэн элбэг тохиолдол) нэр давхцаж, хэрэглэгчид
 * "нэг төхөөрөмж" мэт харагдана — гэвч `device_id` бодитоор ялгаатай.
 * Зөвхөн ЖИНХЭНЭ давхцал үед л богино ялгах кодыг нэмнэ, ганц төхөөрөмжтэй
 * хэрэглэгчийн жагсаалтыг хэрэггүй урт болгохгүйн тулд.
 */
function toDeviceInfoList(
  rows: (typeof devices.$inferSelect)[],
  currentDeviceId: string
): DeviceInfo[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.label, (counts.get(row.label) ?? 0) + 1);
  }

  return rows.map((row) => {
    const base = row.label || "Тодорхойгүй төхөөрөмж";
    const label =
      (counts.get(row.label) ?? 0) > 1 ? `${base} · #${row.id.slice(0, 4)}` : base;

    return {
      id: row.id,
      label,
      createdAt: row.createdAt,
      lastSeenAt: row.lastSeenAt,
      isCurrent: row.deviceId === currentDeviceId,
    };
  });
}

/**
 * Төхөөрөмжийг "мэдэгдэв" — байгаа бол `lastSeenAt`-ыг шинэчилнэ, шинэ бол
 * хязгаарыг шалгаад бүртгэнэ.
 *
 * `ok: false` үед `devices` жагсаалтыг буцаана — клиент "аль нэгийг нь
 * устгаад дахин оролдоно уу" гэсэн дэлгэц харуулна.
 */
export async function touchDevice(
  uid: string,
  deviceId: string,
  label: string
): Promise<{ ok: true } | { ok: false; devices: DeviceInfo[] }> {
  const rows = await db
    .select()
    .from(devices)
    .where(eq(devices.uid, uid))
    .orderBy(desc(devices.lastSeenAt));

  const current = rows.find((row) => row.deviceId === deviceId);

  if (current) {
    await db
      .update(devices)
      .set({ lastSeenAt: new Date(), label })
      .where(eq(devices.id, current.id));
    return { ok: true };
  }

  if (rows.length >= MAX_DEVICES) {
    return { ok: false, devices: toDeviceInfoList(rows, deviceId) };
  }

  await db.insert(devices).values({ uid, deviceId, label });
  return { ok: true };
}

export async function listDevices(uid: string, currentDeviceId: string): Promise<DeviceInfo[]> {
  const rows = await db
    .select()
    .from(devices)
    .where(eq(devices.uid, uid))
    .orderBy(desc(devices.lastSeenAt));

  return toDeviceInfoList(rows, currentDeviceId);
}
