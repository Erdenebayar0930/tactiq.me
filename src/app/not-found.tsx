import Link from "next/link";

import { Mascot } from "@/components/tactiq/Mascot";

/**
 * 404 — олдоогүй хуудас.
 *
 * Root түвшинд байрлана: аль ч route бүлгийн гадна унасан хаяг энд ирнэ.
 * Тиймээс апп-ын хүрээ (толгой хэсэг, цэс) байхгүй — нэвтрээгүй зочин ч
 * хүрч болно.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <Mascot className="size-32" mood="think" />

      <div>
        <p className="num text-5xl font-extrabold text-brand-500">404</p>
        <h1 className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
          Ийм хуудас олдсонгүй
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Хаяг буруу бичигдсэн, эсвэл хуудас зөөгдсөн байж магадгүй.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Link
          href="/profile"
          className="rounded-xl bg-brand-500 px-5 py-2.5 font-semibold text-white hover:bg-brand-600"
        >
          Профайл руу
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-gray-300 px-5 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/15 dark:text-gray-200 dark:hover:bg-white/5"
        >
          Нүүр хуудас
        </Link>
      </div>
    </div>
  );
}
