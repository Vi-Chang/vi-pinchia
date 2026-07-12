"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Member } from "@/lib/types";

interface AuthCtx {
  member: Member | null;
  loading: boolean;
  login: (m: Member) => void;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({
  member: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

const KEY = "brm-member";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setMember(JSON.parse(raw));
    } catch {}
    setLoading(false);
  }, []);

  const login = (m: Member) => {
    localStorage.setItem(KEY, JSON.stringify(m));
    setMember(m);
  };

  const logout = () => {
    localStorage.removeItem(KEY);
    setMember(null);
  };

  return <Ctx.Provider value={{ member, loading, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
