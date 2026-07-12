"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";
import type { Member } from "@/lib/types";

export default function LoginPage() {
  const { member, loading, login } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [picked, setPicked] = useState<string>("");

  useEffect(() => {
    if (!loading && member) router.replace("/dashboard");
  }, [loading, member, router]);

  useEffect(() => {
    fetch("/api/members")
      .then((r) => r.json())
      .then((d) => setMembers(d.members ?? []));
  }, []);

  const enter = () => {
    const m = members.find((x) => x.id === picked) ?? members[0];
    if (m) {
      login(m);
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* 品牌區 */}
        <div className="glass relative overflow-hidden p-10 lg:p-14">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 animate-float rounded-full bg-gradient-to-br from-gold-300/50 to-gold-400/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-bni-red/10 blur-2xl" />

          <div className="relative animate-fade-up">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-bni-red text-2xl font-bold text-white shadow-red">
              B
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-ink lg:text-5xl">
              BNI 商機交流平台
            </h1>
            <p className="mt-2 text-lg font-medium text-gold-600">Business Referral Match</p>
            <p className="mt-6 max-w-md text-[15px] leading-7 text-ink-soft">
              一張交流卡，讓分會夥伴真正認識你的事業。AI
              商機分析自動找出最適合你的引薦對象、合作夥伴與上下游關係，把每一次
              121 都變成有準備的商機。
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {["AI 商機配對", "關係網絡圖", "121 排行", "即時儲存"].map((t) => (
                <span key={t} className="tag-gold">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 登入區 */}
        <div className="glass-strong flex flex-col justify-center p-8 lg:p-10">
          <h2 className="text-xl font-bold text-ink">會員登入</h2>
          <p className="mt-1 text-sm text-ink-muted">
            示範模式：選擇一位會員身分即可體驗完整功能
          </p>

          <div className="mt-6 max-h-72 space-y-2 overflow-y-auto pr-1">
            {members.length === 0 && (
              <div className="animate-pulse rounded-2xl bg-white/50 p-4 text-sm text-ink-muted">
                載入會員名單中…
              </div>
            )}
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => setPicked(m.id)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200 ${
                  picked === m.id
                    ? "border-bni-red bg-white shadow-glass"
                    : "border-transparent bg-white/40 hover:bg-white/70"
                }`}
              >
                <Avatar name={m.name} color={m.color} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink">
                    {m.name}
                    {m.role === "admin" && <span className="tag-red ml-2">管理員</span>}
                  </div>
                  <div className="truncate text-xs text-ink-muted">
                    {m.company} · {m.industry}
                  </div>
                </div>
                {picked === m.id && <span className="text-bni-red">✓</span>}
              </button>
            ))}
          </div>

          <button
            onClick={enter}
            disabled={!picked && members.length === 0}
            className="btn-primary mt-6 w-full disabled:opacity-40"
          >
            進入平台 →
          </button>
          <p className="mt-4 text-center text-xs text-ink-muted">
            正式環境串接 Supabase Auth（Email 魔法連結／密碼登入）
          </p>
        </div>
      </div>
    </div>
  );
}
