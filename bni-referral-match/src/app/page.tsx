"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { SiteFooter } from "@/components/ui/SiteFooter";

const ACCESS_CODE = "3345678";
const GATE_KEY = "brm-gate-ok";

export default function LoginPage() {
  const { member, loading, login } = useAuth();
  const router = useRouter();
  const [gateOk, setGateOk] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && member) router.replace("/dashboard");
  }, [loading, member, router]);

  useEffect(() => {
    // 初次使用需輸入通行密碼；通過後記住這台裝置
    setGateOk(localStorage.getItem(GATE_KEY) === "1");
  }, []);

  const checkCode = () => {
    if (code === ACCESS_CODE) {
      localStorage.setItem(GATE_KEY, "1");
      setGateOk(true);
      setCodeError("");
    } else {
      setCodeError("密碼不正確，請洽分會管理員");
    }
  };

  const doLogin = async () => {
    setError("");
    if (!email.trim() || !password) {
      setError("請輸入 Email 和密碼");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "登入失敗");
      login(d.member, remember);
      router.push(d.member.onboarded ? "/dashboard" : "/onboarding");
    } catch (e) {
      setError(e instanceof Error ? e.message : "登入失敗");
    } finally {
      setBusy(false);
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
              商務夥伴商機交流平台
            </h1>
            <p className="mt-2 text-lg font-medium text-gold-600">Business Referral Match</p>
            <p className="mt-6 max-w-md text-[15px] leading-7 text-ink-soft">
              一張交流卡，讓商務夥伴真正認識你的事業。AI
              商機分析自動找出最適合你的引薦對象、合作夥伴與上下游關係，把每一次
              121 都變成有準備的商機。
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {["AI 商機配對", "商機廣場", "關係網絡圖", "即時儲存"].map((t) => (
                <span key={t} className="tag-gold">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 登入區 */}
        <div className="glass animate-fade-up p-8 lg:p-10" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-xl font-bold text-ink">會員登入</h2>

          {!gateOk ? (
            <>
              {/* 初次使用通行密碼 */}
              <p className="mt-1 text-sm text-ink-muted">
                初次使用請輸入通行密碼（洽分會管理員索取）
              </p>
              <input
                type="password"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setCodeError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && checkCode()}
                placeholder="請輸入通行密碼"
                className="field mt-6"
                autoFocus
              />
              {codeError && <p className="mt-2 text-sm text-bni-red">{codeError}</p>}
              <button onClick={checkCode} className="btn-primary mt-4 w-full">
                驗證 →
              </button>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-ink-muted">使用 Email 帳號登入</p>

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
                  <label className="label">密碼</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && doLogin()}
                    placeholder="請輸入密碼"
                    className="field"
                    autoComplete="current-password"
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <label className="flex cursor-pointer items-center gap-2 text-ink-soft">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    記住我
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      alert("示範模式尚未開通 Email 重設。請聯絡分會管理員協助重設密碼。")
                    }
                    className="text-ink-muted underline-offset-2 hover:text-bni-red hover:underline"
                  >
                    忘記密碼？
                  </button>
                </div>
                {error && <p className="text-sm text-bni-red">{error}</p>}
                <button onClick={doLogin} disabled={busy} className="btn-primary w-full disabled:opacity-50">
                  {busy ? "登入中…" : "登入 →"}
                </button>
              </div>

              <p className="mt-5 text-center text-sm text-ink-soft">
                還沒有帳號？
                <Link href="/register" className="ml-1 font-semibold text-bni-red">
                  立即註冊
                </Link>
              </p>
              <p className="mt-3 text-center text-xs text-ink-muted">
                示範帳號：wang@kangcheng.tw／demo1234
              </p>
            </>
          )}
          <SiteFooter />
        </div>
      </div>
    </div>
  );
}
