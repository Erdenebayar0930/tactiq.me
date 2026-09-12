"use client";

import { ShieldCheck, UserCheck, UserX, Users } from "lucide-react";

import { ErrorNote, Skeleton } from "@/components/tactiq/ui";
import { useApiData } from "@/hooks/useApiData";

type Stats = {
  users: {
    total: number;
    active: number;
    blocked: number;
    admins: number;
    weeklyActive: number;
  };
  recentUsers: {
    uid: string;
    displayName: string;
    email: string;
    xp: number;
    createdAt: string;
  }[];
};

/** Хяналтын самбарын нүүр. */
export default function AdminDashboardPage() {
  const { data, loading, error, reload } = useApiData<Stats>("/api/admin/stats");

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Хяналтын самбар
      </h1>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          Icon={Users}
          label="Нийт хэрэглэгч"
          value={data.users.total}
          hint={`${data.users.weeklyActive} нь 7 хоногт идэвхтэй`}
        />
        <Card Icon={UserCheck} label="Идэвхтэй" value={data.users.active} hint="active" />
        <Card Icon={UserX} label="Хаагдсан" value={data.users.blocked} hint="blocked" />
        <Card Icon={ShieldCheck} label="Админ" value={data.users.admins} hint="admin, super" />
      </section>

      <section className="surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Шинэ хэрэглэгчид
        </h2>

        <ul className="mt-3 divide-y divide-gray-100 dark:divide-white/10">
          {data.recentUsers.map((row) => (
            <li key={row.uid} className="flex items-center gap-3 py-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                {(row.displayName || row.email || "?").charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">
                  {row.displayName || "—"}
                </span>
                <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                  {row.email}
                </span>
              </span>
              <span className="num shrink-0 text-xs text-gray-500 dark:text-gray-400">
                {row.xp} оноо
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Card({
  Icon: CardIcon,
  label,
  value,
  hint,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="surface p-5">
      <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
        <CardIcon className="size-5" />
      </span>
      <p className="num mt-3 text-2xl font-extrabold text-gray-900 dark:text-white">
        {value}
      </p>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </p>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
    </div>
  );
}
