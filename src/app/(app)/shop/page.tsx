"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Coins, Snowflake } from "lucide-react";

import { useUser } from "@/context/UserContext";
import { ErrorNote } from "@/components/tactiq/ui";
import PurchaseToast from "@/components/tactiq/PurchaseToast";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { sfx } from "@/lib/audio/sfx";
import {
  backgroundClass,
  bannerGradient,
  frameRing,
  SHOP_BACKGROUNDS,
  SHOP_BANNERS,
  SHOP_FRAMES,
} from "@/lib/tactiq/shop";
import { PET_SPECIES } from "@/lib/tactiq/pets";
import { STREAK_FREEZE_COST_GEMS } from "@/lib/streakFreeze";

import type { PublicUser } from "@/lib/api/publicUser";

/**
 * ЗООСНЫ ДЭЛГҮҮР.
 *
 * ⚠ Дэлгүүрт байгаа бүх зүйл нь ГОО ЗҮЙН эсвэл ТУСЛАХ шинжтэй — суралцах
 * явцад давуу эрх ОГТ өгөхгүй (`lib/tactiq/shop.ts`-ийн тайлбарыг үзнэ үү).
 * «Зүрх» (амь) хасагдсаны дараа зоос нь цорын ганц дотоод эдийн засаг болсон
 * тул түүнийг зарцуулах утга учиртай зам хэрэгтэй болсон.
 */
export default function ShopPage() {
  const { user, apply } = useUser();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /**
   * Худалдан авалтын БАТАЛГАА — дэлгэцийн дээд талд томоор гарна.
   *
   * ⚠ Урьд нь баталгаа нь тухайн хэсгийн дотор жижиг ногоон мөр байсан
   * бөгөөд дэлгүүр урт хуудас тул хэрэглэгч доор байхад ХАРАГДДАГГҮЙ
   * байв — «болсон уу?» гэсэн эргэлзээ төрүүлж, зарим нь дахин дардаг.
   */
  const [toast, setToast] = useState<{ emoji?: string; title: string; detail?: string } | null>(
    null
  );

  if (!user) return null;

  const owned = user.ownedFrames ?? [];
  const ownedBanners = user.ownedBanners ?? [];
  const ownedBackgrounds = user.ownedBackgrounds ?? [];

  const act = async (
    id: string,
    action: "buy" | "equip",
    kind: "frame" | "banner" | "background" = "frame",
    /** Баталгаанд харуулах нэр — зөвхөн худалдан авалтад. */
    label?: string
  ) => {
    setBusy(kind + id + action);
    setError(null);
    try {
      const data = await apiFetch<{ user: PublicUser }>("/api/shop", {
        method: "POST",
        body: { action, kind, itemId: id },
      });
      apply(data.user);

      if (action === "buy") {
        sfx.coin();
        setToast({
          title: "Худалдан авлаа!",
          detail: label ? `${label} — идэвхжлээ` : "Идэвхжлээ",
        });
      }
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Алдаа гарлаа.");
    } finally {
      setBusy(null);
    }
  };

  /**
   * Тэжээвэр худалдаж авах.
   *
   * ⚠ Авмагц `/pets` рүү ШИЛЖҮҮЛЭХГҮЙ, зөвхөн мэдэгдэнэ: хүүхэд
   * дэлгүүрээ үзсээр байхыг хүсэж болно. Харин асаргааны заавар нь
   * тэжээврийн хуудсанд байгаа тул холбоосыг ил гаргана.
   */
  const buyPet = async (speciesId: string) => {
    setBusy("pet" + speciesId);
    setError(null);
    setToast(null);
    try {
      const res = await apiFetch<{ gems: number }>("/api/pets", {
        method: "POST",
        body: { action: "buy", species: speciesId },
      });
      apply({ ...user, gems: res.gems });
      sfx.coin();
      setToast({
        emoji: PET_SPECIES.find((item) => item.id === speciesId)?.emoji,
        title: "Тэжээвэр авлаа!",
        detail: "«Миний тэжээвэр» хуудаснаас асарна уу",
      });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Алдаа гарлаа.");
    } finally {
      setBusy(null);
    }
  };

  const buyFreeze = async () => {
    setBusy("freeze");
    setError(null);
    try {
      const data = await apiFetch<{ user: PublicUser }>("/api/learn/streak", {
        method: "POST",
      });
      apply(data.user);
      sfx.coin();
      setToast({ emoji: "❄️", title: "Хамгаалагч авлаа!", detail: "Дараалал тань аюулгүй" });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Алдаа гарлаа.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Дэлгүүр</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Хичээл дуусгаж цуглуулсан зоосоороо худалдан аваарай.
          </p>
        </div>

        <span className="flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 font-bold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
          <Coins className="size-4" aria-hidden />
          <span className="num">{user.gems.toLocaleString("mn-MN")}</span>
        </span>
      </div>

      {toast && (
        <PurchaseToast
          emoji={toast.emoji}
          title={toast.title}
          detail={toast.detail}
          onDone={() => setToast(null)}
        />
      )}

      {error && <ErrorNote message={error} />}

      {/* --- Тусламж: дараалал хамгаалагч --- */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Тусламж</h2>

        <div className="surface flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300">
              <Snowflake className="size-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 dark:text-white">Дараалал хамгаалагч</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Нэг өдөр алгасахад дараалал тасрахаас хамгаална. Танд одоо{" "}
                <span className="num font-semibold">{user.streakFreezes ?? 0}</span> ширхэг байна.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void buyFreeze()}
            disabled={busy !== null || user.gems < STREAK_FREEZE_COST_GEMS}
            className="btn-primary shrink-0 px-5 py-2.5 text-sm disabled:opacity-50"
          >
            {busy === "freeze" ? "…" : `${STREAK_FREEZE_COST_GEMS} зоос`}
          </button>
        </div>
      </section>

      {/* --- Амьтан ба цэцэг --- */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Амьтан ба цэцэг
          </h2>
          <Link href="/pets" className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300">
            Миний тэжээвэр →
          </Link>
        </div>


        <div className="grid gap-3 sm:grid-cols-2">
          {PET_SPECIES.map((species) => (
            <div key={species.id} className="surface flex items-center gap-3 p-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gray-100 text-3xl dark:bg-white/10">
                {species.emoji}
              </span>

              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-900 dark:text-white">{species.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{species.description}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {species.careLabel}: {species.careCost} зоос / өдөр
                </p>
              </div>

              <button
                type="button"
                onClick={() => void buyPet(species.id)}
                disabled={busy !== null || user.gems < species.price}
                className="btn-primary shrink-0 px-3 py-1.5 text-xs disabled:opacity-50"
              >
                {busy === "pet" + species.id ? "…" : <><span className="num">{species.price}</span> зоос</>}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* --- Аватарын хүрээ --- */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Аватарын хүрээ</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          {SHOP_FRAMES.map((frame) => {
            const isOwned = owned.includes(frame.id);
            const isEquipped = user.avatarFrame === frame.id;

            return (
              <div key={frame.id} className="surface flex items-center gap-3 p-4">
                {/*
                  Урьдчилсан харагдац нь ХЭРЭГЛЭГЧИЙН ӨӨРИЙНХ нь аватар дээр —
                  хийсвэр дугуй дээр биш. Хүрээ өөрийнх нь зураг дээр яаж
                  харагдахыг авахаасаа өмнө харах ёстой.
                */}
                <span
                  className={`grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-100 font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200 ${frameRing(frame.id)}`}
                >
                  {user.photoUrl ? (
                    /* Firebase Storage-ийн URL нь remotePatterns-д
                       бүртгэгдээгүй бөгөөд аватар нь 48px тул оновчлол
                       шаардлагагүй. */
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.photoUrl} alt="" className="size-full object-cover" />
                  ) : (
                    (user.displayName || user.email || "?").charAt(0).toUpperCase()
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-900 dark:text-white">{frame.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{frame.hint}</p>
                </div>

                {isEquipped ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    <Check className="size-3.5" aria-hidden />
                    Зүүсэн
                  </span>
                ) : isOwned ? (
                  <button
                    type="button"
                    onClick={() => void act(frame.id, "equip")}
                    disabled={busy !== null}
                    className="shrink-0 rounded-xl border-2 border-brand-500 px-3 py-1.5 text-xs font-semibold text-brand-600 disabled:opacity-50 dark:text-brand-300"
                  >
                    Зүүх
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void act(frame.id, "buy", "frame", frame.label)}
                    disabled={busy !== null || user.gems < frame.gems}
                    className="btn-primary shrink-0 px-3 py-1.5 text-xs disabled:opacity-50"
                  >
                    <span className="num">{frame.gems}</span> зоос
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {user.avatarFrame && (
          <button
            type="button"
            onClick={() => void act("", "equip")}
            disabled={busy !== null}
            className="text-sm text-gray-500 underline hover:text-gray-700 disabled:opacity-50 dark:text-gray-400"
          >
            Хүрээг тайлах
          </button>
        )}
      </section>

      {/* --- Профайлын банер --- */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Профайлын банер</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Профайлын дээд банерийн өнгө. Авсан тэжээвэр тань мөн тэнд харагдана.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {SHOP_BANNERS.map((banner) => {
            const isOwned = ownedBanners.includes(banner.id);
            const isEquipped = user.bannerTheme === banner.id;

            return (
              <div key={banner.id} className="surface overflow-hidden p-0">
                {/* Урьдчилсан харагдац — жинхэнэ банерийн налуугаар. */}
                <div className={`h-16 w-full ${bannerGradient(banner.id)}`} />

                <div className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 dark:text-white">{banner.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{banner.hint}</p>
                  </div>

                  {isEquipped ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                      <Check className="size-3.5" aria-hidden />
                      Зүүсэн
                    </span>
                  ) : isOwned ? (
                    <button
                      type="button"
                      onClick={() => void act(banner.id, "equip", "banner")}
                      disabled={busy !== null}
                      className="shrink-0 rounded-xl border-2 border-brand-500 px-3 py-1.5 text-xs font-semibold text-brand-600 disabled:opacity-50 dark:text-brand-300"
                    >
                      Тохируулах
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void act(banner.id, "buy", "banner", banner.label)}
                      disabled={busy !== null || user.gems < banner.gems}
                      className="btn-primary shrink-0 px-3 py-1.5 text-xs disabled:opacity-50"
                    >
                      <span className="num">{banner.gems}</span> зоос
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {user.bannerTheme && (
          <button
            type="button"
            onClick={() => void act("", "equip", "banner")}
            disabled={busy !== null}
            className="text-sm text-gray-500 underline hover:text-gray-700 disabled:opacity-50 dark:text-gray-400"
          >
            Ердийн банер руу буцаах
          </button>
        )}
      </section>

      {/* --- Дэвсгэр өнгө --- */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Дэвсгэр өнгө</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Аппын бүх хуудасны дэвсгэр өнгө.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {SHOP_BACKGROUNDS.map((background) => {
            const isOwned = ownedBackgrounds.includes(background.id);
            const isEquipped = user.bgTheme === background.id;

            return (
              <div key={background.id} className="surface flex items-center gap-3 p-4">
                {/* Урьдчилсан харагдац — жинхэнэ дэвсгэрийн өнгөөр. */}
                <span
                  className={`size-12 shrink-0 rounded-xl border border-gray-200 dark:border-white/10 ${background.className}`}
                />

                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-900 dark:text-white">{background.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{background.hint}</p>
                </div>

                {isEquipped ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    <Check className="size-3.5" aria-hidden />
                    Зүүсэн
                  </span>
                ) : isOwned ? (
                  <button
                    type="button"
                    onClick={() => void act(background.id, "equip", "background")}
                    disabled={busy !== null}
                    className="shrink-0 rounded-xl border-2 border-brand-500 px-3 py-1.5 text-xs font-semibold text-brand-600 disabled:opacity-50 dark:text-brand-300"
                  >
                    Тохируулах
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      void act(background.id, "buy", "background", background.label)
                    }
                    disabled={busy !== null || user.gems < background.gems}
                    className="btn-primary shrink-0 px-3 py-1.5 text-xs disabled:opacity-50"
                  >
                    <span className="num">{background.gems}</span> зоос
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {user.bgTheme && (
          <button
            type="button"
            onClick={() => void act("", "equip", "background")}
            disabled={busy !== null}
            className="text-sm text-gray-500 underline hover:text-gray-700 disabled:opacity-50 dark:text-gray-400"
          >
            Ердийн дэвсгэр рүү буцаах
          </button>
        )}
      </section>
    </div>
  );
}
