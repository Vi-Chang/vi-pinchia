import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";

export const metadata: Metadata = {
  title: "BNI 商機交流平台 · Business Referral Match",
  description: "高質感的 BNI 商機引薦交流系統－交流卡、AI 商機分析、配對引擎與會員關係圖。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f0e6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
