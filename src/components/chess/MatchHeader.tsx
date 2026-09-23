import { Clock, Crown } from "lucide-react";

import { formatClock } from "@/lib/tactiq/gameClock";

import type { ClockSide } from "@/lib/tactiq/gameClock";

/**
 * Тоглолтын толгой — тоглогчдын нэр + ХОЁР ЦАГ.
 *
 * ⚠ ЦАГ НЬ ОДОО БОДИТ (`lib/tactiq/gameClock.ts`). Урьд нь «10:00» гэж
 * хатуу бичигдсэн гоёл байсан тул тоглогч цаг явж байгаа гэж боддог ч
 * үнэндээ хэзээ ч буурдаггүй байв — хамгийн дор хувилбар: харагдац нь
 * байхгүй дүрмийг байгаа гэж хэлж байв.
 *
 * ⚠ ЗҮҮН ЦАГ нь ҮРГЭЛЖ ЭНЭ ТОГЛОГЧИЙНХ (`leftMs`), баруун нь
 * өрсөлдөгчийн — хөлгийн чиглэлээс ХАМААРАХГҮЙ. «Миний цаг хаана вэ»
 * гэж хайх шаардлага гарах ёсгүй.
 *
 * ⚠ ЦАГГҮЙ ТОГЛОЛТ бол цагийг ОГТ ЗУРАХГҮЙ (`leftMs` дамжуулаагүй):
 * хоосон, эсвэл хөдөлгөөнгүй цаг үзүүлэх нь худал мэдээлэл.
 */
export function MatchHeader({
  leftName,
  rightName,
  leftMs,
  rightMs,
  /** Аль талын цаг явж байна — тод харуулна. */
  activeSide,
  /** Энэ тоглогчийн өнгө: зүүн цаг нь түүний цаг. */
  myColor,
}: {
  leftName: string;
  rightName: string;
  leftMs?: number;
  rightMs?: number;
  activeSide?: ClockSide;
  myColor?: ClockSide;
}) {
  const showClocks = leftMs !== undefined && rightMs !== undefined;
  const leftActive = showClocks && activeSide !== undefined && activeSide === myColor;
  const rightActive = showClocks && activeSide !== undefined && activeSide !== myColor;

  return (
    /*
      ⚠ ГАР УТСАН дээр НЭГ МӨР (цаг · нэрс · цаг), титэмгүй — хоёр мөр
      нь хөлгөөс ~30px булааж байв. `sm`-ээс дээш урьдын хоёр мөр.
    */
    <div className="rounded-2xl bg-gradient-to-b from-[#1c2740] to-[#0d1424] px-3 py-1.5 shadow-lg sm:px-4 sm:py-2">
      <p className="hidden truncate text-center text-sm font-semibold text-white/90 sm:block">
        {leftName} <span className="font-normal text-white/40">vs</span> {rightName}
      </p>
      <div className="flex items-center justify-between gap-2 sm:mt-1.5">
        <ClockBadge ms={leftMs} active={leftActive} />
        <p className="min-w-0 flex-1 truncate text-center text-xs font-semibold text-white/90 sm:hidden">
          {leftName} <span className="font-normal text-white/40">vs</span> {rightName}
        </p>
        <span className="hidden sm:block">
          <CrownBadge />
        </span>
        <ClockBadge ms={rightMs} active={rightActive} />
      </div>
    </div>
  );
}

function ClockBadge({ ms, active }: { ms?: number; active?: boolean }) {
  /*
   * ⚠ Цаггүй үед НЭР БҮХИЙ зай барина (`opacity-0`), огт хасахгүй:
   * тэгвэл титэм дундаа байрлаж, цагтай тоглолт руу шилжихэд байрлал
   * үсрэхгүй.
   */
  if (ms === undefined) return <span className="w-[74px]" aria-hidden />;

  const low = ms < 30_000;

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 transition-colors ${
        active ? "border-amber-300/60 bg-[#152033]" : "border-white/10 bg-[#0b1220]"
      }`}
    >
      <Clock
        className={`size-3.5 ${active ? "text-amber-300" : "text-amber-300/50"}`}
        aria-hidden
      />
      {/*
        ⚠ `tabular-nums` + `font-mono`: тоо солигдох бүрд өргөн
        хэлбэлзвэл цаг «чичирнэ».

        ⚠ 30 секундээс доош ЦУСАН ӨНГӨ: цаг дуусах гэж байгааг зөвхөн
        тоогоор хэлэх нь хүүхдэд хангалтгүй.
      */}
      <span
        className={`font-mono text-sm font-semibold tabular-nums ${
          low ? "text-rose-400" : "text-white/90"
        }`}
      >
        {formatClock(ms)}
      </span>
    </div>
  );
}

function CrownBadge() {
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-amber-300/30 bg-[#0b1220]">
      <Crown className="size-4 text-amber-300" aria-hidden />
    </div>
  );
}
