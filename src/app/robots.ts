import { BRAND_URL } from "@/lib/brand";

import type { MetadataRoute } from "next";

/**
 * `robots.txt` — Next нь энэ файлаас автоматаар `/robots.txt` үүсгэнэ.
 *
 * ЯАГААД ХЭРЭГТЭЙ ВЭ: сайтын ИХЭНХ зам нь нэвтрэлт шаарддаг (`/learn`,
 * `/play`, `/profile`…). Хайлтын робот тэдгээрийг мэдэхгүй тул тойрч,
 * бүгдээс нь нэвтрэх хуудас руу шилжсэн ХООСОН, ИЖИЛХЭН агуулга уншина.
 * Үүний үр дүнд Google индекст "давхардсан агуулга" болж бүртгэгдэж,
 * жинхэнэ нүүр хуудасны байр суурийг сулруулна.
 *
 * ⚠ Энэ нь ХАМГААЛАЛТ БИШ — зөвхөн дуулгавартай роботод хүчинтэй зөвлөмж.
 * Жинхэнэ эрхийн шалгалт нь `src/lib/api/auth.ts`-ийн `require*` функцүүд.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Хувийн өгөгдөлтэй, нэвтрэлт шаардсан хэсгүүд
          "/admin",
          "/api/",
          "/achievements",
          "/certificates",
          "/courses",
          "/friends",
          "/leaderboard",
          "/learn",
          "/parent",
          "/play",
          "/premium",
          "/profile",
          "/settings",
          "/teacher",
          "/unauthorized",
        ],
      },
    ],
    sitemap: `${BRAND_URL}/sitemap.xml`,
    host: BRAND_URL,
  };
}
