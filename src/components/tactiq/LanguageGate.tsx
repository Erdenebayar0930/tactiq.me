"use client";

import { BRAND_NAME, BRAND_PROMISE } from "@/lib/brand";
import { LogoMark } from "@/components/tactiq/Mascot";
import { WelcomeRobotGif } from "@/components/tactiq/LoopGif";

import type { Locale } from "@/lib/i18n/dictionary";

/**
 * ХЭЛ СОНГОХ ПОПАП — аппын АГУУЛГЫН НААНА.
 *
 * Нэвтрээгүй, хэлээ хараахан сонгоогүй хүнд сайт нээгдэх мөчид гарна
 * (`context/LocaleContext.tsx`). Сонголт нь `localStorage`-д хадгалагдах
 * тул ДАХИН гарахгүй.
 *
 * ⚠ БҮТЭН ДЭЛГЭЦ БИШ, ПОПАП: цаана хичээлийн зам, цэс харагдана. Бүтэн
 * дэлгэцээр хаавал шинэ хүн «энэ сайт юу хийдэг вэ» гэдгийг хэл
 * сонгохоосоо ӨМНӨ харж чадахгүй — сонголт нь хийсвэр болно. Цаана
 * агуулга харагдаж байвал «аа, хичээл байна» гэж ойлгоод хэлээ сонгоно.
 *
 * ⚠ ХОЁР БИЧВЭР ЗЭРЭГ (монгол ба англи): энэ дэлгэц нь хэл сонгогдоогүй
 * байх ЦОРЫН ГАНЦ мөч тул түүнийг өөрийг нь аль нэг хэлээр л бичвэл
 * нөгөө хэлний хүн уншиж чадахгүй. Тиймээс гарчиг, тайлбар хоёулаа хоёр
 * хэл дээр.
 *
 * ⚠ `t()` ЭНД ХЭРЭГЛЭХГҮЙ: `t` нь ОДООГИЙН хэлээр (анхдагч монгол)
 * хөрвүүлэх бөгөөд энэ дэлгэцийн гол зорилго нь тэр хэлийг тогтоох —
 * өөрөө өөрийгөө орчуулах нь логик зөрчил.
 *
 * ⚠ ТОМ ТОВЧ (мин. 64px өндөр): хүүхэд, гар утас, түүнчлэн хөгшин
 * хэрэглэгч гурвуулаа эндүүрэлгүй дарах ёстой. Жижиг «mn | en» гэсэн
 * хэлбэр нь энэ мөчид хангалтгүй — сайт танихгүй хүн юу дарахаа
 * хайхгүй.
 */
export function LanguageGate({ onPick }: { onPick: (locale: Locale) => void }) {
  return (
    /*
     * ⚠ ДЭВСГЭР нь БАРААН + бага зэрэг бүдгэрүүлсэн: попап нь цаанаасаа
     * ил ялгарах ёстой, эс бөгөөс замын өнгөт зангилаанууд дээр товч
     * хаана байгаа нь ойлгомжгүй болно.
     *
     * ⚠ ДЭВСГЭР ДАРАХАД ХААГДАХГҮЙ (`onClick` тавиагүй): хэл сонгох нь
     * энэ мөчийн ЦОРЫН ГАНЦ асуулт. Хаачихвал дараагийн хуудсанд дахин
     * гарч, хүн түүнийг «дагуулж яваа саад» гэж мэдэрнэ.
     *
     * ⚠ ГҮЙЛГЭЛТ нь ГАДНА, дундажлал нь ДОТОР (`min-h-full`): `flex
     * items-center` + `overflow-y-auto`-г НЭГ элемент дээр тавибал
     * картын өндөр контейнерээс их байхад ДЭЭД тал нь тайрагдаж,
     * гүйлгээд ч хүрэхгүй болдог (хөтчийн тогтсон зан). Хоёр давхар
     * болгосон нь тэр урхийг хаана — намхан дэлгэц (утасны хэвтээ) дээр
     * карт бүтнээрээ гүйлгэгдэнэ.
     */
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Хэл сонгох · Choose your language"
    >
      <div className="flex min-h-full items-center justify-center p-4">
      <div className="surface w-full max-w-sm space-y-5 p-6 text-center shadow-2xl">
        <div className="flex flex-col items-center gap-2">
          <LogoMark className="size-12" />
          <p className="text-base font-extrabold text-gray-900 dark:text-white">{BRAND_NAME}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{BRAND_PROMISE}</p>
        </div>

        {/*
          ⚠ Дугуй хүрээнд: GIF нь видеоноос гаралтай тул ТУНГАЛАГ БИШ —
          картын цагаан дэвсгэр дээр цайвар дөрвөлжин болж харагдана.
        */}
        <div className="mx-auto size-24 overflow-hidden rounded-full ring-4 ring-brand-100 dark:ring-white/10">
          <WelcomeRobotGif className="size-full object-cover" />
        </div>

        <h1 className="text-base font-bold text-gray-900 dark:text-white">
          Хэлээ сонго
          <span className="mt-0.5 block text-sm font-semibold text-gray-500 dark:text-gray-400">
            Choose your language
          </span>
        </h1>

        {/*
          ⚠ МОНГОЛ НЬ ЭХЭНД: хэрэглэгчдийн дийлэнх нь Монголд, монгол
          хэлтэй. Англи хувилбар нь бодит боловч хоёрдогч.

          ⚠ ТУГИЙН EMOJI ХЭРЭГЛЭХГҮЙ (🇲🇳/🇬🇧): Windows дээрх Chrome,
          Edge нь тугийн дүрсийг зурдаггүй — оронд нь «MN», «GB» гэсэн
          хоёр үсэг үлдэж, товч дээр хэрэггүй товчлол харагдана. Хэлний
          нэр нь өөрөө хангалттай дохио.
        */}
        <button
          type="button"
          onClick={() => onPick("mn")}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-brand-500 px-6 py-5 text-lg font-extrabold text-white shadow-lg shadow-brand-500/25 transition-transform hover:bg-brand-600 active:scale-[0.98]"
        >
          Монгол
        </button>

        <button
          type="button"
          onClick={() => onPick("en")}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-gray-200 px-6 py-5 text-lg font-extrabold text-gray-800 transition-transform hover:bg-gray-50 active:scale-[0.98] dark:border-white/15 dark:text-gray-100 dark:hover:bg-white/5"
        >
          English
        </button>

        {/*
          ⚠ «Дараа солиж болно» гэдгийг ХЭЛНЭ: сонголт нь эргэлт буцалтгүй
          мэт мэдрэгдвэл хүн эргэлзэж, дэлгэц дээр гацна.
        */}
        <p className="text-xs text-gray-400">
          Тохиргооноос дараа ч солиж болно · You can change this later in Settings
        </p>
      </div>
      </div>
    </div>
  );
}
