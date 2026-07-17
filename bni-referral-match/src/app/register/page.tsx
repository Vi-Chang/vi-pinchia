"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { SiteFooter } from "@/components/ui/SiteFooter";

const INDUSTRIES = [
  "醫療健康", "室內設計", "房地產", "會計財稅", "法律服務", "行銷廣告",
  "網頁/軟體開發", "餐飲食品", "印刷包裝", "金融保險", "金融投資", "人力資源", "電商零售", "建築營造", "其他",
];

export default function RegisterPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [f, setF] = useState({
    accessCode: "",
    name: "",
    chapter: "",
    email: "",
    phone: "",
    industry: "",
    password: "",
    confirmPassword: "",
    company: "",
    line: "",
    agreed: false,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof f, v: string | boolean) => {
    setF((p) => ({ ...p, [k]: v }));
    setError("");
  };

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(f),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "註冊失敗");
      // 註冊完成直接進入系統，首次登入引導填 AI 商機資料
      login(d.member, true);
      router.push("/onboarding");
    } catch (e) {
      setError(e instanceof Error ? e.message : "註冊失敗");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass w-full max-w-xl animate-fade-up p-8 lg:p-10">
        <h1 className="text-2xl font-bold tracking-tight text-ink">建立帳號</h1>
        <p className="mt-1 text-sm text-ink-muted">
          只需一分鐘，其餘商機資料登入後再慢慢完成。
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">分會通行密碼 *</label>
            <input
              type="password"
              className="field"
              value={f.accessCode}
              onChange={(e) => set("accessCode", e.target.value)}
              placeholder="洽分會管理員索取"
            />
          </div>
          <div>
            <label className="label">姓名 *</label>
            <input className="field" value={f.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" />
          </div>
          <div>
            <label className="label">分會 *</label>
            <input className="field" value={f.chapter} onChange={(e) => set("chapter", e.target.value)} placeholder="例：長城鈦金分會" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Email（作為登入帳號）*</label>
            <input type="email" className="field" value={f.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
          </div>
          <div>
            <label className="label">手機號碼 *</label>
            <input type="tel" className="field" value={f.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" />
          </div>
          <div>
            <label className="label">職業／產業 *</label>
            <select className="field" value={f.industry} onChange={(e) => set("industry", e.target.value)}>
              <option value="">請選擇</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">密碼 *</label>
            <input type="password" className="field" value={f.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" placeholder="至少 6 個字元" />
          </div>
          <div>
            <label className="label">確認密碼 *</label>
            <input type="password" className="field" value={f.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} autoComplete="new-password" />
          </div>
          <div>
            <label className="label">公司名稱（選填）</label>
            <input className="field" value={f.company} onChange={(e) => set("company", e.target.value)} autoComplete="organization" />
          </div>
          <div>
            <label className="label">LINE ID（選填）</label>
            <input className="field" value={f.line} onChange={(e) => set("line", e.target.value)} />
          </div>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            className="mt-1"
            checked={f.agreed}
            onChange={(e) => set("agreed", e.target.checked)}
          />
          <span>
            我已閱讀並同意
            <button type="button" className="mx-1 font-semibold text-bni-red underline-offset-2 hover:underline" onClick={() => alert("服務條款與隱私政策（示範版）：本平台僅供商務夥伴交流使用，會員資料只用於商機媒合，不會提供給第三方。")}>
              服務條款與隱私政策
            </button>
          </span>
        </label>

        {error && <p className="mt-3 text-sm text-bni-red">{error}</p>}

        <button onClick={submit} disabled={busy} className="btn-primary mt-5 w-full disabled:opacity-50">
          {busy ? "建立中…" : "完成註冊，進入平台 →"}
        </button>

        <p className="mt-4 text-center text-sm text-ink-soft">
          已經有帳號？
          <Link href="/" className="ml-1 font-semibold text-bni-red">回登入頁</Link>
        </p>
        <SiteFooter />
      </div>
    </div>
  );
}
