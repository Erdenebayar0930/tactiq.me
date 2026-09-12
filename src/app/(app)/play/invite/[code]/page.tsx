"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Swords } from "lucide-react";

import { apiFetch, ApiError } from "@/lib/apiClient";
import { Mascot } from "@/components/tactiq/Mascot";
import { ErrorNote, Skeleton } from "@/components/tactiq/ui";
import { t } from "@/lib/i18n/t";

type InviteInfo = {
  code: string;
  host: { uid: string; displayName: string; photoUrl: string } | null;
  isHost: boolean;
  roomId: string | null;
  accepted: boolean;
};

/**
 * Найзын урилгыг хүлээж авах дэлгэц (`/play/invite/<code>`).
 *
 * ⚠ Хүлээн авалт нь АВТОМАТААР болохгүй — хэрэглэгч товч дарж байж өрөө
 * үүснэ. Холбоос дарсан даруйд өрөө үүсгэвэл найз нь мессежээ уншиж
 * байтал хөлөг нээгдэж, урьсан тал хэн ч байхгүй өрөөнд хүлээх болно.
 */
export default function InvitePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await apiFetch<InviteInfo>(`/api/play/invite/${params.code}`);
        if (cancelled) return;
        // Урьсан тал өөрөө холбоосоо дарсан бол лобби руугаа буцаана —
        // тэнд нь хүлээх дэлгэц, "Хуваалцах" товч аль хэдийн байгаа.
        if (data.isHost) {
          router.replace(data.roomId ? `/play/${data.roomId}` : "/play");
          return;
        }
        setInvite(data);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof ApiError ? cause.message : t("Алдаа гарлаа."));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params.code, router]);

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch<{ roomId: string }>(`/api/play/invite/${params.code}`, {
        method: "POST",
      });
      router.replace(`/play/${data.roomId}`);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("Алдаа гарлаа."));
      setBusy(false);
    }
  };

  if (error && !invite) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-10 text-center">
        <Mascot mood="think" className="size-24" />
        <ErrorNote message={error} />
        <button
          type="button"
          onClick={() => router.replace("/play")}
          className="rounded-xl bg-brand-500 px-6 py-2.5 font-semibold text-white hover:bg-brand-600"
        >
          {t("Тоглох хэсэг рүү очих")}
        </button>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="mx-auto w-full max-w-md space-y-3 py-10">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 py-10 text-center">
      <span className="grid size-20 place-items-center rounded-3xl bg-sky-500 text-white">
        <Swords className="size-10" aria-hidden />
      </span>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        {invite.host?.displayName ?? t("Найз")} чамайг шатар тоглохоор урьж байна
      </h1>

      {invite.accepted ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Энэ урилгаар аль хэдийн тоглолт эхэлсэн байна. Найзаасаа шинэ
          холбоос хүсээрэй.
        </p>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Та хараар тоглоно. Товч дармагц хөлөг нээгдэж, найзтайгаа шууд
          (P2P) холбогдоно.
        </p>
      )}

      {error && <ErrorNote message={error} />}

      {!invite.accepted && (
        <button
          type="button"
          onClick={() => void accept()}
          disabled={busy}
          className="rounded-xl bg-brand-500 px-8 py-3.5 text-base font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {busy ? t("Холбогдож байна…") : t("Тоглох")}
        </button>
      )}

      <button
        type="button"
        onClick={() => router.replace("/play")}
        className="text-sm text-gray-500 underline hover:text-gray-700 dark:hover:text-gray-300"
      >
        {t("Татгалзах")}
      </button>
    </div>
  );
}
