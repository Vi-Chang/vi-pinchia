"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * 即時儲存 Hook：資料變更後 debounce 800ms 自動送出。
 * 回傳目前儲存狀態，供 UI 顯示「儲存中… / 已自動儲存」。
 */
export function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<void>,
  { delay = 800, enabled = true }: { delay?: number; enabled?: boolean } = {}
) {
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!enabled) return;
    if (first.current) {
      first.current = false;
      return;
    }
    setState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await saveRef.current(value);
        setState("saved");
      } catch {
        setState("error");
      }
    }, delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, delay, enabled]);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    setState("saving");
    try {
      await saveRef.current(value);
      setState("saved");
    } catch {
      setState("error");
    }
  }, [value]);

  return { state, flush };
}
