"use client";

import { COLOR_KEYS, COLOR_LABELS, colorStyles } from "@/lib/tactiq/theme";
import { ICON_NAMES, Icon } from "@/components/tactiq/Icon";

/**
 * Админы формын нийтлэг талбарууд.
 *
 * Курс, хичээл, амжилтын формууд ижил бүтэцтэй тул нэг дороос — эс бөгөөс
 * гурван газарт ижил `className` мөр хуулагдаж, аль нэг нь хоцордог.
 */

export const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-white/15 dark:bg-white/5 dark:text-white dark:focus:ring-brand-500/20";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
          {hint}
        </span>
      )}
    </label>
  );
}

export function TextField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={inputClass}
      />
    </Field>
  );
}

export function TextArea({
  label,
  hint,
  value,
  onChange,
  rows = 4,
  mono = false,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  /** Кодын талбарт — индентац харагдахын тулд */
  mono?: boolean;
}) {
  return (
    <Field label={label} hint={hint}>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        spellCheck={!mono}
        className={`${inputClass} ${mono ? "font-num" : ""}`}
      />
    </Field>
  );
}

export function NumberField({
  label,
  hint,
  value,
  onChange,
  min = 0,
  max = 1000,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(Number(event.target.value))}
        className={`${inputClass} num`}
      />
    </Field>
  );
}

export function SelectField<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className={inputClass}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function SwitchField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {label}
        </p>
        {hint && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-emerald-500" : "bg-gray-300 dark:bg-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white transition-[left] ${
            checked ? "left-[1.375rem]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

/** Өнгө сонгох — түлхүүрийг нь бодит өнгөөр нь харуулна */
export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label="Өнгө">
      <div className="flex flex-wrap gap-2">
        {COLOR_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            title={COLOR_LABELS[key]}
            aria-label={COLOR_LABELS[key]}
            aria-pressed={value === key}
            className={`size-9 rounded-xl ${colorStyles(key).iconBg} ${
              value === key
                ? "ring-2 ring-gray-900 ring-offset-2 dark:ring-white dark:ring-offset-gray-900"
                : ""
            }`}
          />
        ))}
      </div>
    </Field>
  );
}

/** Дүрс сонгох — зөвшөөрөгдсөн жагсаалтаас */
export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label="Дүрс">
      <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-xl border border-gray-200 p-2 dark:border-white/10">
        {ICON_NAMES.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            title={name}
            aria-label={name}
            aria-pressed={value === name}
            className={`grid size-9 place-items-center rounded-lg ${
              value === name
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
            }`}
          >
            <Icon name={name} className="size-4" />
          </button>
        ))}
      </div>
    </Field>
  );
}

/** Төлөвийн жижиг тэмдэг — нийтэлсэн / ноорог гэх мэт */
export function Badge({
  tone,
  children,
}: {
  tone: "emerald" | "gray" | "amber" | "rose";
  children: React.ReactNode;
}) {
  const tones = {
    emerald:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    gray: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  };

  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
