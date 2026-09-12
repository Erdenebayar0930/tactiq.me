"use client";

import { Clock, Gem, Handshake, Trophy } from "lucide-react";

/**
 * Найзтай хамтын даалгавар — Duolingo-гийн "Friends Quest" бүтцээр.
 *
 * ⚠ БАННЕР + ДАВХАРЛАСАН ЦАГААН КАРТ гэсэн хоёр давхарга. Урьд нь бүхэлдээ
 * нэг өнгөт карт байсан бөгөөд явцын зураас нь тэр өнгөн дээр цагаанаар
 * зурагдаж, тоо нь бүдэг харагддаг байв. Зорилт, ахиц хоёр бол хамгийн
 * чухал мэдээлэл тул тэдгээрийг ЦАГААН гадаргуу дээр гаргав — уншигдац
 * хамгийн өндөр.
 */

export type Quest = {
  weekKey: string;
  goalXp: number;
  myXp: number;
  friendXp: number;
  totalXp: number;
  percent: number;
  daysLeft: number;
  completed: boolean;
  friend: { uid: string; displayName: string; photoUrl: string | null };
};

/** Миний хувь нэмрийн өнгө (цайвар) ба найзынх (бараан). */
const MY_COLOR = "#818cf8";
const FRIEND_COLOR = "#4338ca";

export default function FriendQuestCard({
  quest,
  rewardGems,
}: {
  quest: Quest;
  rewardGems: number;
}) {
  /*
   * Зураас нь ХОЁР ХЭСГЭЭС бүрдэнэ — хэн хэдийг оруулснаа шууд харна.
   *
   * ⚠ Хувийг НИЙТ зорилтоос тооцно, нийлбэрээс биш: хоёуланг нь
   * нийлбэрээс тооцвол зураас үргэлж 100% дүүрэн харагдана.
   */
  const myPercent = Math.min(100, (quest.myXp / quest.goalXp) * 100);
  const friendPercent = Math.min(100 - myPercent, (quest.friendXp / quest.goalXp) * 100);

  return (
    <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-brand-600 shadow-md">
      <div className="relative px-5 pt-5 pb-16 text-white">
        <h2 className="text-xl font-extrabold">Хамтын даалгавар</h2>

        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-white/85">
          <Clock className="size-4 shrink-0" aria-hidden />
          {quest.daysLeft === 1 ? (
            "Сүүлийн өдөр"
          ) : (
            <>
              <span className="num">{quest.daysLeft}</span> өдөр үлдлээ
            </>
          )}
        </p>

        {/*
          Чимэглэлийн дүрс. `aria-hidden` бөгөөд `pointer-events-none` —
          зөвхөн харагдац, агуулга биш.
        */}
        <Handshake
          className="pointer-events-none absolute -top-2 right-2 size-28 text-white/15"
          aria-hidden
        />
      </div>

      {/*
        ⚠ `-mt-12` — цагаан карт баннер дээр ДАВХАРЛАНА. Хоёрыг зэрэгцүүлж
        тавибал энгийн хоёр блок болж, "нэг зүйлийн хоёр давхарга" гэсэн
        харагдац алдагдана.
      */}
      <div className="-mt-12 rounded-2xl bg-white p-5 shadow-lg dark:bg-gray-900">
        <p className="font-bold text-gray-900 dark:text-white">
          <span className="num">{quest.goalXp}</span> оноо хамтдаа цуглуул
        </p>

        <div className="mt-3 flex items-center gap-3">
          <div className="relative h-5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
            <div className="flex h-full">
              <div
                className="h-full transition-[width] duration-500"
                style={{ width: `${myPercent}%`, backgroundColor: MY_COLOR }}
              />
              <div
                className="h-full transition-[width] duration-500"
                style={{ width: `${friendPercent}%`, backgroundColor: FRIEND_COLOR }}
              />
            </div>

            {/*
              ⚠ Тоо нь зураасны ДЭЭР, төвд. Зураасны хажууд тавибал нарийн
              дэлгэцэнд зураас 60px болж шахагдана.
            */}
            <span className="num absolute inset-0 grid place-items-center text-xs font-bold text-gray-600 mix-blend-luminosity dark:text-gray-200">
              {quest.totalXp} / {quest.goalXp}
            </span>
          </div>

          {/* Шагнал — зураасны ТӨГСГӨЛД, "хаашаа явж байна" гэдгийг харуулна. */}
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-xl transition-colors ${
              quest.completed
                ? "bg-gradient-to-br from-gold-400 to-amber-500 text-white"
                : "bg-gray-100 text-gray-400 dark:bg-white/10 dark:text-gray-500"
            }`}
            title={`Шагнал: ${rewardGems} зоос`}
          >
            {quest.completed ? (
              <Trophy className="size-5" aria-hidden />
            ) : (
              <Gem className="size-5" aria-hidden />
            )}
          </span>
        </div>

        <ul className="mt-4 space-y-2">
          <ContributionRow color={MY_COLOR} name="Та" xp={quest.myXp} />
          <ContributionRow
            color={FRIEND_COLOR}
            name={quest.friend.displayName}
            xp={quest.friendXp}
          />
        </ul>

        {quest.completed ? (
          <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
            🎉 Даалгавар биеллээ! Хоёуланд чинь{" "}
            <span className="num">{rewardGems}</span> зоос нэмэгдсэн.
          </p>
        ) : (
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Хүрвэл хоёуланд <span className="num font-semibold">{rewardGems}</span>{" "}
            зоос. Хэн хэдийг оруулсан нь хамаагүй — нийлбэрээр дүгнэнэ.
          </p>
        )}
      </div>
    </section>
  );
}

function ContributionRow({
  color,
  name,
  xp,
}: {
  color: string;
  name: string;
  xp: number;
}) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className="size-3 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
        {name}
      </span>
      <span className="num shrink-0 text-sm font-semibold text-gray-500 dark:text-gray-400">
        {xp} XP
      </span>
    </li>
  );
}
