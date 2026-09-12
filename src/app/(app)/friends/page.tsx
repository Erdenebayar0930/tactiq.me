"use client";

import { useState } from "react";
import { Check, Handshake, Trash2, UserPlus, Users, X } from "lucide-react";

import { useCurrentUser } from "@/context/UserContext";
import FriendQuestCard from "@/components/tactiq/FriendQuestCard";
import InviteFriendCard from "@/components/tactiq/InviteFriendCard";
import MyCodeCard from "@/components/tactiq/MyCodeCard";
import { useApiData } from "@/hooks/useApiData";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { EmptyState, ErrorNote, ProgressBar, Skeleton } from "@/components/tactiq/ui";
import { isStudentRole } from "@/lib/permissions";

import type { Quest } from "@/components/tactiq/FriendQuestCard";

/**
 * Найзууд — хүсэлт илгээх/зөвшөөрөх, хамтын долоо хоногийн даалгавар.
 *
 * ⚠ Найз болох ЦОРЫН ГАНЦ зам нь сурагчийн хувийн код: нэр, имэйлээр
 * ХАЙХ боломж ЗОРИУДААР байхгүй. Хүүхдийн платформ дээр танихгүй хүн
 * жагсаалтаас хүүхэд сонгож чаддаг байх нь эрсдэл — код мэддэг хүн л
 * хүсэлт илгээнэ.
 */

type Friend = {
  uid: string;
  displayName: string;
  photoUrl: string | null;
  xp: number;
  level: number;
  streakDays: number;
  rating: number;
  weeklyXp: number;
};

type FriendsResponse = { friends: Friend[]; incoming: Friend[]; outgoing: Friend[] };

/*
 * ⚠ `Quest` төрлийг ЭНД дахин зарлахгүй, `FriendQuestCard`-аас импортлоно.
 * Хоёр газар бичвэл серверт талбар нэмэхэд (жишээ нь `daysLeft`) нэг нь
 * мартагдаж, компонент байхгүй өгөгдөл хүлээх болно.
 */
type QuestResponse = { quest: Quest | null; goalXp: number; rewardGems: number };

export default function FriendsPage() {
  const user = useCurrentUser();
  const friends = useApiData<FriendsResponse>("/api/friends");
  const quest = useApiData<QuestResponse>("/api/friends/quest");

  const reloadAll = () => {
    void friends.reload();
    void quest.reload();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Найзууд</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Найзтайгаа хамт оноо цуглуулж, долоо хоногийн даалгавраа биелүүл.
        </p>
      </div>

      {/*
        Өөрийн код нь найз нэмэх талбарын ДЭЭР: найз хоёулаа нэгэн зэрэг
        кодоо солилцдог тул "минийхийг хаанаас харах вэ" гэж хайх ёсгүй.
        Товч хувилбар — дэлгэрэнгүй тайлбар нь профайл дээр байна.
      */}
      {user.studentInviteCode && (
        <MyCodeCard code={user.studentInviteCode} isStudent={isStudentRole(user.role)} compact />
      )}

      <AddFriendCard onAdded={reloadAll} />

      <QuestCard
        data={quest.data}
        loading={quest.loading}
        friends={friends.data?.friends ?? []}
        onChanged={reloadAll}
      />

      {friends.error && (
        <ErrorNote message={friends.error} onRetry={() => void friends.reload()} />
      )}

      {friends.loading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : (
        <>
          <RequestSection
            title="Ирсэн хүсэлт"
            people={friends.data?.incoming ?? []}
            mode="incoming"
            onChanged={reloadAll}
          />
          <RequestSection
            title="Илгээсэн хүсэлт"
            people={friends.data?.outgoing ?? []}
            mode="outgoing"
            onChanged={reloadAll}
          />
          {/*
            ⚠ Урилгын карт нь "Миний найзууд"-ын ЯГ ДЭЭР. Урьд нь профайл
            дээр, хуудсын дунд байсан тул найзын хэсэгт байгаа хэрэглэгч
            "найз урьвал юу авах вэ" гэдгийг ХАРАХГҮЙ өнгөрдөг байв —
            урамшуулал нь яг тэр шийдвэр гаргах мөчид харагдах ёстой.
          */}
          {user.studentInviteCode && (
            <InviteFriendCard referredByFriend={user.referredByFriend} />
          )}

          <FriendList friends={friends.data?.friends ?? []} onChanged={reloadAll} />
        </>
      )}
    </div>
  );
}

function AddFriendCard({ onAdded }: { onAdded: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const result = await apiFetch<{
        friend: { displayName: string };
        status: "pending" | "accepted";
      }>("/api/friends", { method: "POST", body: { code } });

      setCode("");
      setNotice(
        result.status === "accepted"
          ? `${result.friend.displayName} — та нар найз боллоо!`
          : `${result.friend.displayName} рүү хүсэлт илгээлээ.`
      );
      onAdded();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="surface space-y-3 p-5">
      <div>
        <p className="font-bold text-gray-900 dark:text-white">Найз нэмэх</p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          Найзынхаа хувийн кодыг оруулна уу. Тэр нь хүсэлтийг зөвшөөрмөгц
          найзууд болно.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="Жишээ нь ABC123"
          maxLength={12}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          className="num w-full min-w-0 rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-semibold tracking-widest text-gray-900 outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5 dark:text-white"
        />
        <button
          type="submit"
          disabled={busy || code.trim().length === 0}
          className="btn-primary flex shrink-0 items-center gap-1.5 px-4 py-2.5 text-sm disabled:opacity-60"
        >
          <UserPlus className="size-4" aria-hidden />
          {busy ? "Илгээж байна…" : "Илгээх"}
        </button>
      </div>

      {error && <ErrorNote message={error} />}
      {notice && (
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{notice}</p>
      )}
    </form>
  );
}

function QuestCard({
  data,
  loading,
  friends,
  onChanged,
}: {
  data: QuestResponse | null;
  loading: boolean;
  friends: Friend[];
  onChanged: () => void;
}) {
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <Skeleton className="h-32 w-full rounded-2xl" />;

  const start = async (friendUid: string) => {
    setBusyUid(friendUid);
    setError(null);
    try {
      await apiFetch("/api/friends/quest", { method: "POST", body: { friendUid } });
      onChanged();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Алдаа гарлаа.");
    } finally {
      setBusyUid(null);
    }
  };

  const quest = data?.quest ?? null;

  if (quest) {
    return <FriendQuestCard quest={quest} rewardGems={data?.rewardGems ?? 30} />;
  }

  if (friends.length === 0) return null;

  return (
    <section className="surface space-y-3 p-5">
      <div>
        <p className="font-bold text-gray-900 dark:text-white">Хамтын даалгавар эхлүүлэх</p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          Найзтайгаа хамт долоо хоногт {data?.goalXp ?? 300} оноо цуглуулбал хоёулаа{" "}
          {data?.rewardGems ?? 30} зоос авна. Долоо хоногт нэг найзтай.
        </p>
      </div>

      {error && <ErrorNote message={error} />}

      <ul className="space-y-2">
        {friends.map((friend) => (
          <li key={friend.uid} className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gray-100 text-sm font-bold text-gray-600 dark:bg-white/10 dark:text-gray-300">
              {(friend.displayName || "?").charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-white">
              {friend.displayName}
            </span>
            <button
              type="button"
              onClick={() => void start(friend.uid)}
              disabled={busyUid !== null}
              className="shrink-0 rounded-xl bg-violet-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-600 disabled:opacity-60"
            >
              {busyUid === friend.uid ? "Эхлүүлж байна…" : "Урих"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RequestSection({
  title,
  people,
  mode,
  onChanged,
}: {
  title: string;
  people: Friend[];
  mode: "incoming" | "outgoing";
  onChanged: () => void;
}) {
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (people.length === 0) return null;

  const act = async (uid: string, accept: boolean) => {
    setBusyUid(uid);
    setError(null);
    try {
      await apiFetch(`/api/friends/${encodeURIComponent(uid)}`, {
        method: accept ? "PATCH" : "DELETE",
      });
      onChanged();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Алдаа гарлаа.");
      setBusyUid(null);
    }
  };

  return (
    <section className="surface p-5">
      <p className="mb-3 font-bold text-gray-900 dark:text-white">
        {title} ({people.length})
      </p>

      {error && <ErrorNote message={error} />}

      <ul className="space-y-2">
        {people.map((person) => (
          <li key={person.uid} className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gray-100 text-sm font-bold text-gray-600 dark:bg-white/10 dark:text-gray-300">
              {(person.displayName || "?").charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-white">
              {person.displayName}
            </span>

            {mode === "incoming" && (
              <button
                type="button"
                onClick={() => void act(person.uid, true)}
                disabled={busyUid !== null}
                className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60"
                aria-label={`${person.displayName}-ийн хүсэлтийг зөвшөөрөх`}
              >
                <Check className="size-4" aria-hidden />
              </button>
            )}

            <button
              type="button"
              onClick={() => void act(person.uid, false)}
              disabled={busyUid !== null}
              className="grid size-9 shrink-0 place-items-center rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50 dark:hover:bg-rose-500/10"
              aria-label={
                mode === "incoming"
                  ? `${person.displayName}-ийн хүсэлтээс татгалзах`
                  : `${person.displayName} рүү илгээсэн хүсэлтээ цуцлах`
              }
            >
              <X className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FriendList({ friends, onChanged }: { friends: Friend[]; onChanged: () => void }) {
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (friends.length === 0) {
    return (
      <EmptyState
        icon={<Users className="size-10" aria-hidden />}
        title="Хараахан найзгүй байна"
        description="Найзынхаа хувийн кодыг дээр оруулбал хүсэлт илгээгдэнэ."
      />
    );
  }

  const remove = async (uid: string) => {
    setBusyUid(uid);
    setError(null);
    try {
      await apiFetch(`/api/friends/${encodeURIComponent(uid)}`, { method: "DELETE" });
      onChanged();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Алдаа гарлаа.");
      setBusyUid(null);
    }
  };

  return (
    <section className="surface p-5">
      <p className="mb-3 font-bold text-gray-900 dark:text-white">
        Миний найзууд ({friends.length})
      </p>

      {error && <ErrorNote message={error} />}

      <ul className="space-y-3">
        {friends.map((friend) => (
          <li key={friend.uid} className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
              {(friend.displayName || "?").charAt(0).toUpperCase()}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">
                {friend.displayName}
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                Түвшин {friend.level} · {friend.rating} үнэлгээ · {friend.streakDays} өдөр
              </span>
              <span className="mt-1 block">
                {/* Долоо хоногийн зорилтын хувь — 500 XP-г "идэвхтэй долоо
                    хоног" гэж үзсэн харагдац, хатуу дүрэм БИШ. */}
                <ProgressBar percent={Math.min(100, (friend.weeklyXp / 500) * 100)} />
              </span>
            </span>

            <span className="num shrink-0 text-sm font-bold text-gray-700 dark:text-gray-300">
              {friend.weeklyXp} XP
            </span>

            <button
              type="button"
              onClick={() => void remove(friend.uid)}
              disabled={busyUid !== null}
              className="grid size-9 shrink-0 place-items-center rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50 dark:hover:bg-rose-500/10"
              aria-label={`${friend.displayName}-ийг найзаас хасах`}
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
