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
    try {
      const raw = localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY);
      if (raw) setMember(JSON.parse(raw));
    } catch {}
    setLoading(false);
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
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
    setMember(null);
  };

  return <Ctx.Provider value={{ member, loading, login, update, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
