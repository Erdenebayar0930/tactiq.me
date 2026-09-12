"use client";

import Link from "next/link";
import { Award, Crown, Lock, Printer } from "lucide-react";

import { Icon } from "@/components/tactiq/Icon";
import { ErrorNote, Skeleton } from "@/components/tactiq/ui";
import { useApiData } from "@/hooks/useApiData";
import { colorStyles } from "@/lib/tactiq/theme";
import { useSchool } from "@/context/SchoolsContext";

import type { Certificate, CertificatesView } from "@/lib/api/certificates";

/**
 * Курс дуусгасны гэрчилгээ.
 *
 * ⚠ ЖАГСААЛТ нь Premium эрхгүй хүнд ч БҮРЭН харагдана — зөвхөн ХЭВЛЭХ нь
 * хаалттай. Дуусгасан курсаа нуувал хийсэн хөдөлмөрийг нь нуух бөгөөд юу
 * авахаа мэдэхгүй хүн Premium авах шалтгаангүй.
 */
export default function CertificatesPage() {
  const { data, error, loading, reload } =
    useApiData<CertificatesView>("/api/users/me/certificates");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Гэрчилгээ</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Курсын бүх хичээлийг дуусгамагц гэрчилгээ нээгдэнэ.
        </p>
      </div>

      {loading && <Skeleton className="h-64 w-full rounded-2xl" />}
      {error && <ErrorNote message={error} onRetry={() => void reload()} />}

      {data &&
        (data.certificates.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {!data.premium && <PremiumNote />}

            <div className="space-y-5">
              {data.certificates.map((certificate) => (
                <CertificateCard
                  key={certificate.courseSlug}
                  certificate={certificate}
                  holderName={data.holderName}
                  premium={data.premium}
                />
              ))}
            </div>
          </>
        ))}
    </div>
  );
}

function EmptyState() {
  return (
    <section className="surface flex flex-col items-center gap-3 p-8 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-gold-100 text-gold-600 dark:bg-gold-500/15 dark:text-gold-300">
        <Award className="size-7" aria-hidden />
      </span>
      <p className="font-bold text-gray-900 dark:text-white">
        Хараахан гэрчилгээ байхгүй
      </p>
      <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
        Курсын бүх хичээлийг дуусгасны дараа нэр бүхий гэрчилгээ энд гарч
        ирнэ. Хэвлэж, ангидаа үзүүлж болно.
      </p>
      <Link href="/learn" className="btn-primary mt-1 px-5 py-2.5 text-sm">
        Хичээл үргэлжлүүлэх
      </Link>
    </section>
  );
}

function PremiumNote() {
  return (
    <section className="flex items-center gap-3 rounded-2xl bg-gold-50 p-4 ring-1 ring-gold-300 dark:bg-gold-500/10 dark:ring-gold-500/30">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-gold-400 to-amber-500 text-white">
        <Crown className="size-5" aria-hidden />
      </span>
      <p className="min-w-0 flex-1 text-sm text-gold-900 dark:text-gold-100">
        Гэрчилгээгээ <span className="font-bold">хэвлэх</span> ба татахад Premium
        эрх хэрэгтэй. Амжилт нь хадгалагдсан — эрх авмагц шууд хэвлэж болно.
      </p>
      <Link
        href="/premium"
        className="shrink-0 whitespace-nowrap rounded-full bg-gold-400 px-4 py-2 text-sm font-bold text-gold-900 transition-colors hover:bg-gold-300"
      >
        Авах
      </Link>
    </section>
  );
}

/**
 * ЗӨВХӨН нэг гэрчилгээг хэвлэнэ.
 *
 * ⚠ `window.print()` нь БҮХ хуудсыг хэвлэдэг. Товч нь тухайн карт дээр
 * байгаа тул хэрэглэгч зөвхөн ТҮҮНИЙГ хэвлэнэ гэж хүлээнэ — гурван
 * гэрчилгээтэй хүн гурван хуудас гаргавал энэ нь эвдрэл.
 *
 * ⚠ React `state`-ээр биш, DOM-д ШУУД анги нэмж байгаа нь санамсаргүй биш:
 * `window.print()` нь СИНХРОН (хэвлэх цонх хаагдах хүртэл блоклоно) тул
 * төлөв солиод дахин рендэрлэхийг хүлээх боломж БАЙХГҮЙ. Анги нь хэвлэлт
 * дуусмагц шууд арилна.
 */
function printOnly(slug: string) {
  const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-certificate]"));
  const hidden = cards.filter((card) => card.dataset.certificate !== slug);

  for (const card of hidden) card.classList.add("print-hidden");

  try {
    window.print();
  } finally {
    // `finally` ЗААВАЛ — хэвлэх цонх алдаа өгвөл картууд ҮҮРД алга болно.
    for (const card of hidden) card.classList.remove("print-hidden");
  }
}

function CertificateCard({
  certificate,
  holderName,
  premium,
}: {
  certificate: Certificate;
  holderName: string;
  premium: boolean;
}) {
  const styles = colorStyles(certificate.color);
  const school = useSchool(certificate.school);

  return (
    <section className="surface overflow-hidden p-0" data-certificate={certificate.courseSlug}>
      {/*
        ⚠ `print:` хувилбарууд ЗААВАЛ. Хэвлэхэд хажуугийн цэс, товчнууд
        цаасан дээр гарах ёсгүй бөгөөд сүүдэр, хүрээ нь хэвлэгчийн хор
        дэмий зарцуулна. `globals.css`-д хуудсын хэмжээнд нэмэлт дүрэм бий.
      */}
      <div
        id={`certificate-${certificate.courseSlug}`}
        className="relative border-b-4 border-gold-400 bg-white p-8 text-center dark:bg-gray-900 print:border-b-0"
      >
        {/* Гоёл — цаасан гэрчилгээний хүрээг сануулна. */}
        <div className="pointer-events-none absolute inset-3 rounded-xl border-2 border-gold-200 dark:border-gold-500/20" />

        <div className="relative space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-600 dark:text-gold-400">
            Гэрчилгээ
          </p>

          <span
            className={`mx-auto grid size-14 place-items-center rounded-2xl text-white ${styles.iconBg}`}
          >
            <Icon name={certificate.icon} className="size-7" />
          </span>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Энэхүү гэрчилгээг
          </p>

          {/*
            Нэр нь гэрчилгээний ГОЛ зүйл — хамгийн том, хамгийн тод.
            `break-words`: урт нэр хүрээнээс халих ёсгүй.
          */}
          <p className="break-words text-2xl font-extrabold text-gray-900 dark:text-white">
            {holderName}
          </p>

          <p className="mx-auto max-w-md text-sm text-gray-600 dark:text-gray-300">
            <span className="font-bold text-gray-900 dark:text-white">
              {certificate.title}
            </span>{" "}
            курсын бүх хичээлийг амжилттай дүүргэсэнд олгов.
          </p>

          <div className="num flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-1 text-xs text-gray-500 dark:text-gray-400">
            <span>{certificate.lessons} хичээл</span>
            <span>{certificate.xp} XP</span>
            <span>
              {new Date(certificate.issuedAt).toLocaleDateString("mn-MN")}
            </span>
          </div>

          {school && (
            <p className="text-xs font-semibold text-gray-400">{school.title}</p>
          )}

          {/*
            ⚠ Дугаарыг ЗААВАЛ хэвлэнэ. Дугааргүй гэрчилгээ бол зүгээр нэг
            зураг — багш, эцэг эх түүнийг шалгах боломжгүй. Дугаар нь
            `uid + курс`-ын hash тул тогтвортой мөртөө таамаглах аргагүй
            (`lib/api/certificates.ts`).
          */}
          <p className="num pt-2 text-[10px] tracking-wider text-gray-400">
            {certificate.code}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-5 py-3 print:hidden">
        <p className="min-w-0 text-xs text-gray-500 dark:text-gray-400">
          {certificate.title}
        </p>

        {premium ? (
          <button
            type="button"
            onClick={() => printOnly(certificate.courseSlug)}
            className="btn-primary flex shrink-0 items-center gap-2 px-4 py-2 text-sm"
          >
            <Printer className="size-4" aria-hidden />
            Хэвлэх
          </button>
        ) : (
          <Link
            href="/premium"
            className="flex shrink-0 items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-500 dark:bg-white/5 dark:text-gray-400"
          >
            <Lock className="size-4" aria-hidden />
            Premium
          </Link>
        )}
      </div>
    </section>
  );
}

