import { getAdSenseClientId } from "@/lib/tactiq/ads";

/**
 * `ads.txt` — Google AdSense-ийн шаарддаг файл (Authorized Digital Sellers).
 * Үүнгүйгээр AdSense сайтыг "баталгаажаагүй" гэж үзэж, зар багасгах эсвэл
 * бүр зогсоож болзошгүй. `NEXT_PUBLIC_ADSENSE_CLIENT_ID` тохируулмагц
 * автоматаар зөв агуулгатай болно — өөр кодын өөрчлөлт шаардлагагүй.
 *
 * https://support.google.com/adsense/answer/7532444
 */
export function GET() {
  const clientId = getAdSenseClientId();
  if (!clientId) return new Response("", { status: 404 });

  const pubId = clientId.replace(/^ca-/, "");
  const body = `google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
