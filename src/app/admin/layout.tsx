import AdminShell from "@/components/admin/AdminShell";
import Protected from "@/components/tactiq/Protected";

/**
 * Хяналтын самбарын хүрээ.
 *
 * `requireAdmin` нь UI-г цэвэрхэн барих зорилготой — жинхэнэ хаалт нь
 * `/api/admin/**` route бүр дэх `requireAdmin`. Сурагч хаягаар нь орсон ч
 * ямар ч өгөгдөл гарахгүй.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /*
   * ⚠ `requireAdmin` БИШ болов. Багш нар өөрсдийн хичээл, дасгалыг
   * удирдах ёстой (`lib/api/contentAccess.ts`) тул тэдэнд агуулгын хэсэг
   * рүү орох ЗАМ хэрэгтэй. Урьд нь API нь зөвшөөрөөд UI нь хаадаг байсан
   * бол боломж нь бодитоор БАЙХГҮЙ.
   *
   * ⚠ Энэ нь хамгаалалт САЛАХ гэсэн үг БИШ: `/api/admin/**` дээрх шалгалт
   * бүр хэвээр (`requireAdmin` — курс үүсгэх/засах/устгах, хэрэглэгч,
   * статистик; `requireContentEditor` + `canManageRow` — нэгж, хичээл,
   * дасгал). UI нь зөвхөн ХАРАГДАЦЫГ цэвэрхэн барина.
   */
  return (
    <Protected allowedRoles={["teacher", "admin", "super"]}>
      <AdminShell>{children}</AdminShell>
    </Protected>
  );
}
