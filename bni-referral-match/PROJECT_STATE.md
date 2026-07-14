# PROJECT_STATE.md — 商務夥伴商機交流平台

> 最後更新：2026-07-15。此文件為專案完整現況快照，供下次開啟專案時快速掌握全貌。

---

## 0. 一句話與關鍵資訊

- **產品**：商務夥伴商機交流平台（Business Referral Match）——BNI 型商務引薦社群的線上化系統。原名「商機廣場」的頁面已改名「想要引薦或合作」，全站「BNI」字樣已改為「商務夥伴／商會」以避免商標問題。
- **線上網址**：https://referralengine.zeabur.app
- **GitHub（兩個同步 repo）**：
  - 主 repo（含其他專案的 monorepo，子目錄 `bni-referral-match/`）：`Vi-Chang/vi-pinchia`
  - 獨立 repo（只有本專案）：`Vi-Chang/BNI-MatchEngine`
- **部署**：Zeabur，service id `6a533de6b421dcaba7ae31ac`，project id `6a530c22723d6cf6efafa931`
- **管理員帳號**：`pinchia8860@gmail.com` / 密碼 `3345678`（唯一初始 admin，可開通其他管理員）
- **分會通行密碼（註冊用）**：`3345678`
- **現況**：已上線、已接 Supabase 永久儲存、已有真實會員在用（約 8 位真實會員）。

### 🔒 資料保全鐵律（最高優先，見 CLAUDE.md）
> 會員已上傳的任何資料（帳號、交流卡所有版本、專案、商機、快訊、互動）——**除非使用者在 UI 上手動刪除，否則一律不得刪除**。改版只改「定義」，不寫刪除/重置資料的程式；示範種子只在 members 表全空時執行。唯二例外：使用者/管理員在 UI 主動刪除、範例人物（is_demo）自動退場。

---

## 1. 專案目的

讓商務社群（分會）的會員把「彼此的事業與商機需求」數位化，透過 AI 自動媒合出最適合的**引薦對象、合作夥伴、上下游關係**，把每一次 121（一對一面談）變成有準備的商機。核心價值：

- 會員填一張多版本「商機交流卡」，完整盤點事業與需求。
- 本地規則引擎（零 API 成本）自動計算配對、搜尋、統計。
- 會員主動點「AI 深度分析」時才呼叫 Anthropic API 產生專屬合作提案（成本控管 + 快取）。
- 「想要引薦或合作」（商機廣場）讓會員發布開放合作；關係圖記錄實際互動；商機快訊即時通知高成功率配對。

---

## 2. 已完成功能

### 會員與帳號
- **Email 帳號系統**：註冊（分會通行密碼 + 姓名/分會/Email/手機/產業/密碼 + 選填公司/LINE + 同意條款）、Email+密碼登入、記住我。
- **忘記密碼（自助重設）**：`/reset` 頁填 Email + 註冊手機號 + 重設碼（`0000`，可用 `RESET_CODE` 環境變數覆寫）→ 手機號與帳號登記相符即驗證本人 → 設定新密碼並自動登入。實際把關的是「手機號需相符」；只換密碼（新 salt+hash），不動其他資料。
- **伺服器端 session 驗證**：登入/註冊發 HMAC 簽章 httpOnly cookie；所有資料 API 沒有有效 session 一律 401（擋爬蟲/AI 工具）。`/api/auth/me` 驗證、`/api/auth/logout` 清 cookie。
- **首次登入引導**（單步）：只填「我的專長 / 我提供的服務」，完成直接進首頁（可跳過）。
- **會員資料總覽頁**（/members）：全體名錄、搜尋、聯絡資訊、範例標註、已填卡統計；每人可進「商機卡」。
- **管理員**：唯一初始 admin（張婕）；可刪除任何會員（級聯清除其全部資料）、開通/收回他人管理員權限（操作者以 session 身分為準，防偽造）。

### 交流卡（動態商業檔案）
- **六大部分問卷**（見 §5 說明）；autosave；完成度%。
- **多版本生命週期**（/cards）：建立/編輯/複製/刪除/封存/設為使用中/版本歷程時間軸；自動記錄版本號、狀態、建立者/修改者、建立/修改日期。AI 分析採用「使用中」版本。
- 第五部分前先顯示 **AI 媒合結果 + 提案建議**（可點「看商機卡」）。
- 切換部分時自動捲回頁面頂端。
- 「填完交流卡（完成度≥80%）才開放配對」。

### AI 媒合與分析
- **規則引擎配對**（本地，零成本）：十項優先權重——①主推專案 ②最新交流卡 ③理想客戶 ④需要資源 ⑤提供資源 ⑥希望認識 ⑦過去合作 ⑧地區 ⑨產業 ⑩關鍵字。回傳分數、成功率、星等、理由、標籤。
- **AI 深度分析（按需）**：只有點擊才呼叫 Anthropic API（`claude-sonnet-4-6`，可用 `ANTHROPIC_MODEL` 覆寫），產生合作原因/三步驟計畫/互介客戶/提案切入/121 開場白。結果快取（交流卡或專案變動才失效）。
- **配對頁**（/matches）：全部/僅同分會切換；每張卡「已完成 121」按鈕（見下）。
- **AI 分析頁**（/analysis）：七大面向（適合介紹給誰、誰適合介紹給你、可合作、客戶重疊、上下游、可合辦活動、可交叉銷售）。
- **「✓ 已完成 121」**：點擊記一次 121（首頁統計連動），該夥伴暫不推薦（首頁/廣場/交流卡第五部分隱藏、配對頁標示），**直到對方更新交流卡或商機**自動恢復。判定＝我最近 121 時間 vs 對方最後更新內容時間（完整時間戳，同日也精準）。

### 專案（Projects）
- 每人多專案：名稱/介紹/希望介紹的客戶/需要產業/可提供資源/預計成交/起訖日/是否主推/重要程度★。主推專案為 AI 媒合最高優先。（註：獨立「專案」頁已移除，改為「會員資料」頁；專案資料與 API 仍存在，主要透過交流卡的主推專案運作。）

### 想要引薦或合作（原商機廣場，/plaza）
- 合作卡：姓名/分會/職業/標題/內容/類型 Tag/發布日/狀態（開放中/已結束）。
- 搜尋（姓名/分會/職業/內容）+ 篩選（類型/分會/開放中/收藏）+ 排序（最新發布/最近更新）。
- 我的引薦/合作：新增/編輯/刪除/結束/重新開放（可自行新增多張）。
- 每張卡：我要合作（通知對方 + 導向夥伴商機卡）、私訊會員、收藏。
- **交流卡「正在開放的合作或專案」自動同步**：填了自動建一張卡（id `auto-${memberId}`，標「來自交流卡」），更新即同步、清空即關閉（不刪）。
- **範本標註**：示範資料的合作卡標「範本」，管理員可刪。
- AI 推薦合作夥伴（本地規則引擎）。

### 夥伴商機卡頁（/partner/[id]）
- 一頁看懂一位夥伴：基本資料/聯絡（電話/Email/LINE）、與你的合作成功率、AI 合作建議（含深度分析按鈕）、對方開放中的合作、商機卡重點。入口：商機廣場姓名/會員資料「商機卡」鈕/AI 推薦名單「看商機卡」/「我要合作」後導向。

### 關係圖與統計
- **會員關係圖**（/network）：節點=會員，連線=121/引薦/合作/可能產生合作（原「共同客戶」已改名）。點節點可**主動記錄**我與該會員的關係（121/我引薦他/他引薦我/雙向引薦/合作/可能產生合作），記錄即寫入 Supabase、首頁統計與圖即時更新；每筆可刪。雙向引薦記為兩筆單向。
- **首頁**（/dashboard）：本月121/本月轉介/交流卡完成率/商機配對數（統計卡可點擊導向）、AI 今日推薦、合作建議。
- **智慧提醒**：交流卡逾 90 天未更新、主推專案逾期。
- **AI 商機快訊**（/alerts）：資料異動即重算媒合，成功率≥85% 通知雙方；商機廣場「我要合作」也會通知。

### 搜尋與後台
- **搜尋**（/search）：姓名/公司/產業/服務/需求/資源/關鍵字 + 分會篩選。
- **管理後台**（/admin）：分會儀表板（會員數/引薦/121/產業結構/資源供需/雷達圖/熱力圖），及「所有填單者資料」（展開看聯絡資訊+完整交流卡回答，管理員可刪會員）。
- **資料用量總覽**（/admin 內）：各資料表筆數與估算資料量（JSON 位元組）、占 Supabase 免費方案上限（500MB）%、最後活動時間與「7 天無活動暫停」提醒、是否已連 Supabase。純讀記憶體資料集，零外部呼叫（`getUsageStats()`）。

### 範例資料機制
- 內建 10 位示範會員（+管理員）標 `is_demo`，名字旁顯示「（範例）」。
- **真實會員填卡人數超過 5 人時，自動移除所有範例人物與其資料**（已在正式站觸發過，示範帳號已退場）。

### 安全
- 資料 API 全面 session 驗證；註冊伺服器端驗證通行密碼；`noindex`（不被搜尋/AI 爬蟲索引）；登入後 App 輕量防右鍵/圖片拖曳（保留文字選取，方便會員複製聯絡方式）。

---

## 3. 尚未完成功能 / 已知限制

- **忘記密碼**：已可自助重設（Email+登記手機號+重設碼 0000）。因 0000 為固定公開碼，實際安全性靠「手機號需相符」；若要更嚴，未來可改寄簡訊/Email 驗證碼。
- **獨立專案頁**：已移除 UI（避免與商機廣場重複）；專案主要靠交流卡的主推專案。若要完整的多專案管理 UI 需重建。
- **AI 分析整併（已處理主要痛點）**：`/api/analysis` 與 `/api/ai-insight` 現在共用 `ai-insight.ts` 的單一 `callClaude` 與統一模型 `anthropicModel()`（預設 `claude-sonnet-5`，`ANTHROPIC_MODEL` 可覆寫）。分析頁的 AI 敘事已從「每次載入自動呼叫」改為「按需 + 快取」（修掉成本漏洞）。兩個端點仍依用途分開（單人總結 vs 兩人深度分析），非合併為一。
- **per-object 授權**：資料 API 已「要求登入」，但尚未逐一驗證「只能改自己的資料」（例如理論上登入會員可帶他人 memberId 改卡）。管理操作已用 session 身分把關；一般會員資料寫入的細緻授權為未來強化項。
- **出貨/收件核對工具**（牙技所需求）：使用者提過但尚未定案、未開發。
- **Supabase 免費方案**：7 天無活動可能被暫停（有人使用即不會）。

---

## 4. API（全部位於 `src/app/api/*/route.ts`）

> 除 `auth/login`、`auth/register`、`auth/logout` 外，所有路由都要求有效 session cookie，否則 401。

| 路由 | 方法 | 說明 |
|---|---|---|
| `/api/auth/login` | POST | Email+密碼登入，成功設 session cookie，回 member |
| `/api/auth/register` | POST | 需 `accessCode`（通行密碼）；建立帳號、設 cookie、自動登入 |
| `/api/auth/logout` | POST | 清除 session cookie |
| `/api/auth/me` | GET | 驗證 cookie，回最新 member（失效 401） |
| `/api/auth/onboarding` | POST | 完成首次引導（memberId 取自 session） |
| `/api/auth/reset` | POST | 忘記密碼重設（免登入）：Email+手機號+重設碼(0000) 驗證本人 → 換密碼 → 發 cookie 自動登入 |
| `/api/members` | GET | 全體會員 + 已填卡統計 |
| `/api/members` | PUT | 更新會員資料 |
| `/api/members` | PATCH | 管理員開通/收回 admin（requester=session） |
| `/api/members` | DELETE | 管理員刪除會員（級聯，requester=session） |
| `/api/card` | GET | 取交流卡（可帶 versionId）+ 完成度 |
| `/api/card` | PUT | 存交流卡；觸發 auto-opportunity 同步、範例退場檢查、重算快訊 |
| `/api/card-versions` | GET/POST/PATCH/DELETE | 版本清單/建立/更新標題狀態/刪除 |
| `/api/projects` | GET/POST/DELETE | 專案清單/新增更新/刪除 |
| `/api/matches` | GET | 配對結果（memberId + scope=all/chapter）；回 `dismissed121` 旗標；無 memberId 回全體 top3 |
| `/api/analysis` | GET | 七大面向規則引擎分析（本地零成本，**不再呼叫 Claude**） |
| `/api/analysis` | POST | AI 深度總結（按需，Anthropic，需 memberId，含快取） |
| `/api/ai-insight` | POST | AI 深度分析（Anthropic，需 memberId/targetId，含快取） |
| `/api/plaza` | GET/POST/PATCH/DELETE | 商機清單/新增更新/改狀態/刪除（requester=session） |
| `/api/plaza/interest` | POST | 我要合作（fromId=session，通知發布者） |
| `/api/interactions` | GET | 全部互動 |
| `/api/interactions` | POST | 記錄關係 kind：`121`/`referral_out`/`referral_in`/`referral_two`/`cooperation`/`potential`（雙向記兩筆）|
| `/api/interactions` | DELETE | 刪除互動（本人/管理員） |
| `/api/alerts` | GET | 智慧提醒 + 商機快訊 |
| `/api/admin/stats` | GET | 後台儀表板資料（需 admin 角色） |

**回應慣例**：成功回 `{ 資料 }`，錯誤回 `{ error: "訊息" }` + HTTP 狀態（400 參數、401 未登入、403 權限、404 不存在、409 衝突、502/503 外部服務）。

---

## 5. Database Schema

**儲存策略（write-through）**：`src/lib/db.ts` 啟動時把整個資料集自 Supabase 載入記憶體（`getStore()`，用 `globalThis.__brmStorePromise` 快取），讀取全走記憶體（規則引擎零延遲），**每筆變更即時 upsert 回 Supabase**。首次啟動若 `members` 表為空 → 植入示範資料。**未設 Supabase 金鑰時退回純記憶體示範模式**（重啟重置）。Supabase client 用 `cache: "no-store"` 避免 Next.js fetch 快取汙染。

**Supabase 專案**：`azayitxmdbdmyrihuufg`（region Tokyo）。建表 SQL 見 `supabase/schema.sql`（可重複執行）。所有表啟用 RLS 且不建 policy → 只有 service_role key（伺服器端）能存取，anon key 無法讀寫。

7 張表（id 皆 text 主鍵；時間欄位存 text ISO 字串）：

- **members**：id, name, company, industry, chapter, title, phone, line, email, website, facebook, instagram, linkedin, role(`member`|`admin`), color, media(jsonb), onboarded(bool), is_demo(bool)
- **accounts**：email(PK), member_id→members(cascade), password_hash, salt（SHA-256 加鹽）
- **card_versions**：id, member_id(cascade), version(int), title, answers(jsonb), status(`draft`|`active`|`completed`|`archived`), created_at, updated_at, created_by, updated_by
- **projects**：id, member_id(cascade), name, intro, ideal_referrals, industries_needed(jsonb), resources_offered, expected_close, start_date, end_date, is_main(bool), importance(int), created_at, updated_at
- **opportunities**：id, member_id(cascade), title, content, type, status(`open`|`closed`), created_at, updated_at, is_template(bool)（自動卡 id 為 `auto-${memberId}`）
- **interactions**：id, type(`121`|`referral`|`cooperation`|`potential`), from_id(cascade), to_id(cascade), date(ISO 時間戳), note, amount(numeric), closed(bool)
- **biz_alerts**：id, member_ids(jsonb), pair(jsonb), probability(int), reasons(jsonb), trigger, created_at

> 另有 `prisma/schema.prisma`（Postgres）為早期產物，**目前實際不使用**（走 supabase-js + schema.sql）。修改資料模型以 `schema.sql` 與 `db.ts` 的 rowTo/toRow 轉換為準。

### 交流卡問卷結構（`src/lib/questions.ts`，答案存 card_versions.answers）
- **一、事業現況盤點**：s1_sources(比例%)、年資、團隊、營收型態、月新客、趨勢、重點、挑戰
- **二、商機機會診斷**：s2_easy_customer、s2_when_needed、s2_breakthrough、s2_want_to_meet
- **三、商會參與成果診斷**：s3_gain、s3_shortfall(複選+其他)、s3_awareness
- **四、合作關係深化**：s4_deep_talk(**分組核取**：47 位長城夥伴依產業鏈分 8 類，值=姓名/顯示「姓名｜行業」)、s4_longterm、s4_coop_key(複選+其他)、s4_target_industries、s4_coop_methods、s4_events、s4_cross_sell、s4_profit_model(複選：轉介客戶/資源共享/異業活動/專業諮詢/優惠方案/其他)
- **五、30 天行動計畫**：s5_121_target、s5_ref_target… (原 s5_121_list 已刪，改用第四部分深度交流)
- **六、個人品牌與資源**：s6_intro_60、s6_ideal_customer、s6_no_go、s6_resources_give、s6_resources_need、s6_company_line、s6_regions、s6_industries、**s6_open_projects（自動同步商機廣場）**… 另有引導題 ob_specialty / ob_services
> 改題目型別/改名時**保留舊 answer key**（未知 key 無害，不清洗），符合資料保全鐵律。

---

## 6. 已知 Bug / 注意事項

- **無「進行中」已知阻斷性 Bug**（截至最後更新，型別檢查通過、正式站運行中）。
- **已修復的重要 bug（避免回退）**：
  1. Supabase 讀取被 Next.js fetch 快取汙染 → 重啟讀到空資料誤重植示範資料。**修法：supabase client 加 `cache:"no-store"`**（勿移除）。
  2. 引導頁死循環：示範資料重置後舊登入狀態按完成→404 卻仍導向首頁→被彈回。**修法：404 時登出返回登入**（onboarding 頁）。
  3. better-sqlite3 原生模組在 Zeabur 建置失敗（早期留言板）→ 改用 Node 內建 `node:sqlite`（該功能在另一專案 index.html/server.js，非本平台）。
- **同日 121 vs 更新的精準度**：靠 interactions.date 存**完整 ISO 時間戳**才能精準（勿改回只存日期）；顯示時 slice(0,10)。
- **管理員自身**不受「填完卡才配對」等門檻豁免——目前一視同仁（若要豁免要另做）。
- **加入 session 後現有登入者需重新登入一次**（cookie 機制上線的一次性成本）。
- **OneDrive 同步**：專案在 OneDrive 資料夾，`.next` 曾因同步損毀（EINVAL readlink）；遇到建置怪錯先 `rm -rf .next` 重跑。

---

## 7. 待辦事項（優先序）

1. ~~**忘記密碼/正式 Auth**~~：✅ 已做自助重設（手機號+重設碼 0000）。未來可升級為簡訊/Email 驗證碼。
2. **per-object 授權強化**：資料寫入 API 驗證 memberId===session（或為對象擁有者/admin），封住「帶他人 id 改資料」。
3. ~~**整併 AI 分析**~~：✅ 已統一 Claude 呼叫路徑與模型、修掉分析頁自動扣費；兩端點依用途保留。
4. **出貨/收件核對工具**：待使用者定義需求（新獨立工具，可能 OCR 比對單號+診所）。
5. **會員資料/交流卡匯出**：使用者要求時，用管理員身分正規匯出（Excel/PDF/純文字）。
6. **Prisma 清理**：移除未使用的 prisma 產物，避免誤導。
7. ~~**監控 Supabase 免費方案用量/暫停風險**~~：✅ 後台已有「資料用量總覽」（筆數/估算量/上限%/最後活動/暫停提醒）。

---

## 8. Coding Style

- **語言/框架**：TypeScript（strict，`npx tsc --noEmit` 必須過）、Next.js 14 App Router、React 18、Tailwind CSS 3。UI 文案用**繁體中文**。
- **頁面**：`"use client"` 元件；資料以 `fetch("/api/...")` 取得（cookie 自動帶）。用 `useAuth()` 取登入者。頁面用 `<AppShell>` 包裝（含登入守衛、導覽、CopyGuard、頁尾）。
- **API route**：`export const dynamic = "force-dynamic"`；handler 開頭先 `getSessionMemberId(req)` 驗證，未登入回 `noAuth()`（**用函式產生新 Response，勿共用 NextResponse 實例**）。
- **資料層**：所有存取集中在 `src/lib/db.ts`，函式為 `async`；透過 `getStore()` 操作記憶體 + `persist()/removeRows()` 寫回 Supabase。新增實體需同步 rowTo/toRow 轉換 + schema.sql + getStore 載入。
- **樣式**：慣用 utility class；共用樣式類 `.glass` `.glass-hover` `.chip` `.chip-on` `.btn-primary` `.btn-gold` `.btn-ghost` `.field` `.label` `.tag-gold` `.tag-red`（見 globals.css）。品牌色 `bni-red`(#c8102e)、`gold-*`、`ink`/`ink-soft`/`ink-muted`。奶油底、玻璃擬態風。
- **命名**：交流卡答案 key 用 `s{部分}_{語意}`（如 `s6_open_projects`）；互動 kind 用 `referral_out/in/two` 等。
- **註解**：繁中，說明「為什麼」與資料保全考量。
- **提交**：中文 commit message + `Co-Authored-By: Claude ...`；改完必 `git push` 主 repo，再 `git subtree split --prefix=bni-referral-match` 推到 `BNI-MatchEngine`。

---

## 9. Folder Structure

```
bni-referral-match/
├─ CLAUDE.md                    # 開發規範（資料保全鐵律）— 務必先讀
├─ PROJECT_STATE.md             # 本文件
├─ README.md
├─ .env                         # 金鑰（git 忽略）：ANTHROPIC_API_KEY / NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
├─ .env.example
├─ next.config.mjs, postcss.config.mjs, package.json, tsconfig 等
├─ prisma/schema.prisma         # 早期產物，目前不使用
├─ supabase/schema.sql          # ★ 實際資料庫結構（貼到 Supabase SQL Editor 執行）
└─ src/
   ├─ app/
   │  ├─ layout.tsx             # 根版面（noindex、AuthProvider）
   │  ├─ globals.css            # Tailwind + 共用樣式類
   │  ├─ page.tsx               # 登入頁（gate 通行密碼→Email 登入）
   │  ├─ register/              # 註冊
   │  ├─ onboarding/            # 首次引導（單步）
   │  ├─ dashboard/             # 首頁（統計、今日推薦）
   │  ├─ card/                  # 填寫交流卡（六部分 + 第五部分 AI 媒合）
   │  ├─ cards/                 # 交流卡管理（多版本、時間軸）
   │  ├─ matches/               # 商機配對（含「已完成121」）
   │  ├─ analysis/              # AI 七面向分析
   │  ├─ plaza/                 # 想要引薦或合作（原商機廣場）
   │  ├─ partner/[id]/          # 夥伴商機卡
   │  ├─ network/              # 關係圖（可記錄關係）
   │  ├─ members/               # 所有會員資料
   │  ├─ search/                # 搜尋
   │  ├─ profile/               # 我的資料
   │  ├─ admin/                 # 管理後台
   │  └─ api/                   # 見 §4（auth/ members/ card/ card-versions/ projects/
   │                            #        matches/ analysis/ ai-insight/ plaza/ plaza/interest/
   │                            #        interactions/ alerts/ admin/stats）
   ├─ components/
   │  ├─ auth/AuthProvider.tsx  # 登入狀態（載入時 /api/auth/me 驗 session）
   │  ├─ nav/AppShell.tsx       # 側欄/底部導覽 + 守衛 + CopyGuard + 頁尾
   │  ├─ charts/NetworkGraph.tsx、charts.tsx
   │  ├─ form/controls.tsx      # Dropdown/Radio/Checkbox/GroupedCheckbox/CheckboxPercent/TextArea/Scale
   │  └─ ui/                    # Avatar, StatCard, Stars, SaveIndicator, SiteFooter, CopyGuard
   └─ lib/
      ├─ db.ts                  # ★ 資料存取層（記憶體 + Supabase write-through）
      ├─ auth.ts                # session 簽章/驗證、通行密碼、cookie
      ├─ types.ts               # 所有型別（Member/ExchangeCard/CardVersion/Project/Opportunity/Interaction/BizAlert…）
      ├─ questions.ts           # 交流卡六大部分題目定義
      ├─ match-engine.ts        # 規則引擎配對（十項權重、產業鏈 SUPPLY_CHAIN、關鍵字）
      ├─ suggestions.ts         # 規則版合作建議（合作方式/互介/提案）
      ├─ ai-insight.ts          # Anthropic 深度分析 + 快取
      ├─ ai-analysis.ts         # 七面向分析（規則）
      ├─ stats.ts               # 後台統計（排行/熱力圖/雷達/完成度）
      └─ demo-data.ts           # 10 位示範會員 + 交流卡 + 互動 + 專案
```

---

## 10. 下次開啟專案需要知道的事情

1. **先讀 `CLAUDE.md` 的資料保全鐵律**——已有真實會員資料，任何改動都不得刪除會員/交流卡；只改「定義」。
2. **本機 `.env` 連的是「正式」Supabase**（同一個資料庫）。**測試務必先把 `.env` 移開跑示範模式**（`mv .env .env.bak` → 測 → `mv .env.bak .env`），或只做唯讀操作，**絕不用測試資料污染正式庫**。
3. **開發啟動**：`bni-referral-match/` 下 `npm install` → `npm run dev`（本專案曾用 launch.json 名稱 `bni-3100` 跑在 port 3100）。改完 `npx tsc --noEmit` 必過。
4. **驗證流程**：登入取 cookie（curl `-c`/`-b` cookie jar 或瀏覽器），因所有資料 API 需 session。匿名 API 應回 401。
5. **部署**：`npx zeabur deploy --service-id 6a533de6b421dcaba7ae31ac --project-id 6a530c22723d6cf6efafa931`，再輪詢 `zeabur deployment get ...` 至 `RUNNING`。網址 https://referralengine.zeabur.app 。
6. **金鑰位置**：本機 `.env`（git 忽略）與 Zeabur 環境變數；`ANTHROPIC_API_KEY`、`NEXT_PUBLIC_SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`（另可設 `AUTH_SECRET`、`ANTHROPIC_MODEL`）。**勿把金鑰寫進任何入版控的檔案**。
7. **雙 repo 同步**：commit 主 repo `vi-pinchia` → `git subtree split --prefix=bni-referral-match -b bni-split` → push 到 `BNI-MatchEngine` → 刪暫時分支。
8. **改資料模型的三處要同步**：`supabase/schema.sql`（＋請使用者到 SQL Editor 執行）、`src/lib/db.ts`（型別 + rowTo/toRow + getStore 載入 + persist）、`src/lib/types.ts`。避免直接對正式庫下 DDL（會被安全機制擋，且要使用者授權）。
9. **另一個網站**：`vi-pinchia.zeabur.app` 是張婕的個人自我介紹名片頁（在 monorepo 根的 `index.html`，非本平台），與此專案不同。
10. **語氣/交付**：使用者為非技術背景，回覆用繁中、講重點與影響；每次功能都應「本機驗證 → commit/push 雙 repo → 部署 → 正式站唯讀確認」。
