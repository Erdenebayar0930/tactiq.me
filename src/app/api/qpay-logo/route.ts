import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * ЗӨВШӨӨРӨГДСӨН ДОМЭЙН — QPay-ийн банкны лого хадгалагддаг газар.
 *
 * ⚠ Дурын хаяг татахыг ЗӨВШӨӨРӨХГҮЙ. Ил задгай прокси нь манай сервер
 * рүү дотоод сүлжээний хаяг (SSRF) татуулах, эсвэл манай домэйнээр
 * танихгүй агуулга тараах эрсдэлтэй. Тиймээс хост нь ЯГ энэ жагсаалтад
 * байх ёстой.
 */
const ALLOWED_HOSTS = new Set(["s3.qpay.mn", "qpay.mn", "www.qpay.mn"]);

/**
 * Банкны лого-г МАНАЙ домэйнээр дамжуулж өгнө.
 *
 * ⚠ ЯАГААД ПРОКСИ: гуравдагч домэйнээс шууд татахад гурван зүйл саад
 * болдог — CSP-ийн `img-src`, service worker-ийн cross-origin дүрэм,
 * мөн тухайн S3 хэдэн зуун миллисекунд удаах нь. Манай домэйнөөр явбал
 * `'self'` дүрэмд багтаж, хөтөч, SW хоёуланд нь энгийн зураг болно.
 *
 * ⚠ Хариултын төрлийг ШАЛГАНА: upstream нь HTML алдаа буцаавал түүнийг
 * зураг гэж дамжуулбал хуудас дээр хог гарна.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "url дутуу." }, { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Буруу хаяг." }, { status: 400 });
  }

  if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname)) {
    return NextResponse.json({ error: "Зөвшөөрөгдөөгүй хаяг." }, { status: 400 });
  }

  try {
    const upstream = await fetch(target, {
      // ⚠ Хугацаа хязгаарлана: удаан хариу нь манай route-ыг барьж болно.
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });

    const type = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || !type.startsWith("image/")) {
      return NextResponse.json({ error: "Зураг олдсонгүй." }, { status: 404 });
    }

    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": type,
        /*
         * Банкны лого бараг өөрчлөгддөггүй — удаан кэшлэнэ. Нэхэмжлэл
         * бүрд 20 гаруй зураг татдаг тул энэ нь мэдэгдэхүйц.
         */
        "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Зураг татахад алдаа гарлаа." }, { status: 502 });
  }
}
