"use client";

import { Coins, Flame, Snowflake, Zap } from "lucide-react";
import { t } from "@/lib/i18n/t";

/**
 * Daamal-д давтагддаг жижиг элементүүд.
 *
 * Нэг файлд цуглуулсан нь зориуд: эдгээр нь тус бүр 10-20 мөр бөгөөд бараг
 * үргэлж хамт хэрэглэгддэг. Файл тус бүрт салгавал импортын жагсаалт
 * хуудас болгоны эхэнд 6 мөр болж хавагдана.
 */

/** Явцын мөр. `tone` нь дүүргэлтийн Tailwind класс (`bg-emerald-500`). */
export function ProgressBar({
  percent,
  tone = "bg-brand-500",
  className = "h-2",
  label,
}: {
  percent: number;
  tone?: string;
  className?: string;
  /** Дэлгэц уншигчид зориулсан тайлбар — харагдахгүй */
  label?: string;
}) {
  const value = Math.max(0, Math.min(100, Math.round(percent || 0)));

  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10 ${className}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${tone}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

/**
 * Толгой хэсгийн дараалал / эрдэнэ / зүрхний тоолуур.
 *
 * `frozen` (зөвхөн `kind === "streak"` үед утга учиртай) — өнөөдөр
 * хичээллээгүй ч дундах идэвхгүй өдрийг "мөс" (`streakFreezes`) хамгаалж
 * байгааг илэрхийлнэ. Тэр үед дөлийн оронд цасан ширхэг харуулж, дараалал
 * ЯГ ОДОО эвдрээгүйг тод мэдэгдэнэ.
 */
export function StatPill({
  kind,
  value,
  frozen = false,
}: {
  kind: "streak" | "gems" | "xp";
  value: number;
  frozen?: boolean;
}) {
  const config = {
    streak: frozen
      ? {
          Icon: Snowflake,
          tone: "text-sky-500",
          label: t("Дараалал мөсөөр хамгаалагдсан"),
        }
      : {
          Icon: Flame,
          tone: "text-flame-500",
          label: t("Дараалсан өдөр"),
        },
    gems: {
      Icon: Coins,
      tone: "text-sky-500",
      label: t("Зоос"),
    },

    xp: {
      Icon: Zap,
      tone: "text-xp-500",
      label: t("Нийт XP"),
    },
  }[kind];

  const { Icon } = config;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-sm font-semibold text-gray-700 dark:bg-white/5 dark:text-gray-200"
      title={config.label}
    >
      <Icon
        className={`size-4 ${config.tone}`}
        // Дүүрэн дүрс нь тоглоомын мэдрэмж өгнө — зөвхөн зурааснаас тод
        fill="currentColor"
        aria-hidden
      />
      <span className="num">{value}</span>
      <span className="sr-only">{config.label}</span>
    </span>
  );
}

/** Гарчиг + тайлбартай хоосон төлөв */
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="surface flex flex-col items-center gap-3 px-6 py-12 text-center">
      {icon && <div className="text-gray-400">{icon}</div>}
      <p className="text-base font-semibold text-gray-900 dark:text-white">
        {title}
      </p>
      {description && (
        <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

/**
 * Ачаалж буй агуулгын араг яс.
 *
 * Ачааллын үед эргэлддэг дугуй харуулахын оронд эцсийн байрлалыг нь зурна —
 * агуулга ирэхэд дэлгэц үсрэхгүй тул мэдрэгдэх хурд нь өндөр байдаг.
 */
export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-200 dark:bg-white/10 ${className}`}
      aria-hidden
    />
  );
}

/** Алдааны мэдэгдэл — дахин оролдох боломжтой */
export function ErrorNote({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
      role="alert"
    >
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-rose-300 px-3 py-1 font-medium hover:bg-rose-100 dark:border-rose-500/40 dark:hover:bg-rose-500/20"
        >
          {t("Дахин оролдох")}
        </button>
      )}
    </div>
  );
}

/**
 * Кодын хэсэг — түлхүүр үг, мөр, тэмдэгт мөрийг өнгөөр ялгана.
 *
 * Гуравдагч талын тодруулагч сан (highlight.js, prism) татахгүй байгаа нь
 * зориуд: тэдгээр нь 100-300KB нэмдэг бөгөөд бидэнд Python / JavaScript-ийн
 * ЭНГИЙН жишээ л хэрэгтэй. Энэ нь бүтэн парсер БИШ — уншихад тус болох
 * хэмжээний өнгө өгөх зорилготой. Буруу таамагласан ч код зөв харагдана.
 */
export function CodeBlock({
  code,
  className = "",
}: {
  code: string;
  className?: string;
}) {
  return (
    <pre
      className={`overflow-x-auto rounded-xl bg-gray-900 p-4 text-sm leading-relaxed text-gray-100 dark:bg-black/40 ${className}`}
    >
      <code className="font-num">{highlight(code)}</code>
    </pre>
  );
}

const KEYWORDS = new Set([
  "and", "as", "break", "case", "class", "const", "continue", "def", "elif",
  "else", "export", "false", "for", "from", "function", "if", "import", "in",
  "let", "new", "none", "not", "null", "or", "pass", "return", "true", "var",
  "while", "with",
]);

const BUILTINS = new Set([
  "print", "range", "len", "input", "int", "str", "float", "list", "dict",
  "console", "log", "sum", "min", "max", "abs", "round",
]);

/**
 * Кодыг өнгөт хэсгүүдэд хуваана.
 *
 * Нэг regex-ээр бүх төрлийг зэрэг барина — тэмдэгт мөр, тайлбар, тоо,
 * үг. Дараалал ЧУХАЛ: тайлбар ба тэмдэгт мөрийг ЭХЭЛЖ барихгүй бол тэдний
 * доторх түлхүүр үг өнгөтэй болж, буруу харагдана.
 */
function highlight(code: string): React.ReactNode[] {
  const pattern =
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(#[^\n]*|\/\/[^\n]*)|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_]\w*\b)/g;

  const out: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(code)) !== null) {
    if (match.index > last) out.push(code.slice(last, match.index));

    const [text, str, comment, num, word] = match;

    if (str) {
      out.push(<span key={key++} className="text-emerald-400">{text}</span>);
    } else if (comment) {
      out.push(<span key={key++} className="text-gray-500">{text}</span>);
    } else if (num) {
      out.push(<span key={key++} className="text-amber-300">{text}</span>);
    } else if (word && KEYWORDS.has(word.toLowerCase())) {
      out.push(<span key={key++} className="text-violet-400">{text}</span>);
    } else if (word && BUILTINS.has(word)) {
      out.push(<span key={key++} className="text-sky-300">{text}</span>);
    } else {
      out.push(text);
    }

    last = match.index + text.length;
  }

  if (last < code.length) out.push(code.slice(last));
  return out;
}
