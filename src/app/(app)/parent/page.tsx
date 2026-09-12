"use client";

import { Suspense } from "react";

import FamilyPlanPurchase from "@/components/tactiq/FamilyPlanPurchase";
import Protected from "@/components/tactiq/Protected";
import StudentRoster from "@/components/tactiq/StudentRoster";

/**
 * Эцэг эхийн хэсэг — хүүхдүүдийн ахиц БА гэр бүлийн багц.
 *
 * ⚠ `Protected`-ийг ЭНД дахин ороов. `(app)/layout.tsx` дахь `Protected` нь
 * зөвхөн "нэвтэрсэн, идэвхтэй" гэдгийг шаарддаг, эрхээр ялгадаггүй —
 * `allowedRoles` нь ЗӨВХӨН энэ хуудсанд хамаарах тул хүрээ рүү зөөж
 * болохгүй. Давхар боолт нь зөвхөн нэмэлт шалгалт хийнэ, дахин ачаалахгүй.
 *
 * ⚠ Клиент талын шалгалт нь ТАВ ТУХЫН — жинхэнэ хаалт нь `/api/students`
 * дээрх `hasRole` шалгалт, гэр бүлийн багцын хувьд `api/billing/checkout`
 * дээрх `isParentOnlyPlan` шалгалт.
 *
 * ⚠ Гэр бүлийн багц нь хүүхдүүдийн жагсаалтын ДООР байрлана, дээр нь БИШ:
 * суудал нь ЗӨВХӨН холбогдсон хүүхдэд очдог тул эцэг эх эхлээд хэн
 * холбогдсоныг хараад дараа нь худалдан авах нь зөв дараалал.
 */
export default function ParentPage() {
  return (
    <Protected allowedRoles={["parent"]}>
      <div className="space-y-6">
        <StudentRoster
          relation="parent"
          title="Миний хүүхдүүд"
          description="Хүүхдүүдийнхээ суралцах ахиц, өдөр тутмын дараалалыг хараарай."
        />

        <section>
          <h2 className="mb-3 text-lg font-bold text-gray-900 dark:text-white">
            Гэр бүлийн багц
          </h2>
          {/*
            ⚠ Suspense ЗААВАЛ. `FamilyPlanPurchase` нь `useSearchParams`
            ашигладаг (`?buy=family`) бөгөөд Next-ийн баримтад тодорхой
            бичсэнээр: дев дээр ажиллаж байгаа мэт харагдах ч ПРОД BUILD нь
            "Missing Suspense boundary with useSearchParams" гэж УНАНА.
            Хүрээ нь мөн энэ хэсгээс дээших агуулгыг урьдчилан зурах
            боломжийг үлдээнэ.
          */}
          <Suspense fallback={<div className="surface h-40 animate-pulse" />}>
            <FamilyPlanPurchase />
          </Suspense>
        </section>
      </div>
    </Protected>
  );
}
