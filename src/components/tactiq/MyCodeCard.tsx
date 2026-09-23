"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, Link2, Share2 } from "lucide-react";
import { t } from "@/lib/i18n/t";

/**
 * "Миний код" — хэрэглэгчийн хувийн урилгын кодыг харуулах ЦОРЫН ГАНЦ газар.
 *
 * ⚠ Код нь ГУРВАН зорилготой болсон: найз урих (үнэгүй хоног), найзын
 * хүсэлт, эцэг эх/багш холбогдох. Гурвуулаа ижил кодыг ижилхэн гараар
 * бичүүлдэг тул код нь ТОМООР, тодоор харагдах ёстой — өмнө нь зөвхөн
 * бүтэн холбоосын дотор жижгээр л байсан бөгөөд хүүхэд ээждээ "минийхийг
 * ярьж өг" гэж хэлэхэд уншиж чаддаггүй байв.
 *
 * ⚠ Кодыг ТАСЛАЖ (3 + 3) харуулна: `ABC123` гэхээс `ABC 123` нь амаар
 * дуудахад, гараар бичихэд алдаа гаргахгүй (утасны дугаартай ижил зарчим).
 * Хуулах товч нь ЗАЙГҮЙ жинхэнэ кодыг хуулна.
 *
 * ⚠ ГРАДИЕНТ БИШ, цагаан суурьтай. Профайл дээр энэ карт нь угталтын ТОМ
 * градиент баннерын ШУУД ДООР суудаг — өөр нэг градиент бол хоёул нийлж,
 * нүд түүнийг "чимэглэл" гэж алгасна. Ялгарлыг нь ӨНГӨӨР биш, ҮСГИЙН
 * ХЭМЖЭЭ (4xl код) ба тод хүрээгээр (ring) гаргана: цагаан картуудын дунд
 * ганцаараа хүрээтэй байх нь хамгийн хурдан баригддаг.
 */

/** `ABC123` → `ABC 123`. Урт нь сондгой бол дундуур нь хуваана. */
function spaced(code: string): string {
  const half = Math.ceil(code.length / 2);
  return `${code.slice(0, half)} ${code.slice(half)}`;
}

export default function MyCodeCard({
  code,
  /**
   * Сурагч эсэх. Сурагч БИШ хүний код нь зөвхөн найзын хүсэлтэд ажиллана —
   * эцэг эх/багшийн холболт, урилгын бонус хоёулаа сурагчийн кодыг л
   * шаарддаг (`lib/api/studentLinks.ts`, `api/auth/register`). Тиймээс
   * тайлбарыг ХУДЛАА бичихгүйн тулд заавал ялгана.
   */
  isStudent,
  compact = false,
}: {
  code: string;
  isStudent: boolean;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  // `window` нь зөвхөн клиент дээр — энэ компонент нэвтэрсэн хэрэглэгчид л
  // бодит өгөгдлөөр рендерлэгддэг тул hydration зөрүү бодит эрсдэлгүй.
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = `${origin}/register?ref=${code}`;

  const copy = async (value: string, kind: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard API зарим орчинд (http, зөвшөөрөлгүй) байхгүй. Код нь
      // дэлгэц дээр ТОМООР харагдаж байгаа тул гараар ч бичиж чадна —
      // алдаа харуулах шаардлагагүй.
    }
  };

  const share = async () => {
    // Гар утсан дээр төрөлх "хуваалцах" цонх нь мессенжер рүү шууд илгээх
    // боломж өгнө — хуулж/буулгахаас хамаагүй богино зам.
    if (typeof navigator !== "undefined" && "share" in navigator) {
      await navigator
        .share({ title: "Tactiq — надтай нэгдээрэй", text: `Миний код: ${code}`, url: link })
        .catch(() => {
          // Хэрэглэгч цонхыг хаасан — алдаа БИШ.
        });
      return;
    }

    void copy(link, "link");
  };

  return (
    <section
      className={`surface ring-2 ring-brand-400 dark:ring-brand-400/50 ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
          <KeyRound className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2
            className={`text-gray-900 dark:text-white ${
              compact ? "font-bold" : "text-lg font-bold"
            }`}
          >{t("Миний код")}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {isStudent
              ? "Найз, эцэг эх, багшдаа өгнө"
              : "Найздаа өгч, найзын хүсэлт солилцоно"}
          </p>
        </div>
      </div>

      {/*
        Кодын хайрцаг — дэлгэцийн хамгийн тод элемент. `select-all` нь нэг
        товшилтоор бүтнээр нь сонгоно (компьютер дээр хуулах товчгүйгээр ч).
      */}
      <p
        className="num mt-3 select-all rounded-xl bg-brand-50 py-3 text-center text-3xl font-extrabold tracking-[0.2em] text-brand-700 ring-1 ring-inset ring-brand-200 dark:bg-brand-500/10 dark:text-brand-200 dark:ring-brand-400/30 sm:text-4xl"
        aria-label={`Миний код: ${code.split("").join(" ")}`}
      >
        {spaced(code)}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void copy(code, "code")}
          className="btn-primary flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs"
        >
          {copied === "code" ? (
            <Check className="size-3.5" aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
          {copied === "code" ? "Хууллаа" : "Код хуулах"}
        </button>

        <button
          type="button"
          onClick={() => void share()}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-white/15 dark:text-gray-200 dark:hover:bg-white/5"
        >
          {copied === "link" ? (
            <Check className="size-3.5" aria-hidden />
          ) : (
            <Share2 className="size-3.5" aria-hidden />
          )}
          {copied === "link" ? "Холбоос хууллаа" : "Холбоос илгээх"}
        </button>
      </div>

      {!compact && (
        <ul className="mt-3 space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
          {(isStudent
            ? [
                "Найз энэ кодоор бүртгүүлбэл ХОЁУЛАА үнэгүй хоног авна",
                "Найз нэмэхэд (Найзууд хуудас) энэ кодыг оруулна",
                "Эцэг эх, багш тань энэ кодоор таны ахицыг харна",
              ]
            : [
                "Найз нэмэхэд (Найзууд хуудас) энэ кодыг оруулна",
                "Урилгын бонус, эцэг эхийн холболт нь ЗӨВХӨН сурагчийн кодоор ажиллана",
              ]
          ).map((line) => (
            <li key={line} className="flex items-start gap-2">
              <Link2 className="mt-0.5 size-3 shrink-0 text-brand-500" aria-hidden />
              {line}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
