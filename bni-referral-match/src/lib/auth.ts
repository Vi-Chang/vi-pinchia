import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * 伺服器端 session 驗證。
 * - 登入/註冊成功後發一組簽章 token，寫入 httpOnly cookie
 * - 所有資料 API 讀 cookie 驗證，沒有或無效即 401
 * - 因此匿名者（含爬蟲、AI 工具）僅憑網址無法取得任何內容
 */

export const SESSION_COOKIE = "brm_session";
const MAX_AGE_SEC = 30 * 24 * 60 * 60; // 30 天

/** 分會通行密碼（註冊時於伺服器端驗證） */
export const ACCESS_CODE = "3345678";

function secret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "brm-dev-secret-change-me"
  );
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

/** 產生 session token：base64url(payload).base64url(hmac) */
export function signSession(memberId: string): string {
  const payload = JSON.stringify({ mid: memberId, exp: Date.now() + MAX_AGE_SEC * 1000 });
  const p = b64url(payload);
  const sig = createHmac("sha256", secret()).update(p).digest("base64url");
  return `${p}.${sig}`;
}

/** 驗證 token，回傳 memberId 或 null */
export function verifySession(token: string | undefined | null): string | null {
  if (!token || !token.includes(".")) return null;
  const [p, sig] = token.split(".");
  const expected = createHmac("sha256", secret()).update(p).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(p, "base64url").toString("utf8"));
    if (!payload.mid || typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload.mid as string;
  } catch {
    return null;
  }
}

/** 從請求 cookie 取得已登入的 memberId（未登入回 null） */
export function getSessionMemberId(req: NextRequest): string | null {
  return verifySession(req.cookies.get(SESSION_COOKIE)?.value);
}

/** 供 NextResponse.cookies.set 使用的選項 */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SEC,
  };
}
