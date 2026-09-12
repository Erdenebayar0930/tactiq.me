"use client";

import {
  Award,
  BookOpen,
  Clock,
  Compass,
  Flame,
  Gift,
  Handshake,
  Lock,
  Swords,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

import { readableBg, shade } from "@/lib/tactiq/theme";

import type { AchievementProgress } from "@/lib/tactiq/achievements";

/**
 * Амжилтын ТЭМДЭГ — бамбай хэлбэртэй медаль.
 *
 * ⚠ ДҮРСИЙГ ГАЗРЫН ЗУРГААР холбоно, `lucide-react`-аас ДИНАМИКААР авахгүй.
 * Динамик хандалт (`icons[name]`) нь bundler-т аль дүрс хэрэглэгдэхийг
 * мэдэгдэхгүй тул НИЙТ 1000+ дүрсийн сан клиент рүү орно.
 */
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Flame,
  Zap,
  BookOpen,
  Compass,
  Clock,
  Swords,
  Target,
  Trophy,
  Handshake,
  Gift,
};

/**
 * Бамбайн хэлбэр — `clip-path`-аар.
 *
 * ⚠ SVG биш `clip-path` ашигласан нь санамсаргүй биш: хэлбэр нь дотроо
 * градиент, дүрс, текст агуулах ёстой. SVG-д тэдгээрийг байрлуулах нь
 * `foreignObject` эсвэл гараар тооцсон координат шаардана; `clip-path` нь
 * ердийн flex байрлуулалтыг хэвээр үлдээнэ.
 *
 * Дээд булан нь дугуйрсан, доод үзүүр нь шовх — уламжлалт медалийн хэлбэр.
 */
const SHIELD =
  "polygon(50% 0%, 93% 12%, 100% 55%, 50% 100%, 0% 55%, 7% 12%)";

export default function AchievementBadge({
  item,
  onClick,
}: {
  item: AchievementProgress;
  onClick?: () => void;
}) {
  const Icon = ICONS[item.icon] ?? Award;
  const locked = item.tier === 0;

  /*
   * ⚠ ХОЁР ӨӨР босго, санамсаргүй биш.
   *
   * Бамбай нь зөвхөн ДҮРС агуулна → WCAG-ийн бичвэр бус элементийн босго
   * 3:1 хангалттай. Тууз нь ЖИЖИГ ТОО агуулна → 4.5:1 шаардана.
   *
   * Хоёуланд 4.5 хэрэглэвэл Алт `#a26b00` (бор), Очир `#007b96` (бараан
   * ногоон) болж, медалиуд өнгөө алдана — тэмдэг бол баяр хөөрийн зүйл.
   */
  const shieldColor = readableBg(item.color, 3);
  const ribbonColor = readableBg(item.color, 4.5);

  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className="flex w-full flex-col items-center gap-1.5 text-center"
    >
      <div className="relative w-full max-w-[112px] pb-3">
        {/*
          ⚠ Аваагүй тэмдгийг НУУХГҮЙ, зөвхөн өнгийг нь авна. "Юу авч болох
          вэ" гэдэг нь өөрөө зорилго болдог. Түгжээний дүрс нь өнгө ялгахад
          бэрхшээлтэй хүнд ч төлөвийг ойлгуулна — саарал өнгө дангаараа
          хангалттай дохио БИШ.
        */}
        <div
          className="grid aspect-square w-full place-items-center transition-transform"
          style={{
            clipPath: SHIELD,
            /*
              ⚠ Градиентыг ТЭМДГИЙН өнгөнөөс биш, `readableBg()`-ээс
              эхлүүлнэ. Алт (`#eab308`), Очир (`#22d3ee`) зэрэг цайвар
              өнгөн дээр цагаан дүрс 2:1 болж алга болдог. Дүрсийг бараан
              болгосон нь медалийг "идэвхгүй" мэт харуулсан тул оронд нь
              ӨНГИЙГ гүнзгийрүүлэв — өнгөлөг чанар хэвээр, зөвхөн
              гэрэлтэлт нь буурна.
            */
            background: locked
              ? "linear-gradient(160deg,#d1d5db,#9ca3af)"
              : `linear-gradient(160deg, ${shieldColor}, ${shade(shieldColor, -28)})`,
          }}
        >
          {locked ? (
            <Lock className="size-7 text-white/70" aria-hidden />
          ) : (
            /* Дүрсийг ТӨВӨӨС ДЭЭШ — доод хэсгийг тооны тууз эзэлнэ. */
            <Icon className="size-9 -translate-y-2 text-white drop-shadow" aria-hidden />
          )}
        </div>

        {/*
          Тооны тууз — бамбайн ДООД үзүүр дээр давхарлана.

          ⚠ `badgeLabel` нь ТОО БИШ, МӨР байж болно: лигийн тэмдэгт "Мөнгө"
          гэсэн үг ирнэ (`lib/tactiq/achievements.ts`). Тиймээс өргөнийг
          агуулгаар нь тэлж, урт үед үсгийг жижигрүүлнэ.
        */}
        <span
          className={`absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-[3px] border-white px-2.5 py-0.5 font-extrabold text-white shadow-sm dark:border-gray-900 ${
            item.badgeLabel.length > 5 ? "text-[11px]" : "text-sm"
          }`}
          style={{ backgroundColor: locked ? "#9ca3af" : ribbonColor }}
        >
          {item.badgeLabel}
        </span>
      </div>

      <p
        className={`text-[13px] leading-tight font-bold ${
          locked ? "text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-white"
        }`}
      >
        {item.title}
      </p>

      {/*
        ⚠ Хувь БИШ, ШАТ харуулна ("3 / 8"). Тэмдэг нь олон шаттай бөгөөд
        хэрэглэгчийн бодитоор мэдэрдэг ахиц нь "хэдэн шат авсан бэ" — дараа
        гийн шат хүртэлх хувь нь шат бүрд тэгээс эхэлдэг тул жагсаалт
        даяар харьцуулах утгагүй.
      */}
      <p className="num text-xs font-semibold text-gray-400 dark:text-gray-500">
        {item.tier} / {item.maxTier}
      </p>
    </Wrapper>
  );
}
