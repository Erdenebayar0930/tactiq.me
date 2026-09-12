import { Outfit } from "next/font/google";
import Script from "next/script";
import "./globals.css";

import { LocaleProvider } from "@/context/LocaleContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { UserProvider } from "@/context/UserContext";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { getAdSenseClientId } from "@/lib/tactiq/ads";
import {
  BRAND_DESCRIPTION,
  BRAND_NAME,
  BRAND_SHORT,
  BRAND_TAGLINE,
  BRAND_URL,
} from "@/lib/brand";

import type { Metadata, Viewport } from "next";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap", // ⚡ render blocking болиулна
});

export const metadata: Metadata = {
  /**
   * ⚠ ЭНЭ МӨРГҮЙГЭЭР хуваалцах зураг АЖИЛЛАХГҮЙ. Facebook, Messenger,
   * Twitter/X зэрэг нь `og:image`-ыг ЗӨВХӨН БҮТЭН хаягаар (https://…) уншдаг
   * бол Next нь `metadataBase` тохируулаагүй үед зөвхөн `/icons/…` гэсэн
   * харьцангуй зам гаргадаг — үр дүнд нь холбоос хуваалцахад зурагггүй,
   * хоосон саарал хайрцаг харагдана.
   *
   * `BRAND_URL` нь `NEXT_PUBLIC_SITE_URL`-ыг хүндэлдэг тул туршилтын орчинд
   * тэр хувьсагчийг өгөхөд хангалттай (`src/lib/brand.ts` үзнэ үү).
   *
   * ⚠ `NEXT_PUBLIC_*` нь BUILD ҮЕД шигтгэгддэг — домэйн солиход зөвхөн
   * restart биш, ЗААВАЛ дахин build хийнэ.
   */
  metadataBase: new URL(BRAND_URL),
  title: {
    default: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    template: `%s · ${BRAND_SHORT}`,
  },
  description: BRAND_DESCRIPTION,
  applicationName: BRAND_NAME,
  manifest: "/manifest.json",
  /**
   * Дэд хуудсууд (`/learn`, `/play`) нь ижил агуулгыг өөр URL-аар
   * давхардуулдаггүй тул canonical нь зөвхөн үндсэн хаягийг зааж өгнө.
   * `www.daamal.org` руу орсон хүн ч nginx-ээр apex руу шилжинэ
   * (`deploy/nginx/tactiq.conf`) — хоёр давхар хамгаалалт.
   */
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "mn_MN",
    url: BRAND_URL,
    siteName: BRAND_NAME,
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description: BRAND_DESCRIPTION,
    /**
     * ⚠ Одоогоор PWA icon-ыг дахин ашиглаж байна (дөрвөлжин 512×512).
     * Facebook/Messenger/Viber эдгээрийг хүлээж авдаг ч 1200×630 хэвтээ
     * зураг илүү том, тод харагддаг. Тийм зураг бэлдвэл энд солино —
     * `public/images/og.png` нэрээр тавиад доорх замыг өөрчилнө.
     */
    images: [
      {
        url: "/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description: BRAND_DESCRIPTION,
    images: ["/icons/icon-512x512.png"],
  },
  appleWebApp: {
    capable: true,
    title: BRAND_SHORT,
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Хүүхдийн апп дээр давхар товшилт нь хуудсыг андуурч томруулдаг тул
  // томруулалтыг хаав. Хүртээмжийн хувьд гэмтэлтэй тал бий — гэхдээ бүх
  // бичвэр аль хэдийн 14px-ээс дээш бөгөөд систем түвшний томруулалт
  // (browser zoom) ажилласаар байна.
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0f1c",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adSenseClientId = getAdSenseClientId();

  return (
    <html lang="mn" suppressHydrationWarning>
      <head>
        {/*
          Горимыг зурагдахаас ӨМНӨ тавина — эс бөгөөс харанхуй горимтой
          хэрэглэгчид эхний агшинд цагаан дэлгэц анивчина.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var l=localStorage.getItem("locale");if(l==="en")document.documentElement.lang="en";}catch(e){}try{var p=localStorage.getItem("theme");var d=p==="dark"||((!p||p==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`,
          }}
        />

        {/*
          Site-wide AdSense script — `AdSlot`-ийн script-ээс тусдаа зорилготой:
          нэвтрээгүй зочдод зориулсан `(site)` бүлэг (нүүр хуудас) AdSense
          огт ачаалдаггүй тул Google "Connect site to AdSense" баталгаажуулалт
          дээр яг ЭНД (нүүр хуудсанд) кодыг олж чадахгүй байсан. Одоо БҮХ
          хуудсанд (нэвтэрсэн эсэх үл хамааран) root layout-аас ачаална.
          `NEXT_PUBLIC_ADSENSE_CLIENT_ID` хоосон бол огт ачаалахгүй.
        */}
        {adSenseClientId && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adSenseClientId}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </head>
      <body
        suppressHydrationWarning
        className={`${outfit.className} bg-gray-50 dark:bg-gray-950`}
      >
        <ServiceWorkerRegister />
        <UserProvider>
          <ThemeProvider>
            <LocaleProvider>
              <SidebarProvider>{children}</SidebarProvider>
            </LocaleProvider>
          </ThemeProvider>
        </UserProvider>
      </body>
    </html>
  );
}
