"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { SiteFooter } from "@/components/ui/SiteFooter";

export default function ResetPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const doReset = async () => {
    setError("");
    if (!email.trim() || !phone.trim() || !code || !newPassword) {
      setError("請完整填寫 Email、手機號碼、重設碼與新密碼");
      return;
    }
    if (newPassword.length < 6) {
      setError("新密碼至少 6 個字元");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("兩次輸入的新密碼不一致");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, phone, code, newPassword, confirmPassword }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "重設失敗");
      // 重設成功即自動登入
      login(d.member, true);
      router.push(d.member.onboarded ? "/dashboard" : "/onboarding");
    } catch (e) {
      setError(e instanceof Error ? e.message : "重設失敗");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass animate-fade-up w-full max-w-md p-8 lg:p-10">
        <h1 className="text-xl font-bold text-ink">重設密碼</h1>
        <p className="mt-1 text-sm text-ink-muted">
          輸入你註冊時的 Email 與手機號碼，再填入重設碼即可設定新密碼。
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="field"
              autoComplete="email"
              autoFocus
            />
          </div>
          <div>
            <label className="label">註冊時的手機號碼</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09xx-xxx-xxx"
              className="field"
              autoComplete="tel"
            />
          </div>
          <div>
            <label className="label">重設碼</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="請洽分會管理員索取"
              className="field"
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="label">新密碼</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="至少 6 個字元"
              className="field"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label">確認新密碼</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doReset()}
              placeholder="再輸入一次新密碼"
              className="field"
              autoComplete="new-password"
            />
          </div>

          {error && <p className="text-sm text-bni-red">{error}</p>}

          <button onClick={doReset} disabled={busy} className="btn-primary w-full disabled:opacity-50">
            {busy ? "重設中…" : "重設密碼並登入 →"}
          </button>
        </div>

        <p className="mt-5 text-center text-sm text-ink-soft">
          想起來了？
          <Link href="/" className="ml-1 font-semibold text-bni-red">
            返回登入
          </Link>
        </p>
        <SiteFooter />
      </div>
    </div>
  );
}
