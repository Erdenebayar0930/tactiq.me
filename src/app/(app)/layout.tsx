import AppShell from "@/components/tactiq/AppShell";
import Protected from "@/components/tactiq/Protected";

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
      <AppShell>{children}</AppShell>
    </Protected>
  );
}
