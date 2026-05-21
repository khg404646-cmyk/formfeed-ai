-- Supabase SQL Editor에서 이 파일 내용을 실행하세요.
--
-- MVP 정책:
-- 1) 브라우저는 Supabase에 직접 접근하지 않습니다.
-- 2) 모든 DB 접근은 Next.js API route + service_role_key로만 수행합니다.
-- 3) RLS는 활성화하지만 public anon policy는 만들지 않습니다.
-- 4) service_role_key는 RLS를 우회하므로 API route에서만 사용합니다.

create extension if not exists pgcrypto;

create table if not exists feedback_sessions (
  id uuid primary key default gen_random_uuid(),
  video_url text not null,
  video_file_name text,
  exercise_type text not null,
  trainer_display_name text,
  trainer_center_name text,
  share_token text unique default gen_random_uuid()::text,
  edit_token text unique default gen_random_uuid()::text,
  created_at timestamptz default now(),
  expires_at timestamptz
);

create table if not exists feedback_markers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references feedback_sessions(id) on delete cascade,
  timestamp_ms int not null,
  capture_url text,
  selected_area text,
  arrow_position text,
  arrow_direction text,
  popup_text text,
  detail_text text,
  cue_text text,
  confidence text,
  caution text,
  ai_raw_response jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_feedback_markers_session_id
  on feedback_markers(session_id);

create index if not exists idx_feedback_sessions_share_token
  on feedback_sessions(share_token);

create index if not exists idx_feedback_sessions_edit_token
  on feedback_sessions(edit_token);

alter table feedback_sessions enable row level security;
alter table feedback_markers enable row level security;

-- 중요 주석:
-- share_token: 회원용 조회 링크 토큰
-- edit_token: 편집/수정/삭제 권한 확인용 토큰
-- share 페이지 응답에는 edit_token을 절대 포함하지 않습니다.
-- expires_at은 현재 MVP에서 사용하지 않습니다.
-- 만료/삭제 로직은 V1.5에서 Supabase cron + R2 cleanup으로 구현합니다.
-- Cursor/Claude는 MVP 단계에서 expires_at 관련 자동 삭제 로직을 만들면 안 됩니다.
