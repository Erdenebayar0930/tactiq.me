"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Sparkles,
  Users,
  X, Tag, GraduationCap } from "lucide-react";

import { useUser } from "@/context/UserContext";
import { isAdminRole } from "@/lib/permissions";
import { signOutCompletely } from "@/lib/session";

import { Logo, LogoMark } from "@/components/tactiq/Mascot";
import { BRAND_SHORT } from "@/lib/brand";
import { ThemeToggle } from "@/components/tactiq/ThemeToggle";

const NAV = [
  /*
   * `adminOnly` — багшид ХАРАГДАХГҮЙ цэсүүд. Тэдгээрийн API нь
   * `requireAdmin`-тай тул багш дарвал алдаа л харна; цэсийг нуух нь
   * "энэ чиний хэсэг биш" гэдгийг чимээгүйхэн, ойлгомжтой хэлнэ.
   */
  { href: "/admin", label: "Хяналт", Icon: LayoutDashboard, exact: true, adminOnly: true },
  { href: "/admin/users", label: "Хэрэглэгчид", Icon: Users, adminOnly: true },
  { href: "/admin/courses", label: "Сургалт", Icon: BookOpen, adminOnly: false },
  { href: "/admin/schools", label: "Сургууль", Icon: GraduationCap, adminOnly: true },
  { href: "/admin/promo", label: "Сурталчлагч", Icon: Tag, adminOnly: true },
];

/**
 * Хяналтын самбарын хажуу цэс ба толгой хэсэг.
 *
 * Гар утсан дээр цэс нь давхарлан гарна (drawer). Сурагчийн апп шиг доод
 * тууз хийгээгүй нь зориуд: админы ажил ихэвчлэн компьютер дээр хийгддэг
 * бөгөөд цэсний зүйл олон тул доод тууз багтахгүй.
 */
export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useUser();
  const [open, setOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const isAdmin = isAdminRole(user?.role);

  const nav = (
    <ul className="space-y-1">
      {NAV.filter((item) => isAdmin || !item.adminOnly).map(({ href, label, Icon, exact }) => (
        <li key={href}>
          <Link
            href={href}
            onClick={() => setOpen(false)}
            className={`nav-item ${
              isActive(href, exact) ? "nav-item-active" : "nav-item-inactive"
            }`}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-gray-950">
      {/* Ширээний компьютерийн хажуу самбар */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-navy-900 px-4 py-5 lg:flex">
        <Link href="/admin" className="mb-6 flex items-center gap-2 px-2">
          <LogoMark className="size-8" />
          <span className="text-lg font-bold text-white">
            {BRAND_SHORT}
            <span className="text-brand-400">.org</span>
          </span>
          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
            Хяналт
          </span>
        </Link>

        {nav}

        <div className="mt-auto space-y-1 pt-4">
          <Link href="/profile" className="nav-item nav-item-inactive">
            <Sparkles className="size-5" aria-hidden />
            Миний апп
          </Link>
          <button
            type="button"
            onClick={() => void signOutCompletely()}
            className="nav-item nav-item-inactive w-full"
          >
            <LogOut className="size-5" aria-hidden />
            Гарах
          </button>
        </div>
      </aside>

      {/* Гар утасны давхарласан цэс */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-navy-900 px-4 py-5 lg:hidden">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mb-6 self-end rounded-lg p-1 text-white/70 hover:bg-white/10"
              aria-label="Цэс хаах"
            >
              <X className="size-5" aria-hidden />
            </button>
            {nav}
          </aside>
        </>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-gray-200 bg-white/90 px-4 backdrop-blur dark:border-white/10 dark:bg-gray-950/90">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid size-9 place-items-center rounded-lg text-gray-600 hover:bg-gray-100 lg:hidden dark:text-gray-300 dark:hover:bg-white/5"
            aria-label="Цэс нээх"
          >
            <Menu className="size-5" aria-hidden />
          </button>

          <Link href="/admin" className="lg:hidden">
            <Logo compact />
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-gray-500 sm:block dark:text-gray-400">
              {user?.displayName || user?.email}
            </span>
            <ThemeToggle />
            <Link
              href="/profile"
              className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/15 dark:text-gray-200 dark:hover:bg-white/5"
            >
              Миний апп
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-6xl p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
