"use client";

import Protected from "@/components/tactiq/Protected";
import StudentRoster from "@/components/tactiq/StudentRoster";

/**
 * Багшийн хэсэг — сурагчдын ахиц.
 *
 * `/parent`-тай ижил бүтэц (тэндхийн тайлбарыг үзнэ үү) — ялгаа нь зөвхөн
 * `relation` ба үгсийн сонголт.
 */
export default function TeacherPage() {
  return (
    <Protected allowedRoles={["teacher"]}>
      <StudentRoster
        relation="teacher"
        title="Миний сурагчид"
        description="Сурагчдынхаа суралцах ахиц, өдөр тутмын дараалалыг хараарай."
      />
    </Protected>
  );
}
