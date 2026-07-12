"use client";

import type { Answer } from "@/lib/types";

/* ---------- Dropdown ---------- */
export function Dropdown({
  value,
  options,
  onChange,
  placeholder = "請選擇…",
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field appearance-none pr-10"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted">
        ▾
      </span>
    </div>
  );
}

/* ---------- Radio（膠囊按鈕） ---------- */
export function RadioGroup({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((o) => {
        const on = value === o;
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o)}
            className={`chip ${on ? "chip-on" : ""}`}
          >
            {on && <span aria-hidden>✓</span>}
            {o}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Checkbox（多選膠囊） ---------- */
export function CheckboxGroup({
  value,
  options,
  onChange,
}: {
  value: string[];
  options: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (o: string) => {
    onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => toggle(o)}
            className={`chip ${on ? "chip-on" : ""}`}
          >
            {on && <span aria-hidden>✓</span>}
            {o}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Checkbox + 自動比例 % ---------- */
export function CheckboxPercent({
  value,
  options,
  onChange,
}: {
  value: Record<string, number>;
  options: string[];
  onChange: (v: Record<string, number>) => void;
}) {
  const selected = Object.keys(value);
  const total = Object.values(value).reduce((s, n) => s + (n || 0), 0);

  const toggle = (o: string) => {
    const next = { ...value };
    if (o in next) {
      delete next[o];
    } else {
      // 新勾選項目：自動填入剩餘比例
      next[o] = Math.max(0, 100 - total);
    }
    onChange(next);
  };

  const setPercent = (o: string, n: number) => {
    onChange({ ...value, [o]: Math.max(0, Math.min(100, n)) });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = o in value;
          return (
            <button
              key={o}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => toggle(o)}
              className={`chip ${on ? "chip-on" : ""}`}
            >
              {on && <span aria-hidden>✓</span>}
              {o}
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="space-y-2 rounded-2xl bg-white/50 p-4">
          {selected.map((o) => (
            <div key={o} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-sm font-medium text-ink">{o}</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={value[o] ?? 0}
                onChange={(e) => setPercent(o, Number(e.target.value))}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-ink/10 accent-[#c8102e]"
              />
              <div className="flex w-20 shrink-0 items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={value[o] ?? 0}
                  onChange={(e) => setPercent(o, Number(e.target.value))}
                  className="w-14 rounded-xl border border-ink/10 bg-white px-2 py-1 text-right text-sm"
                />
                <span className="text-xs text-ink-muted">%</span>
              </div>
            </div>
          ))}
          <div
            className={`pt-1 text-right text-xs font-semibold ${
              total === 100 ? "text-emerald-700" : "text-gold-600"
            }`}
          >
            合計 {total}%{total !== 100 && "（建議調整為 100%）"}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- 多行文字 ---------- */
export function TextArea({
  value,
  onChange,
  placeholder,
  maxLength,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
}) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        className="field resize-y"
      />
      {maxLength && (
        <div className="mt-1 text-right text-xs text-ink-muted">
          {value.length} / {maxLength}
        </div>
      )}
    </div>
  );
}

/* ---------- 滿意度量表 1–5 ---------- */
export function Scale({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((n) => {
        const on = value >= n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${n} 分`}
            className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold transition-all duration-200 ${
              on
                ? "bg-gradient-to-br from-gold-300 to-gold-500 text-white shadow-gold"
                : "border border-ink/10 bg-white/60 text-ink-muted hover:bg-white"
            }`}
          >
            {n}
          </button>
        );
      })}
      {value > 0 && <span className="ml-2 text-sm text-ink-soft">{value} 分</span>}
    </div>
  );
}

/* ---------- 題目容器：依型別渲染 ---------- */
export function answerAsString(a: Answer | undefined): string {
  return typeof a === "string" ? a : "";
}
export function answerAsArray(a: Answer | undefined): string[] {
  return Array.isArray(a) ? a : [];
}
export function answerAsPercent(a: Answer | undefined): Record<string, number> {
  return a && typeof a === "object" && !Array.isArray(a) ? (a as Record<string, number>) : {};
}
export function answerAsNumber(a: Answer | undefined): number {
  return typeof a === "number" ? a : 0;
}
