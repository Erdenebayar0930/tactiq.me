"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Badge, inputClass } from "@/components/admin/fields";
import { EmptyState, ErrorNote, Skeleton } from "@/components/tactiq/ui";
import { useApiData } from "@/hooks/useApiData";
import { useCurrentUser } from "@/context/UserContext";
import { apiFetch } from "@/lib/apiClient";
import {
  asRole,
  canChangeRole,
  canChangeStatus,
  roleLabels,
  statusLabels,
  type UserRole,
  type UserStatus,
} from "@/lib/permissions";

type Row = {
  uid: string;
  email: string;
  displayName: string;
  photoUrl: string;
  xp: number;
  gems: number;
  level: number;
  streakDays: number;
  role: string;
  status: string;
  createdAt: string;
};

type Payload = {
  users: Row[];
  page: number;
  pageCount: number;
  total: number;
};

const ROLES: UserRole[] = ["student", "teacher", "parent", "admin", "super"];
const STATUSES: UserStatus[] = ["active", "pending", "blocked"];

/** Сурагчдын жагсаалт ба эрхийн удирдлага (Хяналт → Сурагчид). */
export default function AdminUsersPage() {
  const me = useCurrentUser();

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);

  /**
   * Хайлтын мөрийг URL болгоно.
   *
   * `useMemo` нь чухал: `useApiData` нь `path`-ыг хамаарал болгодог тул
   * рендер бүрт шинэ мөр үүсвэл хязгааргүй давталт үүсэх эрсдэлтэй.
   */
  const path = useMemo(() => {
    const search = new URLSearchParams();
    if (query.trim()) search.set("q", query.trim());
    if (roleFilter) search.set("role", roleFilter);
    if (statusFilter) search.set("status", statusFilter);
    search.set("page", String(page));
    return `/api/users?${search.toString()}`;
  }, [query, roleFilter, statusFilter, page]);

  const { data, loading, error, reload } = useApiData<Payload>(path);

  const actor = { uid: me.uid, role: asRole(me.role) };

  const change = async (uid: string, patch: Record<string, string>) => {
    setBusyUid(uid);
    setActionError(null);

    try {
      await apiFetch(`/api/users/${encodeURIComponent(uid)}`, {
        method: "PATCH",
        body: patch,
      });
      await reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Алдаа гарлаа.");
    } finally {
      setBusyUid(null);
    }
  };

  const rows = data?.users ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Сурагчид
        </h1>
        {data && (
          <p className="num text-sm text-gray-500 dark:text-gray-400">
            Нийт {data.total}
          </p>
        )}
      </div>

      <div className="surface flex flex-wrap gap-2 p-4">
        <div className="relative min-w-48 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              // Шүүлтүүр солигдоход хуудсыг эхнээс нь эхлүүлнэ — эс бөгөөс
              // 3-р хуудсан дээр байгаад хайлт хийхэд хоосон гарна.
              setPage(1);
            }}
            placeholder="Нэр эсвэл имэйлээр хайх"
            className={`${inputClass} pl-9`}
          />
        </div>

        <select
          value={roleFilter}
          onChange={(event) => {
            setRoleFilter(event.target.value);
            setPage(1);
          }}
          className={`${inputClass} w-auto`}
        >
          <option value="">Бүх эрх</option>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {roleLabels[role]}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
          className={`${inputClass} w-auto`}
        >
          <option value="">Бүх төлөв</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </select>
      </div>

      {actionError && <ErrorNote message={actionError} />}
      {error && <ErrorNote message={error} onRetry={reload} />}

      {loading && <Skeleton className="h-64 w-full" />}

      {!loading && !error && rows.length === 0 && (
        <EmptyState
          title="Хэрэглэгч олдсонгүй"
          description="Хайлт, шүүлтүүрээ өөрчилж үзнэ үү."
        />
      )}

      {rows.length > 0 && (
        <div className="surface overflow-x-auto">
          <table className="w-full min-w-4xl text-sm">
            <thead className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-400 dark:border-white/10">
              <tr>
                <th className="px-4 py-3 font-semibold">Сурагч</th>
                <th className="px-4 py-3 font-semibold">Түвшин</th>
                <th className="px-4 py-3 font-semibold">Дараалал</th>
                <th className="px-4 py-3 font-semibold">Эрх</th>
                <th className="px-4 py-3 font-semibold">Төлөв</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-white/10">
              {rows.map((row) => {
                const target = { uid: row.uid, role: asRole(row.role) };
                const roleAllowed = canChangeRole(
                  actor,
                  target,
                  target.role === "student" ? "admin" : "student"
                );
                const statusAllowed = canChangeStatus(actor, target);
                const busy = busyUid === row.uid;

                return (
                  <tr key={row.uid}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                          {(row.displayName || row.email || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900 dark:text-white">
                            {row.displayName || "—"}
                          </p>
                          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                            {row.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="num px-4 py-3 text-gray-700 dark:text-gray-300">
                      {row.level}
                      <span className="ml-1 text-xs text-gray-400">
                        ({row.xp})
                      </span>
                    </td>

                    <td className="num px-4 py-3 text-gray-700 dark:text-gray-300">
                      {row.streakDays}
                    </td>

                    <td className="px-4 py-3">
                      <select
                        value={asRole(row.role)}
                        disabled={busy || !roleAllowed.allowed}
                        title={
                          roleAllowed.allowed ? undefined : roleAllowed.reason
                        }
                        onChange={(event) =>
                          void change(row.uid, { role: event.target.value })
                        }
                        className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-white"
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {roleLabels[role]}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-4 py-3">
                      {statusAllowed.allowed ? (
                        <select
                          value={row.status}
                          disabled={busy}
                          onChange={(event) =>
                            void change(row.uid, { status: event.target.value })
                          }
                          className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-white"
                        >
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {statusLabels[status]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge
                          tone={
                            row.status === "active"
                              ? "emerald"
                              : row.status === "blocked"
                                ? "rose"
                                : "amber"
                          }
                        >
                          {statusLabels[row.status as UserStatus] ?? row.status}
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && data.pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium disabled:opacity-40 dark:border-white/15 dark:text-gray-200"
          >
            Өмнөх
          </button>
          <span className="num text-sm text-gray-500">
            {data.page} / {data.pageCount}
          </span>
          <button
            type="button"
            disabled={page >= data.pageCount}
            onClick={() => setPage((value) => value + 1)}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium disabled:opacity-40 dark:border-white/15 dark:text-gray-200"
          >
            Дараах
          </button>
        </div>
      )}
    </div>
  );
}
