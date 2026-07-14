"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Member } from "@/lib/types";

interface AuthCtx {
  member: Member | null;
  loading: boolean;
  /** remember=true 記住此裝置（localStorage），false 僅本次瀏覽（sessionStorage） */
  login: (m: Member, remember?: boolean) => void;
  /** 更新目前登入者的資料（例如完成引導後） */
  update: (m: Member) => void;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({
  member: null,
  loading: true,
  login: () => {},
  update: () => {},
  logout: () => {},
});

const KEY = "brm-member";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 以伺服器 session 為準：驗證 cookie 是否有效
    let stored: Member | null = null;
    try {
      const raw = localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY);
      if (raw) stored = JSON.parse(raw);
    } catch {}
    if (stored) setMember(stored); // 先用本機資料避免閃爍

    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.member) {
          setMember(d.member);
          const store = sessionStorage.getItem(KEY) ? sessionStorage : localStorage;
          store.setItem(KEY, JSON.stringify(d.member));
        } else {
          // session 失效 → 清除本機登入狀態
          localStorage.removeItem(KEY);
          sessionStorage.removeItem(KEY);
          setMember(null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = (m: Member, remember = true) => {
    const store = remember ? localStorage : sessionStorage;
    (remember ? sessionStorage : localStorage).removeItem(KEY);
    store.setItem(KEY, JSON.stringify(m));
    setMember(m);
  };

  const update = (m: Member) => {
    const store = localStorage.getItem(KEY) ? localStorage : sessionStorage;
    store.setItem(KEY, JSON.stringify(m));
    setMember(m);
  };

  const logout = () => {
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
    setMember(null);
  };

  return <Ctx.Provider value={{ member, loading, login, update, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
