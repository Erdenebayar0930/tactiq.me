import Link from "next/link";

import { Logo, Mascot } from "@/components/tactiq/Mascot";
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
          */}
          <Mascot
            className="pointer-events-none absolute -bottom-14 -right-6 hidden size-28 sm:block"
            mood="happy"
          />
        </div>
      </main>
    </div>
  );
}
