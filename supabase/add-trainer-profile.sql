-- 기존 Supabase 프로젝트에 한 번 실행 (SQL Editor)
alter table feedback_sessions
  add column if not exists trainer_display_name text,
  add column if not exists trainer_center_name text;
