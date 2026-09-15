"use client";

import Image from "next/image";

import { readableBg } from "@/lib/tactiq/theme";

import type { AchievementProgress } from "@/lib/tactiq/achievements";

/**
 * Амжилтын ТЭМДЭГ — загварын макетаас тасдсан гурван хэмжээст дүрс.
 *
 * ⚠ ЗУРАГТ ХАВТАС нь ХУВИЛБАРТАЙ (`v1`). Service worker нь `/images/**`-ийг
 * CacheFirst-ээр 30 хоног барьдаг (`next.config.ts`) тул ижил нэрээр дарж
 * бичихэд хэрэглэгчид засвар хүрэхгүй. Дүрсээ заслаа бол дугаарыг өсгөнө.
 */
const ART = "/images/achievements/v1";

/**
 * Зурагт ШИГДСЭН босгын туузыг дарах хүрээ (зургийн хэмжээнд харьцангуй).
 *
 * ⚠ ЯАГААД ДАРАХ ХЭРЭГТЭЙ ВЭ: макет дээрх «5», «50», «1,000» нь тэр жишээ
 * сурагчийн дараагийн босго. Бодит сурагч өөр шатанд байвал зураг нь
 * ХУДАЛ тоо харуулна — пиксел дотор шигдсэн тул кодоос засах аргагүй.
 * Тиймээс өөрийн тоогоо яг тэр байранд нь тавьж бүрэн дарна.
 *
 * ⚠ Бүх тэмдгийн зураг ЯГ ИЖИЛ геометртэй (220×164, агуулгаар зүсээгүй)
 * тул НЭГ хүрээ бүгдэд таарна. Зургийг дахин тасдвал энэ нөхцөлийг
 * заавал хадгална.
 */
const PILL = { left: "19%", top: "70%", minWidth: "33%", height: "20%" };

export default function AchievementBadge({
  item,
  onClick,
}: {
  item: AchievementProgress;
  onClick?: () => void;
}) {
  const locked = item.tier === 0;

  /*
   * ⚠ Туузны өнгө нь 4.5:1 харьцаагаар — дотроо ЖИЖИГ ЦАГААН ТОО агуулна.
   * Тэмдгийн зураг өөрөө бичвэргүй тул түүнд энэ шалгуур хамаарахгүй.
   */
  const ribbonColor = readableBg(item.color, 4.5);

  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className="flex w-full flex-col items-center gap-1.5 text-center"
    >
      <div className="relative w-full max-w-[140px]">
        {/*
          ⚠ Аваагүй тэмдгийг НУУХГҮЙ, зөвхөн өнгийг нь авна. «Юу авч болох
          вэ» гэдэг нь өөрөө зорилго болдог. Макет дээр ч түгжээтэй тэмдэг
          нь саарал зургаан өнцөгт хэвээр харагддаг.
        */}
        <Image
          src={`${ART}/${item.id}.png`}
          alt=""
          aria-hidden
          width={220}
          height={164}
          className={`h-auto w-full transition-[filter,opacity] ${
            locked ? "opacity-70 grayscale" : ""
          }`}
        />

        {/*
          ТООНЫ ТУУЗ — зурагт шигдсэнийг нь дарж, бодит утгыг зурна.

          ⚠ `badgeLabel` нь ТОО БИШ, МӨР байж болно: лигийн тэмдэгт «Мөнгө»
          гэсэн үг ирнэ (`lib/tactiq/achievements.ts`). Тиймээс өргөнийг
          агуулгаар нь тэлж, урт үед үсгийг жижигрүүлнэ.
        */}
        <span
          className={`absolute grid place-items-center whitespace-nowrap rounded-full border-2 border-white px-2 font-extrabold text-white shadow-sm dark:border-gray-900 ${
            item.badgeLabel.length > 5 ? "text-[10px]" : "text-xs"
          }`}
          style={{
            ...PILL,
            backgroundColor: locked ? "#9ca3af" : ribbonColor,
          }}
        >
          {item.badgeLabel}
        </span>
      </div>

      <p
        className={`text-[13px] font-bold leading-tight ${
          locked ? "text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-white"
        }`}
      >
        {item.title}
      </p>

      {/*
        ⚠ Хувь БИШ, ШАТ харуулна («3 / 8»). Тэмдэг нь олон шаттай бөгөөд
        хэрэглэгчийн бодитоор мэдэрдэг ахиц нь «хэдэн шат авсан бэ» —
        дараагийн шат хүртэлх хувь нь шат бүрд тэгээс эхэлдэг тул жагсаалт
        даяар харьцуулах утгагүй.
      */}
      <p className="num text-xs font-semibold text-gray-400 dark:text-gray-500">
        {item.tier} / {item.maxTier}
      </p>
    </Wrapper>
  );
}
