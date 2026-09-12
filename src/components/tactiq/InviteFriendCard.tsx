"use client";

import { Gift } from "lucide-react";

import { useApiData } from "@/hooks/useApiData";

type ReferralStats = {
  /** Холбоосоор бүртгүүлсэн найзын тоо (хоног олгогдсон эсэхээс хамаарахгүй). */
  referredCount: number;
  /** Үүнээс хоног ОЛГОГДСОН нь — нөхцөлөө хангасан найзууд. */
  rewardedCount: number;
  earnedDays: number;
  perFriendDays: number;
  maxFriends: number;
  trialDays: number;
  emailVerified: boolean;
};

/**
 * "Найзаа урих" — урилгаар цуглуулсан үнэгүй хоногийн ТАЙЛАН.
 *
 * ⚠ ГРАДИЕНТ БИШ, энгийн `surface`. Хуудсан дээрх тод градиент нь ЗӨВХӨН
 * `MyCodeCard`-д үлдэнэ: хоёр адилхан тод карт зэрэгцвэл аль нь чухал вэ
 * гэдэг ялгарахаа болино. Энэ карт нь тайлан, тэр нь үйлдэл.
 *
 * ⚠ КОД, ХОЛБООС ЭНД БАЙХГҮЙ. Тэдгээр нь хуудсын дээд талын `MyCodeCard`-д
 * — код нь гурван зорилготой (найз урих, найзын хүсэлт, эцэг эх/багшийн
 * холболт) тул зөвхөн урамшууллын карт дотор нуугдаж байх ёсгүй байв. Нэг
 * хуудсан дээр хоёр удаа харуулбал аль нь "жинхэнэ" вэ гэдэг эргэлзээ
 * төрүүлнэ.
 *
 * ⚠ Доорх тоо нь ЗӨВХӨН ТАЙЛАН, "авах" товч БАЙХГҮЙ: хоног нь найз нөхцөлөө
 * хангамагц (имэйлээ баталгаажуулж, эхний хичээлээ дуусгамагц) сервер талд
 * АВТОМАТААР нэмэгддэг (`lib/api/referralReward.ts`).
 *
 * ⚠ "Бүртгүүлсэн" ба "хоног авсан" ХОЁР ӨӨР тоог зэрэг харуулна — эс бөгөөс
 * найзаа урьчихаад хоног нэмэгдээгүй хэрэглэгч алдаа гарсан гэж бодно.
 */
export default function InviteFriendCard({ referredByFriend }: { referredByFriend: boolean }) {
  const { data: stats } = useApiData<ReferralStats>("/api/users/me/referrals");

  return (
    <section className="surface space-y-4 p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
          <Gift className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Найзаа урьж хоног цуглуул!
          </h2>
          {/*
            ⚠ Хязгаар нь УРИХ тоонд БИШ, ХОНОГТ. Найзаа хэдийг ч урьж
            болно (`api/auth/register` дээр ямар ч тоолол байхгүй);
            зөвхөн хоног олгогдох найзын тоо таглагдсан
            (`REFERRAL_MAX_FRIENDS`, `lib/api/referralReward.ts`). Урьд нь
            "Дээд тал нь 15 найз" гэсэн бичвэр нь урих эрх хязгаарлагдсан
            мэт уншигдаж, хэрэглэгчийг зогсоох эрсдэлтэй байв.
          */}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Найз тань имэйлээ баталгаажуулж, эхний хичээлээ дуусгамагц ХОЁУЛАА{" "}
            {stats?.perFriendDays ?? 3} хоногийн үнэгүй Premium. Найзаа
            хязгааргүй урьж болно — хоног нь эхний {stats?.maxFriends ?? 15}{" "}
            найзад олгогдоно.
          </p>
        </div>
      </div>

      {stats && stats.referredCount > 0 && (
        <div className="space-y-1.5 rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <p className="num text-3xl font-extrabold leading-none text-brand-600 dark:text-brand-400">
              {stats.earnedDays}
            </p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              хоног цуглуулсан — хоног авсан {stats.rewardedCount}/
              {stats.maxFriends} найз
            </p>
          </div>

          {/* Бүртгүүлсэн ч хоног нь хараахан олгогдоогүй найзууд */}
          {stats.referredCount > stats.rewardedCount && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Дахин {stats.referredCount - stats.rewardedCount} найз бүртгүүлсэн ч
              эхний хичээлээ дуусгаагүй байна.
            </p>
          )}

          {/*
            ⚠ "Дуусчихлаа" гэсэн мэдрэмж өгөхгүй. Найз урих нь ХЭВЭЭР
            ажиллана — зөвхөн хоног нэмэгдэхээ болино. Үүнийг хэлэхгүй
            бол хэрэглэгч урихаа бүрмөсөн больё гэж ойлгоно.
          */}
          {stats.rewardedCount >= stats.maxFriends && (
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              Хоногийн урамшууллын дээд хязгаарт хүрлээ. Найзаа урих
              боломж хэвээр — тэдэнд өөрсдийнх нь {stats.perFriendDays}{" "}
              хоног олгогдсоор байна.
            </p>
          )}
        </div>
      )}

      {referredByFriend && stats && (
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
          {stats.emailVerified
            ? `🎁 Та найзын урилгаар бүртгүүлсэн — эхний хичээлээ дуусгамагц ${stats.perFriendDays} хоног нэмэгдэнэ.`
            : "🎁 Найзын урамшуулал хүлээгдэж байна — эхлээд имэйлээ баталгаажуулаарай."}
        </p>
      )}
    </section>
  );
}
