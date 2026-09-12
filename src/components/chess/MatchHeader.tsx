import { Clock, Crown } from "lucide-react";

/**
 * Тэмцээний "хожлын хавтан" — тоглогчдын нэр + цагийн шилний харагдацтай
 * сийлбэр карт (хэрэглэгчийн ирүүлсэн зурган ишлэлтэй ижилхэн).
 *
 * ⚠ Цаг бол ЗӨВХӨН ХАРАГДАЦ — "10:00" үргэлж тогтмол, буурдаггүй. Аппд
 * одоогоор цагтай (timed) тоглоомын дүрэм байхгүй тул жинхэнэ тоолуур
 * нэмээгүй, зөвхөн тэмцээний "фиш" мэдрэмжийг өгөхийн тулд декоратив.
 */
export function MatchHeader({ leftName, rightName }: { leftName: string; rightName: string }) {
  return (
    <div className="rounded-2xl bg-gradient-to-b from-[#1c2740] to-[#0d1424] px-4 py-3 shadow-lg">
      <p className="truncate text-center text-sm font-semibold text-white/90">
        {leftName} <span className="font-normal text-white/40">vs</span> {rightName}
      </p>
      <div className="mt-2.5 flex items-center justify-between">
        <ClockBadge />
        <CrownBadge />
        <ClockBadge />
      </div>
    </div>
  );
}

function ClockBadge() {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0b1220] px-3 py-1.5">
      <Clock className="size-3.5 text-amber-300/80" aria-hidden />
      <span className="font-mono text-sm font-semibold tabular-nums text-white/90">10:00</span>
    </div>
  );
}

function CrownBadge() {
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-amber-300/30 bg-[#0b1220]">
      <Crown className="size-4 text-amber-300" aria-hidden />
    </div>
  );
}
