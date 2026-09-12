"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Mascot } from "@/components/tactiq/Mascot";

/**
 * Эрх цуцлагдсаны дараа буух хуудас.
 *
 * `forceSignOut` нь `?reason=` дамжуулна — юу болсныг тодорхой хэлэх нь
 * чухал. "Алдаа гарлаа" гэж бичвэл хэрэглэгч дахин дахин нэвтрэхийг оролдож,
 * шалтгаан нь өөрчлөгдөөгүй тул мөчлөгт орно.
 */
const REASONS: Record<string, { title: string; description: string }> = {
  blocked: {
    title: "Таны бүртгэл хаагдсан",
    description: "Багш эсвэл админтай холбогдож бүртгэлээ сэргээлгэнэ үү.",
  },
  pending: {
    title: "Бүртгэл зөвшөөрөл хүлээж байна",
    description: "Админ баталгаажуулмагц хичээлүүд нээгдэнэ.",
  },
  "no-profile": {
    title: "Профайл олдсонгүй",
    description: "Дахин нэвтэрч бүртгэлээ гүйцээнэ үү.",
  },
  admin: {
    title: "Эрх хүрэлцэхгүй",
    description: "Энэ хэсэг зөвхөн админд нээлттэй.",
  },
};

const FALLBACK = {
  title: "Хандах эрх дууссан",
  description: "Дахин нэвтэрнэ үү.",
};

export default function UnauthorizedPage() {
  // `useSearchParams` нь Suspense хил шаарддаг — эс бөгөөс статик
  // үүсгэлт нь бүх хуудсыг динамик болгоно.
  return (
    <Suspense fallback={null}>
      <UnauthorizedNotice />
    </Suspense>
  );
}

function UnauthorizedNotice() {
  const reason = useSearchParams().get("reason") ?? "";
  const copy = REASONS[reason] ?? FALLBACK;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-gray-900">
      <Mascot className="mx-auto size-24" mood="think" />
      <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
        {copy.title}
      </h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {copy.description}
      </p>
      <Link
        href="/login"
        className="mt-6 inline-block rounded-xl bg-brand-500 px-5 py-2.5 font-semibold text-white hover:bg-brand-600"
      >
        Нэвтрэх хуудас руу
      </Link>
    </div>
  );
}
