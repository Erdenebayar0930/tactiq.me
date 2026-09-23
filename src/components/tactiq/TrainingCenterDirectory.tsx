"use client";

import { Building2, ExternalLink, Mail, MapPin, Phone, Swords } from "lucide-react";

import { useApiData } from "@/hooks/useApiData";
import { ErrorNote, Skeleton } from "@/components/tactiq/ui";
import { t } from "@/lib/i18n/t";

/**
 * СУРГАЛТЫН ТӨВҮҮДИЙН ЛАВЛАХ — «Сургалтын төв» таб дээр.
 *
 * ⚠ УРЬД НЬ ЭНД ЮУ БАЙВ: «Клубууд — хараахан нээгдээгүй, бэлтгэж
 * байна» гэсэн ТАНИЛЦУУЛГА. Хүснэгт, API, өгөгдөл огт байгаагүй тул
 * хэрэглэгч гурван мөр уншаад хоосон гарна. Одоо энэ нь БОДИТ лавлах:
 * зураг, байршил, холбоо барих мэдээлэлтэй.
 *
 * ⚠ ХУУРАМЧ ӨГӨГДӨЛ ХЭЗЭЭ Ч ОРУУЛАХГҮЙ (`CoachDirectory`-тэй ижил
 * зарчим): хоосон жагсаалт нь «төв бүртгэгдээгүй» гэдгийг ҮНЭНЭЭР
 * хэлэх нь зохиомол хаяг үзүүлж, эцэг эхийг тийш нь явуулахаас дээр.
 */

type Center = {
  id: string;
  name: string;
  description: string;
  photoUrl: string;
  logoUrl: string;
  city: string;
  address: string;
  mapUrl: string;
  phone: string;
  email: string;
  link: string;
  teachesChess: boolean;
  teachesDraughts: boolean;
};

/**
 * ⚠ ГАДНЫ ЗУРГИЙГ `next/image`-ЭЭР БИШ, ЭНГИЙН `img`-ЭЭР үзүүлнэ.
 * `next.config.ts`-д `images.unoptimized = true` бөгөөд төвүүдийн зураг
 * дурын домэйноос ирнэ — `remotePatterns` бүрийг урьдчилан мэдэх
 * боломжгүй. Оновчлол байхгүй тул `next/image` нэмэх зүйлгүй.
 */
/**
 * ХОЛБООС АЮУЛГҮЙ ЭСЭХИЙГ РЕНДЕРЛЭХЭЭС ӨМНӨ ШАЛГАНА.
 *
 * ⚠ СЕРВЕР АЛЬ ХЭДИЙН ШАЛГАДАГ (`api/admin/training-centers`-ийн
 * `safeUrl`). Энэ нь ХОЕР ДАХЬ ДАВХАРГА: тэр шалгалт нэмэгдэхээс
 * ӨМНӨ бичигдсэн мөрүүд санд үлдсэн байж болно — тэднийг
 * сан дээр цэвэрлэх хүртэл энд барина.
 *
 * ⚠ React нь `href`-ийг ЦЭВЭРЛЭДЭГГҮЙ: `javascript:` схем тавьсан
 * холбоосыг дарвал хэрэглэгчийн хөтөч дээр код ажиллана.
 */
function httpsOnly(url: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function CenterPhoto({ center }: { center: Center }) {
  const photo = httpsOnly(center.photoUrl);
  if (!photo) {
    /*
     * ⚠ ЗУРАГГҮЙ ТӨВИЙГ ЖАГСААЛТААС ХАСАХГҮЙ — орлогч дүрсээр үзүүлнэ.
     * Зураг нь заавал биш; хаяг, утас нь илүү чухал.
     */
    return (
      <div className="grid h-40 w-full place-items-center rounded-xl bg-amber-50 text-amber-400 dark:bg-amber-500/10 dark:text-amber-300/60">
        <Building2 className="size-10" aria-hidden />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo}
      alt={center.name}
      loading="lazy"
      className="h-40 w-full rounded-xl object-cover"
    />
  );
}

/** Тухайн төв ямар тоглоом заадаг — шошго. */
function GameTags({ center }: { center: Center }) {
  const games = [
    center.teachesChess ? t("Шатар") : null,
    center.teachesDraughts ? t("Даам") : null,
  ].filter(Boolean) as string[];

  if (games.length === 0) return null;

  return (
    <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
      <Swords className="size-3.5 shrink-0" aria-hidden />
      {games.join(" · ")}
    </p>
  );
}

export function TrainingCenterDirectory() {
  const { data, loading, error, reload } = useApiData<{ centers: Center[] }>(
    "/api/training-centers"
  );

  return (
    <div className="space-y-3">
      <div className="surface flex items-center gap-4 p-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/15">
          <Building2 className="size-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-bold text-gray-900 dark:text-white">{t("Сургалтын төвүүд")}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("Ойр орчмын шатар, даамын сургалтыг хаанаас үзэхээ ол.")}
          </p>
        </div>
      </div>

      {loading && <Skeleton className="h-48 w-full" />}
      {error && <ErrorNote message={error} onRetry={() => void reload()} />}

      {data && data.centers.length === 0 && (
        <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500 dark:bg-white/5 dark:text-gray-400">
          {t("Сургалтын төв хараахан бүртгэгдээгүй байна.")}
        </p>
      )}

      {data?.centers.map((center) => (
        <article key={center.id} className="surface space-y-3 overflow-hidden p-4">
          <CenterPhoto center={center} />

          {/*
            ⚠ ЛОГО НЭРИЙН ХАЖУУД, зурагнаас ТУСДАА. Зураг нь байр,
            анги танхимыг үзүүлэх өргөн зураг; лого нь таних тэмдэг.
            Нэгтгэвэл лого сунаж муухай харагдана.

            ⚠ `object-contain` — `cover` биш: логоны ирмэгийг таслахгүй.
          */}
          <div className="flex items-start gap-3">
            {httpsOnly(center.logoUrl) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={center.logoUrl}
                alt=""
                loading="lazy"
                className="size-12 shrink-0 rounded-xl bg-white object-contain dark:bg-white/10"
              />
            )}
            <div className="min-w-0 space-y-1">
              <h3 className="font-bold text-gray-900 dark:text-white">{center.name}</h3>
              <GameTags center={center} />
            </div>
          </div>

          {center.description && (
            <p className="text-sm leading-snug text-gray-600 dark:text-gray-300">
              {center.description}
            </p>
          )}

          {/*
            БАЙРШИЛ — газрын зурагтай бол ДАРЖ болохоор.
            ⚠ Холбоосгүй үед ч хаягийг үзүүлнэ: хаяг нь өөрөө
            хэрэгтэй мэдээлэл, зөвхөн холбоос байхгүйгээс далдлах
            учиргүй.
          */}
          {(center.city || center.address) && (
            <p className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
              <MapPin className="mt-0.5 size-4 shrink-0 text-gray-400" aria-hidden />
              {httpsOnly(center.mapUrl) ? (
                <a
                  href={center.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-sky-700 hover:underline dark:text-sky-300"
                >
                  {[center.city, center.address].filter(Boolean).join(", ")}
                </a>
              ) : (
                <span>{[center.city, center.address].filter(Boolean).join(", ")}</span>
              )}
            </p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
            {center.phone && (
              <a
                href={`tel:${center.phone}`}
                className="flex items-center gap-1.5 font-semibold text-gray-700 hover:underline dark:text-gray-200"
              >
                <Phone className="size-4 shrink-0 text-gray-400" aria-hidden />
                {center.phone}
              </a>
            )}
            {center.email && (
              <a
                href={`mailto:${center.email}`}
                className="flex items-center gap-1.5 text-gray-600 hover:underline dark:text-gray-300"
              >
                <Mail className="size-4 shrink-0 text-gray-400" aria-hidden />
                {center.email}
              </a>
            )}
            {httpsOnly(center.link) && (
              <a
                href={center.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-gray-600 hover:underline dark:text-gray-300"
              >
                <ExternalLink className="size-4 shrink-0 text-gray-400" aria-hidden />
                {t("Дэлгэрэнгүй")}
              </a>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
