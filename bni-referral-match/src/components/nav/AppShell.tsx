"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";

const NAV = [
  { href: "/dashboard", label: "首頁", icon: "🏠" },
  { href: "/cards", label: "交流卡管理", icon: "🗂️" },
  { href: "/card", label: "填寫交流卡", icon: "📋" },
  { href: "/projects", label: "專案", icon: "📁" },
  { href: "/alerts", label: "商機快訊", icon: "🔔" },
  { href: "/matches", label: "商機配對", icon: "💎" },
  { href: "/analysis", label: "AI 分析", icon: "🤖" },
  { href: "/network", label: "關係圖", icon: "🕸️" },
  { href: "/search", label: "搜尋", icon: "🔍" },
  { href: "/profile", label: "我的資料", icon: "👤" },
];

const ADMIN_NAV = { href: "/admin", label: "管理後台", icon: "🛠️" };

export function AppShell({ children }: { children: React.ReactNode }) {
  const { member, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !member) router.replace("/");
  }, [loading, member, router]);

  if (loading || !member) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="glass animate-pulse px-8 py-6 text-ink-soft">載入中…</div>
      </div>
    );
  }

  const items = member.role === "admin" ? [...NAV, ADMIN_NAV] : NAV;

  return (
    <div className="mx-auto flex min-h-screen max-w-[1440px]">
      {/* 桌機側欄 */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-4 p-5 lg:flex">
        <Link href="/dashboard" className="glass-strong glass-hover flex items-center gap-3 px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-bni-red text-lg font-bold text-white shadow-red">
            B
          </span>
          <div>
            <div className="text-[15px] font-bold leading-tight text-ink">BNI 商機交流平台</div>
            <div className="text-[11px] tracking-wide text-ink-muted">Business Referral Match</div>
          </div>
        </Link>

        <nav className="glass flex flex-1 flex-col gap-1 p-3">
          {items.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-medium transition-all duration-200 ${
                  active
                    ? "bg-white/90 text-bni-red shadow-glass"
                    : "text-ink-soft hover:bg-white/60 hover:text-ink"
                }`}
              >
                <span className="text-lg">{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="glass flex items-center gap-3 p-4">
          <Avatar name={member.name} color={member.color} size={40} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-ink">{member.name}</div>
            <div className="truncate text-xs text-ink-muted">{member.chapter}</div>
          </div>
          <button
            onClick={logout}
            className="rounded-full px-2.5 py-1 text-xs text-ink-muted transition hover:bg-white/70 hover:text-bni-red"
            title="登出"
          >
            登出
          </button>
        </div>
      </aside>

      {/* 主內容 */}
      <div className="min-w-0 flex-1 pb-24 lg:pb-6">
        {/* 手機頂欄 */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 lg:hidden">
          <Link href="/dashboard" className="glass-strong flex items-center gap-2 px-4 py-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-bni-red text-sm font-bold text-white">
              B
            </span>
            <span className="text-sm font-bold text-ink">商機交流平台</span>
          </Link>
          <button onClick={logout} className="glass px-4 py-2.5 text-xs text-ink-soft">
            登出
          </button>
        </header>

        <main className="px-4 pt-2 sm:px-6 lg:px-8 lg:pt-8">{children}</main>
      </div>

      {/* 手機底部導覽 */}
      <nav className="fixed inset-x-3 bottom-3 z-40 lg:hidden">
        <div className="glass-strong flex items-center justify-around px-2 py-2">
          {items.slice(0, 5).map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-[10px] font-medium transition ${
                  active ? "text-bni-red" : "text-ink-muted"
                }`}
              >
                <span className="text-lg">{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
