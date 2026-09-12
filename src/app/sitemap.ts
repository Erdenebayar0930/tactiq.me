import { BRAND_URL } from "@/lib/brand";

import type { MetadataRoute } from "next";

/**
 * `sitemap.xml` — Next нь энэ файлаас автоматаар үүсгэнэ.
 *
 * ⚠ ЗӨВХӨН нэвтрэлтгүй үзэгддэг хуудсуудыг оруулна. Нэвтрэлт шаардсан замыг
 * оруулбал робот тэднийг татаж, бүгдээс нь ижил "нэвтэрнэ үү" хуудас авч,
 * sitemap өөрөө давхардсан агуулгын эх үүсвэр болно (`robots.ts`-д мөн
 * тэдгээрийг хаасан — хоёр файл ЗӨРӨХГҮЙ байх ёстой).
 *
 * Одоогоор нийтэд нээлттэй хуудас нь нүүр (`(site)/page.tsx`) болон
 * нэвтрэх/бүртгүүлэх хоёр. Сүүлийн хоёр нь SEO-гийн хувьд утга багатай
 * (агуулга нь зөвхөн форм) тул оруулаагүй.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BRAND_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
