"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/nav/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { Dropdown } from "@/components/form/controls";
import { useAutosave } from "@/hooks/useAutosave";
import { INDUSTRIES } from "@/lib/questions";
import type { MediaKind, Member } from "@/lib/types";

const FIELDS: { key: keyof Member; label: string; type?: string; placeholder?: string }[] = [
  { key: "name", label: "姓名" },
  { key: "company", label: "公司" },
  { key: "chapter", label: "BNI 分會" },
  { key: "title", label: "職稱" },
  { key: "phone", label: "電話", type: "tel" },
  { key: "line", label: "LINE" },
  { key: "email", label: "Email", type: "email" },
  { key: "website", label: "網站", placeholder: "https://…" },
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "linkedin", label: "LinkedIn" },
];

const MEDIA_SLOTS: { kind: MediaKind; label: string; icon: string; accept: string; multi?: boolean }[] = [
  { kind: "logo", label: "Logo", icon: "🏷️", accept: "image/*" },
  { kind: "avatar", label: "個人大頭照", icon: "😊", accept: "image/*" },
  { kind: "company", label: "公司照片", icon: "🏢", accept: "image/*", multi: true },
  { kind: "portfolio", label: "作品照片", icon: "🖼️", accept: "image/*", multi: true },
  { kind: "video", label: "影片", icon: "🎬", accept: "video/*" },
  { kind: "businessCard", label: "名片", icon: "💳", accept: "image/*" },
];

export default function ProfilePage() {
  const { member, login } = useAuth();
  const [form, setForm] = useState<Member | null>(null);

  useEffect(() => {
    if (member && !form) setForm(member);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member]);

  const { state } = useAutosave(
    form,
    async (m) => {
      if (!m) return;
      const res = await fetch("/api/members", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(m),
      });
      if (!res.ok) throw new Error("save failed");
      login(m); // 同步本機登入狀態
    },
    { enabled: !!form }
  );

  if (!member || !form) return <AppShell><div /></AppShell>;

  const set = (key: keyof Member, v: string) => setForm({ ...form, [key]: v });

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="glass animate-fade-up flex flex-wrap items-center justify-between gap-4 p-7">
          <div className="flex items-center gap-4">
            <Avatar
              name={form.name}
              color={form.color}
              size={64}
              src={form.media.avatar?.[0]}
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink">我的會員資料</h1>
              <p className="mt-0.5 text-sm text-ink-soft">
                {form.company} · {form.chapter}
              </p>
            </div>
          </div>
          <SaveIndicator state={state} />
        </div>

        {/* 基本資料 */}
        <div className="glass animate-fade-up p-7">
          <h2 className="font-bold text-ink">👤 基本資料</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className="label !text-sm">{f.label}</label>
                <input
                  type={f.type ?? "text"}
                  value={(form[f.key] as string) ?? ""}
                  placeholder={f.placeholder}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="field"
                />
              </div>
            ))}
            <div>
              <label className="label !text-sm">產業</label>
              <Dropdown
                value={form.industry}
                options={INDUSTRIES}
                onChange={(v) => set("industry", v)}
              />
            </div>
          </div>
        </div>

        {/* 媒體上傳 */}
        <div className="glass animate-fade-up p-7">
          <h2 className="font-bold text-ink">📁 媒體檔案</h2>
          <p className="mt-1 text-xs text-ink-muted">
            示範模式為本機預覽；正式環境自動上傳至 Supabase Storage。
          </p>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {MEDIA_SLOTS.map((s) => (
              <UploadSlot
                key={s.kind}
                slot={s}
                urls={form.media[s.kind] ?? []}
                onChange={(urls) =>
                  setForm({ ...form, media: { ...form.media, [s.kind]: urls } })
                }
              />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function UploadSlot({
  slot,
  urls,
  onChange,
}: {
  slot: { kind: MediaKind; label: string; icon: string; accept: string; multi?: boolean };
  urls: string[];
  onChange: (urls: string[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const isVideo = slot.accept.startsWith("video");

  const onFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const next = Array.from(files).map((f) => URL.createObjectURL(f));
    onChange(slot.multi ? [...urls, ...next] : [next[0]]);
  };

  return (
    <button
      type="button"
      onClick={() => input.current?.click()}
      className="group relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-ink/10 bg-white/40 transition-all duration-300 hover:border-gold-400 hover:bg-white/70"
    >
      <input
        ref={input}
        type="file"
        accept={slot.accept}
        multiple={slot.multi}
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      {urls.length > 0 ? (
        isVideo ? (
          <video src={urls[0]} className="h-full w-full object-cover" muted />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urls[0]} alt={slot.label} className="h-full w-full object-cover" />
        )
      ) : (
        <>
          <span className="text-2xl transition-transform duration-300 group-hover:scale-110">
            {slot.icon}
          </span>
          <span className="mt-1.5 text-xs font-medium text-ink-soft">{slot.label}</span>
          <span className="text-[10px] text-ink-muted">點擊上傳{slot.multi ? "（可多張）" : ""}</span>
        </>
      )}
      {urls.length > 0 && (
        <span className="absolute bottom-2 rounded-full bg-ink/70 px-2.5 py-0.5 text-[10px] text-white">
          {slot.label}{urls.length > 1 ? ` · ${urls.length}` : ""} ✓
        </span>
      )}
    </button>
  );
}
