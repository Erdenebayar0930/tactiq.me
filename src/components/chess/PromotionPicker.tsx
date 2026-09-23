"use client";

import type { Color, PieceSymbol } from "chess.js";

/**
 * ХҮҮ ХУВИРАХ ҮЕИЙН СОНГОЛТ — бэрс, тэрэг, тэмээ, морь.
 *
 * ⚠ УРЬД НЬ СОНГОЛТ ОГТ БАЙГААГҮЙ: `resolveMove` нь хувиргалтыг ЯМАГТ
 * бэрс болгодог байв. Шатрын дүрмээр хүү дөрвөн дүрсийн аль нэг болж
 * чадна — сурагч тэр дүрмийг мэддэг атлаа хөлөг дээр хэрэгжүүлж
 * чадахгүй байсан нь дүрэм ба тоглуулагчийн хооронд зөрүү үүсгэнэ.
 *
 * ⚠ ЯАГААД МОРЬ ХЭРЭГТЭЙ ВЭ: зөвхөн «хамгийн хүчтэйг» сонгодог бол
 * морь руу хувирах нь (шаг өгөх, сэрээ хийх, ПАТ-аас зайлсхийх) огт
 * заагдахгүй. Бэрс нь ЗАРИМДАА пат хийдэг — тэр үед морь л хожуулна.
 *
 * ⚠ ХӨЛГИЙН ДҮРСТЭЙ ЯГ ИЖИЛ ХАРАГДАНА (`ChessBoard`-ын `GLYPH`,
 * `PIECE_LOOK`): өөр дүрс ашиглавал хүүхэд «энэ ямар дүрс вэ?» гэж
 * тааварлана.
 */

const GLYPH: Record<PieceSymbol, string> = {
  p: "♟",
  n: "♞",
  b: "♝",
  r: "♜",
  q: "♛",
  k: "♚",
};

const PIECE_LOOK: Record<Color, string> = {
  w: "text-[#fbf6ea] [-webkit-text-stroke:1px_rgba(94,68,38,0.5)] drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]",
  b: "text-[#33302b] [-webkit-text-stroke:1px_rgba(0,0,0,0.25)] drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]",
};

/**
 * ⚠ ДАРААЛАЛ САНААТАЙ: бэрс эхэнд (99%-д зөв хариулт), морь хамгийн
 * сүүлд. Гэхдээ дөрвүүлээ ИЖИЛ хэмжээтэй — «жинхэнэ» сонголт нэг нь
 * гэдгийг хэмжээгээр нь сануулбал сонголт хийсвэр болно.
 */
const CHOICES: { piece: PieceSymbol; label: string }[] = [
  { piece: "q", label: "Бэрс" },
  { piece: "r", label: "Тэрэг" },
  { piece: "b", label: "Тэмээ" },
  { piece: "n", label: "Морь" },
];

export function PromotionPicker({
  color,
  onPick,
  onCancel,
}: {
  color: Color;
  onPick: (piece: PieceSymbol) => void;
  onCancel: () => void;
}) {
  return (
    /*
     * ⚠ ХӨЛГИЙГ БҮРЭН ХААНА (`absolute inset-0`): сонголт хийгдэх хүртэл
     * өөр нүүдэл хийх боломжгүй байх ёстой — эс бөгөөс хүү хоёр газар
     * зэрэг байх төлөв үүснэ.
     */
    <div className="absolute inset-0 z-20 grid place-items-center rounded-2xl bg-black/50 p-4">
      <div className="w-full max-w-xs space-y-3 rounded-2xl bg-white p-4 shadow-xl dark:bg-gray-800">
        <p className="text-center text-sm font-bold text-gray-900 dark:text-white">
          Хүү хувирлаа! Ямар дүрс болох вэ?
        </p>

        <div className="grid grid-cols-4 gap-2">
          {CHOICES.map((choice) => (
            <button
              key={choice.piece}
              type="button"
              onClick={() => onPick(choice.piece)}
              className="flex flex-col items-center gap-1 rounded-xl bg-[#d9b382] py-2 transition hover:-translate-y-0.5 hover:brightness-105"
            >
              <span className={`text-4xl leading-none ${PIECE_LOOK[color]}`}>
                {GLYPH[choice.piece]}
              </span>
              <span className="text-[11px] font-bold text-[#5e4426]">{choice.label}</span>
            </button>
          ))}
        </div>

        {/*
          ⚠ БОЛИХ ТОВЧ ЗААВАЛ: хүүхэд буруу нүдэнд хүүгээ аваачаад
          гэнэт дөрвөн дүрсийн сонголт гарч ирэхэд «би юу ч сонгохгүй»
          гэх гарц байх ёстой. Байхгүй бол хүчээр нүүдэл хийлгэнэ.
        */}
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-xl py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
        >
          Болих
        </button>
      </div>
    </div>
  );
}
