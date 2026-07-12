-- ============================================================
-- BNI 商機交流平台 Business Referral Match
-- Supabase (PostgreSQL) 完整資料庫 Schema
-- 在 Supabase SQL Editor 直接執行本檔案即可
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- 會員 ----------
create table if not exists public.members (
  id          text primary key default gen_random_uuid()::text,
  auth_id     uuid references auth.users (id) on delete set null,
  name        text not null,
  company     text not null default '',
  industry    text not null default '',
  chapter     text not null default '',
  title       text not null default '',
  phone       text not null default '',
  line        text not null default '',
  email       text not null default '',
  website     text,
  facebook    text,
  instagram   text,
  linkedin    text,
  role        text not null default 'member' check (role in ('member', 'admin')),
  color       text not null default '#c8102e',
  media       jsonb not null default '{}'::jsonb,  -- { logo:[], avatar:[], company:[], portfolio:[], video:[], businessCard:[] }
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists members_industry_idx on public.members (industry);
create index if not exists members_chapter_idx  on public.members (chapter);
create index if not exists members_auth_idx     on public.members (auth_id);

-- ---------- 交流卡（所有題目答案存 JSONB，題目 id 對應 src/lib/questions.ts）----------
create table if not exists public.exchange_cards (
  member_id   text primary key references public.members (id) on delete cascade,
  answers     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- 常用查詢的 JSONB 索引（服務地區／產業／資源）
create index if not exists cards_answers_gin on public.exchange_cards using gin (answers);

-- ---------- 互動紀錄：121 / 轉介 / 合作 / 共同客戶 ----------
create table if not exists public.interactions (
  id          text primary key default gen_random_uuid()::text,
  type        text not null check (type in ('121', 'referral', 'cooperation', 'shared_client')),
  from_id     text not null references public.members (id) on delete cascade,
  to_id       text not null references public.members (id) on delete cascade,
  date        date not null default current_date,
  note        text,
  amount      numeric,          -- 轉介金額
  closed      boolean,          -- 轉介是否成交
  created_at  timestamptz not null default now()
);

create index if not exists interactions_from_idx on public.interactions (from_id);
create index if not exists interactions_to_idx   on public.interactions (to_id);
create index if not exists interactions_type_idx on public.interactions (type, date);

-- ---------- 配對結果快取（可選：由排程重算）----------
create table if not exists public.match_scores (
  member_id   text not null references public.members (id) on delete cascade,
  target_id   text not null references public.members (id) on delete cascade,
  score       int  not null check (score between 0 and 100),
  probability int  not null,
  reasons     jsonb not null default '[]'::jsonb,
  tags        jsonb not null default '[]'::jsonb,
  computed_at timestamptz not null default now(),
  primary key (member_id, target_id)
);

-- ---------- updated_at 自動更新 ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists members_touch on public.members;
create trigger members_touch before update on public.members
  for each row execute function public.touch_updated_at();

drop trigger if exists cards_touch on public.exchange_cards;
create trigger cards_touch before update on public.exchange_cards
  for each row execute function public.touch_updated_at();

-- ---------- Row Level Security ----------
alter table public.members        enable row level security;
alter table public.exchange_cards enable row level security;
alter table public.interactions   enable row level security;
alter table public.match_scores   enable row level security;

-- 已登入會員可讀取分會所有公開資料
create policy "members readable by authenticated"
  on public.members for select to authenticated using (true);

create policy "cards readable by authenticated"
  on public.exchange_cards for select to authenticated using (true);

create policy "interactions readable by authenticated"
  on public.interactions for select to authenticated using (true);

create policy "match scores readable by authenticated"
  on public.match_scores for select to authenticated using (true);

-- 只能修改自己的會員資料與交流卡
create policy "update own member row"
  on public.members for update to authenticated
  using (auth.uid() = auth_id) with check (auth.uid() = auth_id);

create policy "upsert own card"
  on public.exchange_cards for insert to authenticated
  with check (member_id in (select id from public.members where auth_id = auth.uid()));

create policy "update own card"
  on public.exchange_cards for update to authenticated
  using (member_id in (select id from public.members where auth_id = auth.uid()));

-- 互動紀錄：發起人可新增
create policy "insert own interactions"
  on public.interactions for insert to authenticated
  with check (from_id in (select id from public.members where auth_id = auth.uid()));

-- 管理員（role = 'admin'）擁有完整權限
create policy "admin full access members"
  on public.members for all to authenticated
  using (exists (select 1 from public.members me where me.auth_id = auth.uid() and me.role = 'admin'));

create policy "admin full access cards"
  on public.exchange_cards for all to authenticated
  using (exists (select 1 from public.members me where me.auth_id = auth.uid() and me.role = 'admin'));

create policy "admin full access interactions"
  on public.interactions for all to authenticated
  using (exists (select 1 from public.members me where me.auth_id = auth.uid() and me.role = 'admin'));

-- ---------- Storage：媒體上傳桶 ----------
insert into storage.buckets (id, name, public)
values ('member-media', 'member-media', true)
on conflict (id) do nothing;

create policy "media readable by all"
  on storage.objects for select using (bucket_id = 'member-media');

create policy "media upload by authenticated"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'member-media');

-- ============================================================
-- 示範資料（與程式內建 demo 一致，可直接體驗）
-- ============================================================
insert into public.members (id, name, company, industry, chapter, title, phone, line, email, website, role, color) values
  ('m1',  '王小明', '康誠醫療器材',     '醫療健康',     '富樂分會', '業務總監', '0912-345-678', 'wang_kc',     'wang@kangcheng.tw', 'https://kangcheng.tw', 'admin',  '#c8102e'),
  ('m2',  '李大華', '仁華復健診所',     '醫療健康',     '富樂分會', '院長',     '0922-111-222', 'dr_lee',      'lee@renhua.tw',     'https://renhua.tw',    'member', '#2a78d6'),
  ('m3',  '陳美玲', '美玲空間設計',     '室內設計',     '富樂分會', '設計總監', '0933-222-333', 'ml_design',   'chen@mldesign.tw',  'https://mldesign.tw',  'member', '#eda100'),
  ('m4',  '林志豪', '豪邸房產',         '房地產',       '富樂分會', '店長',     '0955-333-444', 'howhouse',    'lin@howhouse.tw',   'https://howhouse.tw',  'member', '#1baf7a'),
  ('m5',  '張雅婷', '雅信會計師事務所', '會計財稅',     '富樂分會', '會計師',   '0966-444-555', 'cpa_chang',   'chang@yaxin.tw',    'https://yaxin.tw',     'member', '#4a3aa7'),
  ('m6',  '黃國倫', '倫格法律事務所',   '法律服務',     '富樂分會', '主持律師', '0977-555-666', 'lawyer_huang','huang@lunge.law',   'https://lunge.law',    'member', '#eb6834'),
  ('m7',  '吳佩珊', '珊瑚整合行銷',     '行銷廣告',     '富樂分會', '創辦人',   '0988-666-777', 'coral_mkt',   'wu@coralmkt.tw',    'https://coralmkt.tw',  'member', '#e87ba4'),
  ('m8',  '劉建宏', '宏遠數位科技',     '網頁/軟體開發','富樂分會', '技術長',   '0910-777-888', 'hy_tech',     'liu@hongyuan.dev',  'https://hongyuan.dev', 'member', '#008300'),
  ('m9',  '蔡淑芬', '芬芳手作烘焙',     '餐飲食品',     '富樂分會', '負責人',   '0921-888-999', 'fenfang_bake','tsai@fenfang.tw',   'https://fenfang.tw',   'member', '#c8102e'),
  ('m10', '周文傑', '傑印精緻印刷',     '印刷包裝',     '富樂分會', '總經理',   '0932-999-000', 'jayprint',    'chou@jayprint.tw',  'https://jayprint.tw',  'member', '#2a78d6')
on conflict (id) do nothing;

insert into public.interactions (id, type, from_id, to_id, date, note, amount, closed) values
  ('i1', '121', 'm1', 'm2', '2026-07-02', '討論診所設備與講座合辦', null, null),
  ('i2', '121', 'm1', 'm3', '2026-07-06', '診所空間設計與設備配置', null, null),
  ('i3', '121', 'm3', 'm4', '2026-07-03', '成交即轉介流程對焦', null, null),
  ('i4', '121', 'm4', 'm5', '2026-07-08', '展店客戶的稅務需求', null, null),
  ('i5', '121', 'm5', 'm6', '2026-07-09', '創業法稅工作坊籌備', null, null),
  ('i6', '121', 'm7', 'm8', '2026-07-05', '開幕行銷＋官網套組', null, null),
  ('i7', '121', 'm9', 'm10', '2026-07-07', '中秋聯名禮盒打樣', null, null),
  ('i8', '121', 'm2', 'm7', '2026-07-10', '診所社群行銷規劃', null, null),
  ('i9', '121', 'm1', 'm5', '2026-07-11', '設備進口稅務諮詢', null, null),
  ('i10', '121', 'm1', 'm4', '2026-06-12', '診所展店選址', null, null),
  ('i11', '121', 'm3', 'm7', '2026-06-18', '完工案例聯合曝光', null, null),
  ('i12', '121', 'm6', 'm4', '2026-06-20', '商辦租約審閱合作', null, null),
  ('i13', '121', 'm8', 'm2', '2026-06-25', '診所預約系統需求', null, null),
  ('i14', '121', 'm9', 'm7', '2026-06-26', '品牌開幕企劃', null, null),
  ('r1', 'referral', 'm4', 'm3', '2026-07-04', '商辦成交轉介裝修設計', 1800000, true),
  ('r2', 'referral', 'm3', 'm1', '2026-07-08', '診所設計案轉介設備採購', 650000, true),
  ('r3', 'referral', 'm2', 'm1', '2026-07-09', '同業診所設備需求', 420000, false),
  ('r4', 'referral', 'm5', 'm6', '2026-07-06', '客戶股權糾紛諮詢', 120000, true),
  ('r5', 'referral', 'm7', 'm8', '2026-07-07', '品牌客戶官網改版', 500000, false),
  ('r6', 'referral', 'm9', 'm10', '2026-07-05', '禮盒包裝印製', 180000, true),
  ('r7', 'referral', 'm4', 'm6', '2026-06-15', '購屋合約審閱', 80000, true),
  ('r8', 'referral', 'm4', 'm5', '2026-06-22', '新公司設立記帳', 96000, true),
  ('r9', 'referral', 'm10', 'm9', '2026-06-28', '企業客戶訂購手作禮盒', 150000, true),
  ('r10', 'referral', 'm7', 'm9', '2026-06-30', '開幕活動甜點桌', 60000, true),
  ('c1', 'cooperation', 'm1', 'm2', '2026-06-30', '社區復健講座合辦', null, null),
  ('c2', 'cooperation', 'm9', 'm10', '2026-07-01', '中秋聯名禮盒', null, null),
  ('c3', 'cooperation', 'm7', 'm8', '2026-06-20', '數位轉型提案小組', null, null),
  ('c4', 'cooperation', 'm5', 'm6', '2026-06-10', '創業法稅一條龍', null, null),
  ('s1', 'shared_client', 'm3', 'm4', '2026-06-05', '連鎖烘焙展店案', null, null),
  ('s2', 'shared_client', 'm1', 'm2', '2026-06-08', '復健診所開業案', null, null),
  ('s3', 'shared_client', 'm7', 'm9', '2026-06-12', '烘焙品牌行銷案', null, null)
on conflict (id) do nothing;

-- ═══════════ 商機交流卡生命週期（Business Profile Timeline） ═══════════

-- 交流卡版本：動態商業檔案，完整保留歷史
create table if not exists card_versions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  version int not null,
  title text not null default '',
  answers jsonb not null default '{}',
  status text not null default 'draft', -- draft | active | completed | archived
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text not null default '',
  updated_by text not null default '',
  unique (member_id, version)
);
create index if not exists idx_card_versions_member on card_versions (member_id, status);

-- 專案管理
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  name text not null,
  intro text not null default '',
  ideal_referrals text not null default '',
  industries_needed jsonb not null default '[]',
  resources_offered text not null default '',
  expected_close text not null default '',
  start_date text not null default '',
  end_date text not null default '',
  is_main boolean not null default false,
  importance int not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_projects_member on projects (member_id);

-- AI 商機快訊
create table if not exists biz_alerts (
  id uuid primary key default gen_random_uuid(),
  member_ids jsonb not null default '[]',
  pair jsonb not null default '{}',
  probability int not null,
  reasons jsonb not null default '[]',
  trigger text not null default '',
  created_at timestamptz not null default now()
);
