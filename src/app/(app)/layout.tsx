import AppShell from "@/components/tactiq/AppShell";
import Protected from "@/components/tactiq/Protected";
import { SchoolsProvider } from "@/context/SchoolsContext";

/**
 * Хэрэглэгчийн апп-ын хүрээ.
 *
 * `Protected` нь `AppShell`-ийн ГАДНА байна — эс бөгөөс нэвтрээгүй үед
 * толгой хэсэг, цэс хоромхон зуур харагдаад дараа нь алга болно.
 *
 * ⚠ `allowedRoles` ЗОРИУДААР ХЯЗГААРГҮЙ: teacher/parent-ийн тусдаа хяналтын
 * хэсэг (`/teacher`, `/parent`) хуучин схемтэй хамт устгагдсан тул одоо
 * Профайл/Тохиргоо нь БҮХ эрхийн цорын ганц "гэр" хуудас.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Protected>
      {/* Сургуулийн нэрийг админ засаж болдог — клиент дэлгэцүүд эндээс уншина.
          ⚠ Маркетингийн (`(site)`) хэсэгт ЭНЭ провайдер БАЙХГҮЙ: тэр хуудсууд
          сервер тал дээр `getSchools()`-оор зөв текстээ аль хэдийн авдаг тул
          нэмэлт хүсэлт нь дэмий байна. */}
      <SchoolsProvider>
        <AppShell>{children}</AppShell>
      </SchoolsProvider>
    </Protected>
  );
}
