"use client";

import type { SaveState } from "@/hooks/useAutosave";

export function SaveIndicator({ state }: { state: SaveState }) {
  const map: Record<SaveState, { text: string; cls: string; dot: string }> = {
    idle: { text: "所有變更將即時儲存", cls: "text-ink-muted", dot: "bg-ink/20" },
    saving: { text: "儲存中…", cls: "text-gold-600", dot: "bg-gold-500 animate-pulse" },
    saved: { text: "已自動儲存", cls: "text-emerald-700", dot: "bg-emerald-500" },
    error: { text: "儲存失敗，將自動重試", cls: "text-bni-red", dot: "bg-bni-red" },
  };
  const s = map[state];
  return (
    <span className={`inline-flex items-center gap-2 text-xs font-medium ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.text}
    </span>
  );
}
