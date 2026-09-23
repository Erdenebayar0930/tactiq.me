"use client";

import { useState } from "react";
import { Check, Flame, Share2, Trophy, Zap } from "lucide-react";

import { useCurrentUser } from "@/context/UserContext";
import { BRAND_DOMAIN, BRAND_NAME, BRAND_URL } from "@/lib/brand";
import { renderShareCard } from "@/lib/tactiq/shareCard";

import type { AchievementRecord } from "@/lib/api/achievements";
import { t } from "@/lib/i18n/t";

/**
 * Профайлын товч мэдээлэл ба ХУВААЛЦАХ товч — `/achievements` дээр.
 *
 * ⚠ НИЙТИЙН ПРОФАЙЛЫН ХУУДАС ҮҮСГЭХГҮЙ. Хуваалцах гэдэг нь ихэвчлэн
 * "хэн ч үзэж болох холбоос" гэсэн утгатай ч энэ бол ХҮҮХДИЙН платформ:
 * нэр, зураг, дараалал агуулсан хаяг интернэтэд тархвал буцаан татах
 * боломжгүй. Тиймээс зөвхөн ХЭРЭГЛЭГЧИЙН ӨӨРИЙН бичсэн ТЕКСТ ба сайтын
 * НҮҮР хаягийг хуваалцана — хувийн өгөгдөл рүү заасан холбоос үүсэхгүй.
 *
 * ⚠ Хуваалцах текстэд ИМЭЙЛ, урилгын код ОРОХГҮЙ. Урилгын код нь эцэг эх,
 * багш холбогдох түлхүүр (`lib/api/studentLinks.ts`) тул нийтэд тараах
 * зүйл биш — түүнийг зориуд `MyCodeCard`-аар л өгнө.
 */
export default function ProfileShareCard({
  records,
  unlocked,
  total,
}: {
  records: AchievementRecord[];
  unlocked: number;
  total: number;
}) {
  const user = useCurrentUser();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const league = records.find((record) => record.key === "league");

  const initial = (user.displayName || user.email || "?").charAt(0).toUpperCase();

  const share = async () => {
    setFailed(false);
    setBusy(true);

    const lines = [
      `${user.displayName || "Би"} — ${BRAND_NAME}`,
      `⚡ ${user.xp.toLocaleString("mn-MN")} оноо · ${user.level}-р түвшин`,
      `🔥 ${user.streakDays} өдрийн дараалал`,
      `🏅 ${unlocked}/${total} тэмдэг`,
      "",
      BRAND_URL,
    ];
    const text = lines.join("\n");

    try {
      const blob = await renderShareCard({
        name: user.displayName || "Сурагч",
        initial,
        level: user.level,
        xp: user.xp,
        streakDays: user.streakDays,
        leagueLabel: league?.value ?? "—",
        leagueColor: league?.color ?? "#ffffff",
        unlocked,
        total,
        brand: BRAND_NAME,
        site: BRAND_DOMAIN,
      });

      const file = new File([blob], "daamal-amjilt.png", { type: "image/png" });

      /*
       * ⚠ `canShare({ files })`-ээр ЗААВАЛ шалгана. `navigator.share`
       * байгаа нь ФАЙЛ хуваалцаж чадна гэсэн үг БИШ — олон хөтөч зөвхөн
       * текст дэмждэг ба файл дамжуулбал `share()` алдаа шидэнэ.
       */
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: BRAND_NAME, text, files: [file] });
        return;
      }

      // Зураг хуваалцаж чадахгүй хөтөч — татаж өгнө. Хэрэглэгч түүнийгээ
      // өөрөө постдоно.
      download(blob, file.name);

      // Текстийг мөн хуулна: пост бичихэд бэлэн болно.
      await navigator.clipboard?.writeText(text).catch(() => {});
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch (cause) {
      /*
       * Хэрэглэгч хуваалцахаа цуцалсныг АЛДАА гэж үзэхгүй — хөтөч
       * `AbortError` шидэх бөгөөд тэр үед улаан мессеж гаргах нь
       * буруутгаж байгаа мэт болно.
       */
      if (!(cause instanceof DOMException && cause.name === "AbortError")) {
        setFailed(true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="surface p-5">
      <div className="flex items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-100 text-xl font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
          {user.photoUrl ? (
            /* Firebase Storage-ийн URL нь `remotePatterns`-д бүртгэлгүй
               бөгөөд зураг нь 56px тул оновчлол шаардлагагүй. */
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoUrl} alt="" className="size-full object-cover" />
          ) : (
            initial
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-gray-900 dark:text-white">
            {user.displayName || "Хэрэглэгч"}
          </p>
          <p className="num text-xs text-gray-500 dark:text-gray-400">
            {user.level}-р түвшин · {unlocked}/{total} тэмдэг
          </p>
        </div>

        <button
          type="button"
          onClick={() => void share()}
          disabled={busy}
          className="flex shrink-0 items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
        >
          {copied ? (
            <Check className="size-4" aria-hidden />
          ) : (
            <Share2 className="size-4" aria-hidden />
          )}
          {busy ? "Бэлдэж байна…" : copied ? "Татагдлаа" : "Хуваалцах"}
        </button>
      </div>

      {failed && (
        <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400">{t("Зураг бэлдэж чадсангүй. Дахин оролдоно уу.")}</p>
      )}

      {/* Товч үзүүлэлт — хуваалцах текстэд ЯГ эдгээр тоо орно. */}
      <div className="mt-4 grid grid-cols-3 divide-x divide-gray-200 dark:divide-white/10">
        <Stat Icon={Zap} label={t("Оноо")} value={user.xp.toLocaleString("mn-MN")} />
        <Stat Icon={Flame} label={t("Дараалал")} value={`${user.streakDays}`} />
        <Stat
          Icon={Trophy}
          label={t("Лиг")}
          value={league?.value ?? "—"}
        />
      </div>
    </section>
  );
}

function Stat({
  Icon,
  label,
  value,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-2">
      <Icon className="size-4 text-gray-400" aria-hidden />
      <span className="num text-base font-extrabold text-gray-900 dark:text-white">
        {value}
      </span>
      <span className="text-[11px] text-gray-500 dark:text-gray-400">{label}</span>
    </div>
  );
}

/**
 * Blob-ыг файл болгож татна.
 *
 * ⚠ `URL.revokeObjectURL` ЗААВАЛ. Үгүй бол объектын хаяг таб хаагдтал
 * санах ойд үлдэнэ — 1080×1080 PNG тутамд хэдэн зуун KB.
 */
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}
