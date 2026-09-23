"use client";

import { useState } from "react";
import { Check, Tag, X } from "lucide-react";

import { apiFetch, ApiError } from "@/lib/apiClient";

import type { PlanId } from "@/lib/billing";
import { t } from "@/lib/i18n/t";

export type PromoPreview = {
  discountPercent: number;
  /** Хэдэн төгрөг хэмнэсэн. */
  discountMnt: number;
  /** Хямдруулсны дараах ТӨЛӨХ дүн. */
  amountMnt: number;
};

/**
 * СУРТАЛЧЛАГЧИЙН КОД оруулах талбар — багц сонгохын ӨМНӨ.
 *
 * ⚠ Энэ нь зөвхөн УРЬДЧИЛСАН ХАРАГДАЦ. Кодыг `/api/promo/validate` шалгаж
 * хямдралыг харуулна, гэхдээ ЖИНХЭНЭ дүнг `checkout` route СЕРВЕР дээрээ
 * дахин тооцно — энэ компонент зөвхөн кодын ТЕКСТИЙГ дамжуулна.
 *
 * ⚠ Багц бүрийн үнэ өөр тул шалгалт нь `planId`-аас хамаарна. Хэрэглэгч
 * кодоо оруулаад ӨӨР багц сонговол хямдралын дүн буруу харагдана — тиймээс
 * `onApply` нь ЗӨВХӨН кодыг эцэг рүү өгч, эцэг нь багц сонгогдох мөчид
 * серверээс жинхэнэ дүнг авдаг.
 */
export default function PromoCodeField({
  planId,
  value,
  onApply,
  onClear,
}: {
  /** Аль багцын үнээр шалгах вэ — хямдралын дүн үүнээс хамаарна. */
  planId: PlanId;
  /** Хэрэглэгдэж буй код (эцэг компонент хадгална). */
  value: string | null;
  /**
   * Код баталгаажсаны дараа кодыг БА хямдралын дүнг эцэг рүү өгнө.
   *
   * ⚠ Дүнг эцэгт дамжуулах болсон шалтгаан: код оруулахад ҮНЭ нь тэр
   * дороо шинэчлэгдэх ёстой. Урьд нь хямдрал зөвхөн энэ талбарын дотор
   * бичигдэж, дээрх «үнийн дүн» хуучин үнээ харуулсаар байсан —
   * хэрэглэгч ямар дүн төлөхөө QR гартал мэдэхгүй байв.
   *
   * ⚠ Энэ дүн нь ЗӨВХӨН ХАРУУЛАХАД. Төлөх дүнг сервер `checkout` дээр
   * дахин тооцно — клиентээс дүн авах зам ОГТ байхгүй.
   */
  onApply: (code: string, preview: PromoPreview) => void;
  onClear: () => void;
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PromoPreview | null>(null);

  const check = async () => {
    const code = input.trim();
    if (!code || busy) return;

    setBusy(true);
    setError(null);

    try {
      const data = await apiFetch<{
        valid: boolean;
        /** "own-code" — өөрийн код; "unknown" — байхгүй эсвэл идэвхгүй. */
        reason?: "own-code" | "unknown";
        code?: string;
        discountPercent?: number;
        discountMnt?: number;
        amountMnt?: number;
      }>("/api/promo/validate", {
        method: "POST",
        body: { code, planId },
      });

      if (!data.valid || !data.code) {
        /*
         * ⚠ ӨӨРИЙН КОДЫГ ТУСДАА хэлнэ: сурталчлагч кодоо өөрөө туршаад
         * «ажиллахгүй байна» гэж бодох нь бодитоор тохиолдсон. Хямдрал
         * + шимтгэлийг нэг хүн хоёуланг авбал хөтөлбөрийн эдийн засаг
         * унана (`lib/api/promo.ts`) — тиймээс хориг нь ЗӨВ, зөвхөн
         * тайлбар нь дутуу байв.
         */
        setError(
          data.reason === "own-code"
            ? t("Өөрийн кодоо өөртөө хэрэглэх боломжгүй. Найздаа илгээгээрэй — тэр хямдрал авч, танд шимтгэл ногдоно.")
            : t("Ийм код олдсонгүй эсвэл ашиглах боломжгүй байна.")
        );
        setPreview(null);
        return;
      }

      const next: PromoPreview = {
        discountPercent: data.discountPercent ?? 0,
        discountMnt: data.discountMnt ?? 0,
        amountMnt: data.amountMnt ?? 0,
      };
      setPreview(next);
      onApply(data.code, next);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    setInput("");
    setPreview(null);
    setError(null);
    onClear();
  };

  if (value) {
    return (
      <div className="surface flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          <Check className="size-4 shrink-0" aria-hidden />
          <span>
            <span className="font-mono">{value}</span> код идэвхжлээ
            {preview && preview.discountPercent > 0 && (
              <span className="ml-1 font-normal text-gray-600 dark:text-gray-300">
                — {preview.discountPercent}% хямдрал (
                <span className="num">{preview.discountMnt.toLocaleString("mn-MN")}₮</span>)
              </span>
            )}
          </span>
        </p>

        <button
          type="button"
          onClick={clear}
          className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
        >
          <X className="size-3.5" aria-hidden />
          Хасах
        </button>
      </div>
    );
  }

  return (
    <div className="surface space-y-2 p-4">
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
        <Tag className="size-4 shrink-0 text-brand-500" aria-hidden />
        Урамшууллын код (заавал биш)
      </label>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void check();
          }}
          placeholder="ЖИШЭЭ10"
          maxLength={24}
          // Кодыг ТОМ үсгээр харуулна — сан дотор ч том үсгээр хадгалагддаг
          // тул хэрэглэгч юу илгээхээ хардаг.
          className="w-full rounded-xl border border-gray-300 px-3 py-2 font-mono text-sm uppercase text-gray-900 placeholder:font-sans placeholder:normal-case dark:border-white/15 dark:bg-white/5 dark:text-white"
        />
        <button
          type="button"
          onClick={() => void check()}
          disabled={busy || input.trim() === ""}
          className="shrink-0 rounded-xl border-2 border-brand-500 px-4 text-sm font-semibold text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:text-brand-300 dark:hover:bg-brand-500/10"
        >
          {busy ? "…" : "Шалгах"}
        </button>
      </div>

      {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}
