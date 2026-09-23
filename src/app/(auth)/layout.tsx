import Link from "next/link";

import { Logo } from "@/components/tactiq/Mascot";
import { WelcomeRobotGif } from "@/components/tactiq/LoopGif";
import { ThemeToggle } from "@/components/tactiq/ThemeToggle";

/** Нэвтрэх / бүртгүүлэх хуудсуудын хүрээ (#2 дэлгэц). */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-gray-50 dark:bg-gray-950">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center px-4">
        <Link href="/">
          <Logo />
        </Link>
        <ThemeToggle className="ml-auto" />
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 items-start justify-center px-4 pb-16">
        <div className="relative w-full">
          {children}

          {/*
            Дүрийг картын баруун доод буланд наана — загварын байрлалыг
            давтана. `pointer-events-none` нь чухал: эс бөгөөс дүр нь
            картын доорх холбоос дээр давхарлаж товшилтыг залгина.

            ⚠ ХӨДӨЛГӨӨНТ РОБОТ, титэмтэй `Mascot` БИШ: нэвтрэх, бүртгэх
            нь аппын ХАМГИЙН ЭХНИЙ дэлгэц — тэнд хөдөлгөөнтэй дүр нь
            «энэ апп амьд» гэдгийг хамгийн хямд аргаар хэлнэ. Титэм нь
            баярын дохио тул нэвтрэхээс ӨМНӨ утгагүй.

            ⚠ `object-contain`: робот дөрвөлжин биш тул `object-cover`
            нь толгойн шар малгайг тайрна.
          */}
          <WelcomeRobotGif className="pointer-events-none absolute -bottom-14 -right-6 hidden size-28 object-contain sm:block" />
        </div>
      </main>
    </div>
  );
}
