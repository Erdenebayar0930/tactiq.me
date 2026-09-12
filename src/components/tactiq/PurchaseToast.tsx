"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";

/**
 * ХУДАЛДАН АВАЛТЫН БАТАЛГАА — дэлгэцийн дээд талд ТОМООР гарч ирнэ.
 *
 * ⚠ ЯАГААД ТОГТМОЛ (fixed) БАЙРЛАЛТАЙ ВЭ: урьд нь баталгаа нь тухайн
 * хэсгийн ДОТОР жижиг ногоон мөр байсан. Дэлгүүр нь урт хуудас тул
 * хэрэглэгч доод хэсэгт байхад дээр гарсан мессежийг ХАРАХГҮЙ өнгөрдөг —
 * «худалдан авалт болсон уу?» гэсэн эргэлзээ төрүүлж, зарим нь дахин
 * дардаг. Тогтмол байрлалтай, том баталгаа нь хаана байхаас үл хамааран
 * ХАРАГДАНА.
 *
 * ⚠ `pointer-events-none` — баталгаа нь дэлгэцийн дээд хэсгийг түр
 * халхалдаг. Товшилтыг таслах юм бол доор нь байгаа товч дарагдахгүй
 * болно (жишээ нь хэрэглэгч дараагийн зүйлээ хурдан авах гэж байхад).
 */
export default function PurchaseToast({
  emoji,
  title,
  detail,
  onDone,
  ms = 2600,
}: {
  /** Авсан зүйлийн дүрс — эможи эсвэл товч тэмдэг. */
  emoji?: string;
  title: string;
  detail?: string;
  /** Хугацаа дуусахад дуудагдана — эцэг компонент төлөвөө цэвэрлэнэ. */
  onDone: () => void;
  ms?: number;
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, ms);
    return () => clearTimeout(timer);
    // ⚠ `onDone` нь эцэг дахин зурагдах бүрд шинэ функц байж болзошгүй тул
    // хамаарлаас ХАССАН: эс бөгөөс таймер дахин дахин эхэлж, баталгаа
    // хэзээ ч алга болохгүй.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex max-w-md items-center gap-3 rounded-2xl bg-emerald-500 px-5 py-4 text-white shadow-xl shadow-emerald-500/30">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/20 text-3xl">
          {emoji ?? <Check className="size-7" aria-hidden />}
        </span>

        <div className="min-w-0">
          <p className="text-base font-extrabold leading-tight">{title}</p>
          {detail && <p className="mt-0.5 text-sm text-white/90">{detail}</p>}
        </div>
      </div>
    </div>
  );
}
