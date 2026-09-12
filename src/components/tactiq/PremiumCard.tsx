"use client";

import { useState } from "react";
import Link from "next/link";
import { Crown } from "lucide-react";

import { useCurrentUser } from "@/context/UserContext";

/**
 * Premium эрхийн ТӨЛӨВ — профайлын дээд хэсэгт.
 *
 * ⚠ Энэ нь `/premium` хуудасны ХУДАЛДААНЫ блок БИШ, зөвхөн "эрх маань
 * идэвхтэй юү, хэдэн хоног үлдсэн бэ" гэдгийг хэлнэ. Өмнө нь эрхийн төлөв
 * хуудасны ЁРООЛД, "Premium" гэсэн энгийн саарал мөр байсан тул хэрэглэгч
 * эрх нь дуусахыг ХАРАХГҮЙ өнгөрөөх бүрэн боломжтой байв.
 *
 * ⚠ Туршилтын хугацааг тусад нь ЯЛГАЖ ХАРУУЛАХГҮЙ. Санд `isTrial` гэсэн
 * туг байхгүй — туршилт ба төлбөрт эрх ХОЁУЛАА `users.premiumUntil` дээр л
 * суудаг (`lib/billing.ts`). Тиймээс "туршилт" гэж бичих гэвэл таамаглал
 * хийх (жишээ нь "3 хоногоос бага бол туршилт") болох ба сунгасан хүнийг
 * ХУДАЛ "туршилттай" гэж хэлнэ. Үлдсэн хоног нь аль ч тохиолдолд зөв.
 */
export default function PremiumCard() {
  const user = useCurrentUser();

  const until = user.premiumUntil ? new Date(user.premiumUntil) : null;

  /*
   * ⚠ Цагийг рендэрийн БИЕ дотор уншихгүй. `Date.now()` нь цэвэр биш тул
   * рендэр бүрд өөр утга буцаана — React дурын үед дахин рендэрлэх эрхтэй
   * бөгөөд тэр бүрд "үлдсэн хоног" чимээгүйхэн өөрчлөгдөнө. `useState`-ийн
   * залхуу эхлүүлэгч нь mount-д НЭГ л удаа ажиллах тул утга нь тогтвортой.
   *
   * Хугацаа өнгөрөхийг ХАРУУЛАХ шаардлагагүй: "3 хоног үлдлээ" гэсэн тоо
   * нэг суултын дунд өөрчлөгдөх ёсгүй.
   */
  const [now] = useState(() => Date.now());

  /*
   * Идэвхтэй эсэхийг СЕРВЭР шийднэ (`lib/api/publicUser.ts`-ийн `isPremium`)
   * — клиентийн цаг буруу тохируулагдсан байж болох ба эрхийн цорын ганц
   * эх сурвалж нь сервер. Энд шалгаад буцаах нь `until`-ыг мөн НАРИЙСГАНА.
   */
  if (!user.isPremium || !until) return <InactiveCard />;

  /*
   * Дээш ДУГААРЛАНА (`ceil`): өнөөдөр 18:00-д дуусах эрхийг "0 хоног" гэвэл
   * хэрэглэгч аль хэдийн дууссан гэж ойлгоно. Үлдсэн бүтэн бус өдрийг ч
   * "1 хоног" гэж тоолох нь бодит байдалд ойр.
   */
  const daysLeft = Math.max(0, Math.ceil((until.getTime() - now) / 86_400_000));

  // 7 хоногоос бага үлдсэн бол сануулга өнгө аяс — "бүх зүйл хэвийн" гэсэн
  // ижилхэн мессежийн дунд дуусах гэж буй эрх алдагдах ёсгүй.
  const ending = daysLeft <= 7;

  return (
    <section
      className={`flex items-center gap-4 rounded-2xl p-4 ring-1 ${
        ending
          ? "bg-gold-100 ring-gold-400 dark:bg-gold-500/15 dark:ring-gold-500/40"
          : "bg-gold-50 ring-gold-300 dark:bg-gold-500/10 dark:ring-gold-500/30"
      }`}
    >
      {/*
        Ханхайсан шаргал ГРАДИЕНТ зөвхөн ДҮРСНИЙ дээр — бүтэн картыг ингэж
        буджээ гэвэл цагаан бичиг нь шаргал дээр уншигдахгүй (тодролын
        харьцаа ~2:1). Дэвсгэр нь цайвар шаргал, бичиг нь бараан шаргал:
        өнгө нь ижил хэвээр, уншигдац нь 6:1 дээш.
      */}
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-gold-400 to-amber-500 text-white shadow-sm">
        <Crown className="size-6" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-bold text-gold-900 dark:text-gold-100">
          Premium идэвхтэй
        </p>
        <p className="mt-0.5 text-sm text-gold-800 dark:text-gold-200/90">
          <span className="num font-bold">{daysLeft}</span> хоног үлдлээ ·{" "}
          <span className="num">{until.toLocaleDateString("mn-MN")}</span> хүртэл
        </p>
      </div>

      <Link
        href="/premium"
        className="shrink-0 whitespace-nowrap rounded-full bg-gold-400 px-4 py-2 text-sm font-bold text-gold-900 transition-colors hover:bg-gold-300"
      >
        Сунгах
      </Link>
    </section>
  );
}

/**
 * Эрхгүй үе.
 *
 * ⚠ Энэ хэсгийг ОГТ НУУХГҮЙ. Нуувал "Premium" гэдэг зөвхөн эрхтэй хүнд
 * харагдах болж, эрх нь дууссан хүн юу өөрчлөгдснөө ойлгохгүй үлдэнэ.
 * Харин өнгийг нь БУУРУУЛНА — идэвхгүй төлөв нь идэвхтэйтэй ижил анхаарал
 * татах ёсгүй.
 */
function InactiveCard() {
  return (
    <Link
      href="/premium"
      className="surface flex items-center gap-4 p-4 ring-1 ring-gold-200 transition-shadow hover:shadow-md dark:ring-gold-500/20"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gold-100 text-gold-600 dark:bg-gold-500/15 dark:text-gold-300">
        <Crown className="size-6" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-bold text-gray-900 dark:text-white">Premium идэвхгүй</p>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Хязгааргүй зүрх, бүх хичээл нээлттэй.
        </p>
      </div>

      <span className="shrink-0 whitespace-nowrap rounded-full bg-gold-400 px-4 py-2 text-sm font-bold text-gold-900">
        Авах
      </span>
    </Link>
  );
}
