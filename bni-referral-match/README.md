# BNI 商機交流平台 · Business Referral Match

高質感 Apple 風格、玻璃擬態（Glassmorphism）的 BNI 商機引薦交流系統。

**技術棧**：Next.js 14（App Router）+ TypeScript + TailwindCSS + Supabase（Auth / Postgres / Storage）+ Prisma

## 功能總覽

| 模組 | 說明 |
|---|---|
| 會員首頁 | 歡迎區、本月 121、本月轉介、交流卡完成率、商機配對數、合作建議、AI 今日推薦 |
| 交流卡 | 六大章節（事業現況盤點／商機機會診斷／BNI 成果診斷／合作深化／30 天行動計畫／個人品牌與資源），全部採 Dropdown / Checkbox / Radio / 多行文字，業務來源勾選後自動出現比例 %，**所有輸入即時儲存** |
| AI 商機分析 | 適合介紹給誰、誰適合介紹給他、可合作會員、客戶重疊、上下游、可合辦活動、可交叉銷售（內建規則引擎；設 `ANTHROPIC_API_KEY` 後由 Claude 產生行動建議） |
| 商機配對引擎 | 依產業、理想客戶、資源供需、服務地區、關鍵字計算 Match Score 0–100、★ 星等與配對成功率 % |
| 會員關係圖 | 力導向網絡圖，線條區分 121／轉介／合作／共同客戶，點擊節點查看互動明細 |
| 搜尋 | 姓名、公司、產業、服務、需求、資源、關鍵字 |
| 我的資料 | 會員 13 欄位 + Logo／大頭照／公司照／作品照／影片／名片上傳 |
| 管理後台 | 所有會員與回答、轉介／121 排行、熱門與最缺產業、需求／資源排行、長條圖、甜甜圈圖、雷達圖、熱力圖、關係圖 |

## 快速開始（免設定，內建示範資料）

```bash
npm install
npm run dev
```

開啟 http://localhost:3000 → 選擇任一示範會員登入。
**王小明**是管理員，可看到「管理後台」。未設定 Supabase 環境變數時，系統自動使用內建示範資料（記憶體模式），所有功能可完整體驗。

## 接上 Supabase（正式環境）

1. 建立 Supabase 專案 → SQL Editor 執行 [`supabase/schema.sql`](supabase/schema.sql)（含資料表、RLS、Storage 桶與示範資料）。
2. 複製 `.env.example` 為 `.env.local`，填入：
   - `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL` / `DIRECT_URL`（供 Prisma 使用）
3. （可選）`npm run prisma:generate` 產生 Prisma Client。
4. Supabase Auth 開啟 Email 登入；會員註冊後將 `auth.users.id` 寫入 `members.auth_id` 即完成綁定。

## 部署到 Vercel

```bash
npx vercel
```

或將 repo 推上 GitHub → Vercel「Import Project」→ Root Directory 選 `bni-referral-match` → 在 Environment Variables 貼上 `.env.local` 內容 → Deploy。零額外設定。

## 專案結構

```
bni-referral-match/
├── prisma/schema.prisma        # Prisma 資料模型
├── supabase/schema.sql         # 完整 SQL（資料表 + RLS + Storage + 種子資料）
├── src/
│   ├── app/
│   │   ├── page.tsx            # 登入
│   │   ├── dashboard/          # 會員首頁（AI 今日推薦）
│   │   ├── card/               # 交流卡（六章節、即時儲存）
│   │   ├── matches/            # 商機配對引擎
│   │   ├── analysis/           # AI 商機分析
│   │   ├── network/            # 會員關係圖
│   │   ├── search/             # 搜尋
│   │   ├── profile/            # 會員資料 + 媒體上傳
│   │   ├── admin/              # 管理後台 Dashboard
│   │   └── api/                # members / card / matches / analysis / interactions / admin/stats
│   ├── components/             # 玻璃卡片、表單控制、圖表、網絡圖、導覽
│   ├── hooks/useAutosave.ts    # 即時儲存
│   └── lib/                    # 題目定義、配對引擎、AI 分析、統計、資料層
└── tailwind.config.ts          # 奶油色系 + BNI 紅 + 淡金設計代幣
```

## 設計系統

- 柔和白／奶油色底、淡金與 BNI 紅（#C8102E）點綴
- 圓角 24px 卡片、毛玻璃 `backdrop-blur` + 半透明白
- 圖表色盤已通過色覺辨認（CVD）驗證，所有圖表附直接數值標籤
- RWD：桌機側欄／手機底部導覽，手機、平板、桌機皆可操作
