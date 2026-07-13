-- ═══════════════════════════════════════════════════════════
-- 商務夥伴商機交流平台 · Supabase 資料庫結構
-- 使用方式：Supabase Dashboard → SQL Editor → 貼上全部執行
-- （可重複執行；已存在的資料表不會被覆蓋或清除）
-- ═══════════════════════════════════════════════════════════

-- 會員
create table if not exists members (
  id         text primary key,
  name       text not null,
  company    text not null default '',
  industry   text not null default '',
  chapter    text not null default '',
  title      text not null default '',
  phone      text not null default '',
  line       text not null default '',
  email      text not null default '',
  website    text,
  facebook   text,
  instagram  text,
  linkedin   text,
  role       text not null default 'member', -- member | admin
  color      text not null default '#c8102e',
  media      jsonb not null default '{}',
  onboarded  boolean not null default false, -- 是否完成首次登入引導
  is_demo    boolean not null default false  -- 範例人物（真實填卡逾 5 人自動移除）
);

-- 登入帳號（Email + 加鹽雜湊密碼）
create table if not exists accounts (
  email         text primary key,
  member_id     text not null references members(id) on delete cascade,
  password_hash text not null,
  salt          text not null
);
create index if not exists idx_accounts_member on accounts (member_id);

-- 交流卡版本（動態商業檔案，完整保留歷史）
create table if not exists card_versions (
  id         text primary key,
  member_id  text not null references members(id) on delete cascade,
  version    int  not null,
  title      text not null default '',
  answers    jsonb not null default '{}',
  status     text not null default 'draft', -- draft | active | completed | archived
  created_at text not null,
  updated_at text not null,
  created_by text not null default '',
  updated_by text not null default ''
);
create index if not exists idx_card_versions_member on card_versions (member_id, status);

-- 專案（AI 媒合以主推專案為最高優先）
create table if not exists projects (
  id                text primary key,
  member_id         text not null references members(id) on delete cascade,
  name              text not null,
  intro             text not null default '',
  ideal_referrals   text not null default '',
  industries_needed jsonb not null default '[]',
  resources_offered text not null default '',
  expected_close    text not null default '',
  start_date        text not null default '',
  end_date          text not null default '',
  is_main           boolean not null default false,
  importance        int not null default 3,
  created_at        text not null,
  updated_at        text not null
);
create index if not exists idx_projects_member on projects (member_id);

-- 商機廣場（開放合作）
create table if not exists opportunities (
  id          text primary key,
  member_id   text not null references members(id) on delete cascade,
  title       text not null,
  content     text not null default '',
  type        text not null default '其他',
  status      text not null default 'open', -- open | closed
  created_at  text not null,
  updated_at  text not null,
  is_template boolean not null default false
);
create index if not exists idx_opportunities_member on opportunities (member_id);

-- 互動紀錄（121 / 引薦 / 合作 / 共同客戶）
create table if not exists interactions (
  id      text primary key,
  type    text not null, -- 121 | referral | cooperation | shared_client
  from_id text not null references members(id) on delete cascade,
  to_id   text not null references members(id) on delete cascade,
  date    text not null,
  note    text,
  amount  numeric,
  closed  boolean
);
create index if not exists idx_interactions_from on interactions (from_id);
create index if not exists idx_interactions_to on interactions (to_id);

-- AI 商機快訊（媒合成功率 >= 85% 通知雙方）
create table if not exists biz_alerts (
  id          text primary key,
  member_ids  jsonb not null default '[]',
  pair        jsonb not null default '{}',
  probability int not null default 0,
  reasons     jsonb not null default '[]',
  trigger     text not null default '',
  created_at  text not null
);

-- 安全性：全部啟用 RLS（不建立 policy）。
-- 平台以 service_role key 存取（繞過 RLS）；anon key 無法讀寫任何資料。
alter table members       enable row level security;
alter table accounts      enable row level security;
alter table card_versions enable row level security;
alter table projects      enable row level security;
alter table opportunities enable row level security;
alter table interactions  enable row level security;
alter table biz_alerts    enable row level security;
