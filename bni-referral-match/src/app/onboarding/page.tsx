"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { SiteFooter } from "@/components/ui/SiteFooter";
import type { Answer } from "@/lib/types";

export default function OnboardingPage() {
  const { member, loading, update, logout } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [a, setA] = useState<Record<string, Answer>>({
    ob_specialty: "",
    ob_services: "",
  });

  if (loading) return null;
  if (!member) {
    if (typeof window !== "undefined") router.replace("/");
    return null;
  }

  const set = (k: string, v: Answer) => setA((p) => ({ ...p, [k]: v }));

  const finish = async (skip = false) => {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ memberId: member.id, answers: skip ? {} : a }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.member) {
        update(d.member);
        router.push("/dashboard");
        return;
      }
      if (res.status === 404) {
        // 帳號已不存在（示範資料重置）→ 清除本機登入狀態，避免卡在引導頁
        alert("登入狀態已過期（示範資料已重置），請重新登入或註冊。");
        logout();
        router.replace("/");
        return;
      }
      alert(d.error || "儲存失敗，請再試一次。");
    } catch {
      alert("連線失敗，請再試一次。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass w-full max-w-xl animate-fade-up p-8 lg:p-10">
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          歡迎，{member.name}！
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          用一分鐘介紹你的專業，之後填寫「交流卡」即可開始 AI 配對。
        </p>

        <div className="mt-7 space-y-5">
          <div>
            <label className="label">我的專長</label>
            <textarea
              className="field"
              rows={2}
              value={String(a.ob_specialty ?? "")}
              onChange={(e) => set("ob_specialty", e.target.value)}
              placeholder="例：全瓷冠與美白貼片的數位設計製作"
            />
          </div>
          <div>
            <label className="label">我提供的服務</label>
            <textarea
              className="field"
              rows={2}
              value={String(a.ob_services ?? "")}
              onChange={(e) => set("ob_services", e.target.value)}
              placeholder="例：固定假牙製作、牙科行前諮詢與衛教"
            />
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-ink/5 pt-5">
          <button
            onClick={() => finish(true)}
            disabled={busy}
            className="text-sm text-ink-muted hover:text-ink"
          >
            先跳過，之後再填
          </button>
          <button
            onClick={() => finish(false)}
            disabled={busy}
            className="btn-primary !px-6 !py-2.5 !text-sm disabled:opacity-50"
          >
            {busy ? "儲存中…" : "完成，進入首頁 →"}
          </button>
        </div>
        <p className="mt-4 text-center">
          <button
            onClick={() => {
              logout();
              router.replace("/");
            }}
            className="text-xs text-ink-muted underline-offset-2 hover:text-bni-red hover:underline"
          >
            登出，改用其他帳號
          </button>
        </p>
        <SiteFooter />
      </div>
    </div>
  );
}
