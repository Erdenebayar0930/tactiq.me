"use client";

import { pointLabel, starPoints, type GoPosition } from "@/lib/go/position";

/**
 * Го-гийн хөлөг.
 *
 * ⚠ Шатар/даамын хөлгөөс ҮНДСЭН ЯЛГАА: чулуу нүдэн дотор БИШ, шугамын
 * ОГТЛОЛЦОЛ дээр тавигдана. Тиймээс энд «нүд» гэж юу ч зурахгүй — нүд
 * бүр нь огтлолцлын ЭЗЭМШИЛ ТАЛБАЙ бөгөөд шугамууд нь түүний голоор
 * татагдана. Захын огтлолцол дээр шугам зөвхөн ДОТОГШ үргэлжилнэ, эс
 * бөгөөс хөлгийн гадна тал «сахалтай» харагдана.
 */
export function GoBoard({
  position,
  onPlay,
  interactive = false,
  lastMove = null,
  hints = [],
}: {
  position: GoPosition;
  onPlay?: (index: number) => void;
  interactive?: boolean;
  /** Сүүлд тавигдсан чулуу — цагаан/хар тэмдэглэгээ гарна */
  lastMove?: number | null;
  /** Тодруулах огтлолцлууд (жишээ нь «энд тогло» гэсэн зөвлөмж) */
  hints?: number[];
}) {
  const { size } = position;
  const stars = new Set(starPoints(size));
  const hintSet = new Set(hints);

  return (
    <div
      className="mx-auto grid w-full max-w-md rounded-xl bg-amber-200 p-3 shadow-inner dark:bg-amber-300/90"
      style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, aspectRatio: "1 / 1" }}
    >
      {position.cells.map((stone, index) => {
        const x = index % size;
        const y = Math.floor(index / size);
        const label = pointLabel(size, index);

        return (
          <button
            key={index}
            type="button"
            // Хоосон огтлолцол дээр л дарж болно — дүүрсэн цэг дээрх
            // дарлага ямар ч утгагүй (го-д чулуу хөдөлдөггүй).
            disabled={!interactive || stone !== null}
            onClick={() => onPlay?.(index)}
            aria-label={`${label}${stone ? (stone === "b" ? " (хар)" : " (цагаан)") : ""}`}
            className="relative aspect-square disabled:cursor-default"
          >
            {/* Хэвтээ шугам — зүүн/баруун захад голоос нь эхэлж/дуусна */}
            <span
              aria-hidden
              className="absolute top-1/2 h-px -translate-y-1/2 bg-amber-900/70"
              style={{ left: x === 0 ? "50%" : 0, right: x === size - 1 ? "50%" : 0 }}
            />
            {/* Босоо шугам */}
            <span
              aria-hidden
              className="absolute left-1/2 w-px -translate-x-1/2 bg-amber-900/70"
              style={{ top: y === 0 ? "50%" : 0, bottom: y === size - 1 ? "50%" : 0 }}
            />

            {stars.has(index) && !stone && (
              <span
                aria-hidden
                className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-900/70"
              />
            )}

            {hintSet.has(index) && !stone && (
              <span
                aria-hidden
                className="absolute left-1/2 top-1/2 size-[70%] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-2 border-brand-500"
              />
            )}

            {stone && (
              <span
                aria-hidden
                className={`absolute left-1/2 top-1/2 size-[86%] -translate-x-1/2 -translate-y-1/2 rounded-full shadow ${
                  stone === "b"
                    ? "bg-gray-900"
                    : "border border-gray-400 bg-white"
                }`}
              >
                {lastMove === index && (
                  <span
                    className={`absolute left-1/2 top-1/2 size-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                      stone === "b" ? "bg-white" : "bg-gray-900"
                    }`}
                  />
                )}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
