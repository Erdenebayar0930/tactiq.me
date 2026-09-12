"use client";

/**
 * САЛЮТ — хичээл дуусгасан, шагнал авсан мөчид.
 *
 * ⚠ `canvas-confetti` САН БИШ, CSS: тэр сан нь canvas үүсгэж, кадр
 * болгонд JS ажиллуулдаг (~7KB gz + тасралтгүй тооцоолол). Энд хэсгүүд
 * нь ердийн `<span>`-ууд бөгөөд браузерын композитор дээр л хөдөлнө —
 * гар утсан дээр батарей хэмнэнэ, офлайн PWA-гийн бандлыг өсгөхгүй.
 *
 * ⚠ Чиглэлүүд нь ТОГТМОЛ: `Math.random()` рендерийн үед ашиглавал
 * server/client зөрж (hydration), мөн React-ийн цэвэр байдлын дүрэм
 * зөрчигдөнө. 24 хэсэг нь өөр өөр өнцөг, зайтай тул нүдэнд санамсаргүй
 * харагдана.
 */
const PIECES = Array.from({ length: 24 }, (_, index) => {
  // Дээш, хоёр тийш тархах өнцөг — 24 хэсгийг тэгш хуваана.
  const angle = (Math.PI / 12) * index - Math.PI / 2;
  const distance = 90 + (index % 5) * 26;

  return {
    dx: `${Math.round(Math.cos(angle) * distance)}px`,
    dy: `${Math.round(Math.sin(angle) * distance + 60)}px`,
    spin: `${(index % 2 === 0 ? 1 : -1) * (180 + index * 12)}deg`,
    delay: `${(index % 6) * 40}ms`,
    color: ["#f59e0b", "#22c55e", "#3b82f6", "#ec4899", "#a855f7", "#ef4444"][index % 6],
    round: index % 3 === 0,
  };
});

export function Confetti({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute left-1/2 top-1/3 z-10 size-0 ${className}`}
    >
      {PIECES.map((piece) => (
        <span
          key={`${piece.dx}${piece.dy}${piece.spin}`}
          className={`confetti-piece absolute block size-2.5 ${piece.round ? "rounded-full" : "rounded-[2px]"}`}
          style={{
            backgroundColor: piece.color,
            animationDelay: piece.delay,
            "--dx": piece.dx,
            "--dy": piece.dy,
            "--spin": piece.spin,
          } as React.CSSProperties}
        />
      ))}
    </span>
  );
}
