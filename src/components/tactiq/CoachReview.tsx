import { Icon } from "@/components/tactiq/Icon";
import { COACHES } from "@/lib/tactiq/coaches";
import { QUALITY_META, QUALITY_ORDER } from "@/lib/tactiq/moveQuality";

import type { GameReview, ReviewedMove } from "@/lib/tactiq/moveQuality";

/**
 * "Robo Coach" — тоглоомын дараах шинжилгээний карт.
 *
 * ⚠ ТОГЛООМООС ХАМААРАЛГҮЙ. Шатар, даам хоёулаа `GameReview` (нэг л хэлбэр)
 * буцаадаг тул энэ компонент хоёуланд нь ажиллана — урьд нь `components/chess/`
 * дотор байсныг ЭНД зөөв. Тоглоом тус бүрт хуулбарлавал нэг дээр нь тэмдэг
 * нэмээд нөгөөг нь мартах нь цаг хугацааны асуудал.
 *
 * Бүртгэлийн үед сонгосон дасгалжуулагчийг (`coachId`) ашиглана — аватар,
 * нэр бүгд `lib/tactiq/coaches.ts`-с ирнэ.
 */

function worstMove(review: GameReview): ReviewedMove | null {
  if (review.moves.length === 0) return null;
  return review.moves.reduce((worst, move) => (move.loss > worst.loss ? move : worst));
}

/** Онцлох ХАМГИЙН САЙХАН нүүдэл — гайхалтай нь эхэнд, дараа нь онцгой. */
function highlightMove(review: GameReview): ReviewedMove | null {
  return (
    review.moves.find((move) => move.quality === "brilliant") ??
    review.moves.find((move) => move.quality === "great") ??
    null
  );
}

/**
 * Дасгалжуулагчийн санаа — chess.com-ийн бус, өөрсдийн энгийн Монгол өгүүлбэр.
 *
 * САЙНААР эхэлнэ: гайхалтай нүүдэл олсон бол хамгийн түрүүнд түүнийг магтана.
 * Хүүхэд эхний өгүүлбэрээ уншаад цонхыг хаадаг тул тэр өгүүлбэр нь алдааны
 * жагсаалт биш, урам байх нь чухал.
 */
function coachComment(review: GameReview): string {
  const gem = highlightMove(review);
  const worst = worstMove(review);

  const praise =
    gem?.quality === "brilliant"
      ? `${gem.moveNumber}-р нүүдэл (${gem.notation}) бол гайхалтай золиос байлаа! `
      : gem?.quality === "great"
        ? `${gem.moveNumber}-р нүүдэлд (${gem.notation}) цорын ганц зөв замыг оллоо. `
        : "";

  if (!worst || !QUALITY_META[worst.quality].isError) {
    return `${praise}Алдаагүй, цэвэрхэн тоглолт боллоо.`;
  }

  const hint = worst.bestNotation ? ` ${worst.bestNotation} илүү хүчтэй байсан.` : "";

  if (worst.quality === "inaccuracy") {
    return `${praise}Ерөнхийдөө сайн тоглолоо. ${worst.moveNumber}-р нүүдэл (${worst.notation}) арай оновчгүй байв.${hint}`;
  }
  if (worst.quality === "mistake") {
    return `${praise}${worst.moveNumber}-р нүүдэлд (${worst.notation}) алдаа гарлаа.${hint}`;
  }
  return `${praise}${worst.moveNumber}-р нүүдэлд (${worst.notation}) том алдаа гарлаа!${hint} Дараагийн удаа илүү болгоомжтой байгаарай.`;
}

export function CoachReview({
  coachId,
  review,
}: {
  coachId: string | null | undefined;
  review: GameReview;
}) {
  const coach = COACHES.find((entry) => entry.id === coachId) ?? COACHES[0];

  /*
   * Жагсаалтад АЛДААНУУД болон ОНЦЛОХ нүүдлүүд хоёулаа орно.
   * Урьд нь зөвхөн алдааг харуулдаг байсан — тэгэхээр сайн тоглосон
   * хүүхдийн дэлгэц хоосон үлдэж, "гайхалтай" нүүдэл нь хаана ч
   * харагдахгүй байв. Тоглоомын дарааллаар эрэмбэлнэ.
   */
  const listed = review.moves.filter(
    (move) =>
      QUALITY_META[move.quality].isError ||
      move.quality === "brilliant" ||
      move.quality === "great"
  );

  return (
    <div className="surface space-y-4 p-5">
      <div className="flex items-start gap-3">
        <span
          className={`grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br text-white ${coach.gradient}`}
        >
          <Icon name={coach.icon} className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 dark:text-white">{coach.name}</p>
          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">
            {coachComment(review)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-4 dark:bg-white/5">
        <div className="shrink-0 text-center">
          <p className="num text-2xl font-extrabold text-brand-600 dark:text-brand-400">
            {review.accuracy}%
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">нарийвчлал</p>
        </div>
        <div className="flex flex-1 flex-wrap gap-2">
          {QUALITY_ORDER.filter((quality) => review.counts[quality] > 0).map((quality) => (
            <span
              key={quality}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${QUALITY_META[quality].badge}`}
            >
              <span
                className={`size-1.5 rounded-full ${QUALITY_META[quality].dot}`}
                aria-hidden
              />
              {QUALITY_META[quality].label} {review.counts[quality]}
            </span>
          ))}
        </div>
      </div>

      {listed.length > 0 && (
        <div className="max-h-52 space-y-1.5 overflow-y-auto">
          {listed.map((move) => (
            <div
              key={move.ply}
              className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <span className="min-w-0 font-medium text-gray-700 dark:text-gray-200">
                <span className="num">{move.moveNumber}.</span> {move.notation}
                <span className="font-bold">{QUALITY_META[move.quality].symbol}</span>
                {move.bestNotation && (
                  <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500">
                    ({move.bestNotation} дээр байсан)
                  </span>
                )}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${QUALITY_META[move.quality].badge}`}
              >
                {QUALITY_META[move.quality].label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
