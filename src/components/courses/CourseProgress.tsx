/** Явцын бар — ногооноор дүүргэж (ахиц = амжилт), хувийг баруун талд. */
const PROGRESS_COLOR = "#22c55e";

export function CourseProgress({ value }: { value: number }) {
  const percent = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Курсын явц"
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${percent}%`, backgroundColor: PROGRESS_COLOR }}
        />
      </div>
      <span className="num shrink-0 text-xs font-bold text-gray-700 dark:text-gray-200">
        {percent}%
      </span>
    </div>
  );
}
