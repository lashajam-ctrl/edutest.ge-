-- EduTest.ge SERVER-VERIFIED ASSESSMENT hardening migration
-- Run AFTER the CHILD-SAFE Supabase setup.
-- This migration moves authoritative grading/history writes behind Edge Functions.

begin;

-- Existing learning history becomes READ-ONLY to browser users.
revoke insert, update, delete on table public.question_history from authenticated;
revoke insert, update, delete on table public.subject_history from authenticated;
drop policy if exists "question_history_insert_own" on public.question_history;
drop policy if exists "question_history_update_own" on public.question_history;
drop policy if exists "question_history_delete_own" on public.question_history;
drop policy if exists "subject_history_insert_own" on public.subject_history;
drop policy if exists "subject_history_update_own" on public.subject_history;
drop policy if exists "subject_history_delete_own" on public.subject_history;
grant select on table public.question_history to authenticated;
grant select on table public.subject_history to authenticated;

create table if not exists public.assessment_questions (
  id text primary key,
  pool_key text not null,
  pool_prefix text not null,
  pool_index integer not null default 0,
  grade smallint,
  subject text not null default '',
  semester smallint,
  topic text not null default '',
  question_type text not null,
  points smallint not null default 1 check(points > 0),
  public_payload jsonb not null,
  answer_key jsonb not null,
  explanation text not null default '',
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
create index if not exists assessment_questions_pool_idx on public.assessment_questions(pool_prefix,semester,active);
create index if not exists assessment_questions_catalog_idx on public.assessment_questions(grade,subject,semester,active);
alter table public.assessment_questions enable row level security;
revoke all on table public.assessment_questions from anon, authenticated;
-- Intentionally NO browser RLS policy: question bank + answer_key are server-only.

create table if not exists public.assessment_tests (
  id text primary key,
  title text not null,
  subject text not null,
  grade smallint not null check(grade between 1 and 12),
  pool_prefix text,
  question_count smallint not null default 10 check(question_count between 1 and 100),
  time_minutes smallint not null default 20 check(time_minutes between 1 and 240),
  attempts smallint not null default 2 check(attempts between 1 and 20),
  paid boolean not null default false,
  semester smallint,
  test_type text not null default 'mid',
  is_summary boolean not null default false,
  owner_user_id uuid references auth.users(id) on delete cascade,
  audience_grade text,
  due_at timestamptz,
  published boolean not null default true,
  reveal_answers boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.assessment_tests enable row level security;
revoke all on table public.assessment_tests from anon, authenticated;

create table if not exists public.assessment_test_questions (
  test_id text not null references public.assessment_tests(id) on delete cascade,
  question_id text not null references public.assessment_questions(id) on delete restrict,
  position integer not null default 0,
  primary key(test_id,question_id)
);
alter table public.assessment_test_questions enable row level security;
revoke all on table public.assessment_test_questions from anon, authenticated;

create table if not exists public.assessment_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_id text not null references public.assessment_tests(id) on delete restrict,
  mode text not null default 'verified' check(mode in ('verified','practice')),
  question_ids text[] not null,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  status text not null default 'active' check(status in ('active','submitted','expired')),
  integrity jsonb not null default '{}'::jsonb
);
create index if not exists assessment_sessions_user_test_idx on public.assessment_sessions(user_id,test_id,started_at desc);
alter table public.assessment_sessions enable row level security;
revoke all on table public.assessment_sessions from anon, authenticated;

create table if not exists public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.assessment_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  test_id text not null references public.assessment_tests(id) on delete restrict,
  earned numeric not null default 0,
  total_points numeric not null default 0,
  correct_count integer not null default 0,
  total_questions integer not null default 0,
  pct integer not null default 0 check(pct between 0 and 100),
  verified boolean not null default true,
  student_answers jsonb not null default '{}'::jsonb,
  review_summary jsonb not null default '[]'::jsonb,
  submitted_at timestamptz not null default now()
);
create index if not exists assessment_results_user_idx on public.assessment_results(user_id,submitted_at desc);
create index if not exists assessment_results_test_idx on public.assessment_results(test_id,submitted_at desc);
alter table public.assessment_results enable row level security;
drop policy if exists assessment_results_select_own on public.assessment_results;
create policy assessment_results_select_own on public.assessment_results for select to authenticated using(auth.uid()=user_id);
revoke all on table public.assessment_results from anon, authenticated;
grant select on table public.assessment_results to authenticated;

commit;

-- IMPORTANT
-- 1) Seed assessment_questions + core assessment_tests with seed-question-bank.mjs.
-- 2) Deploy assessment-start, assessment-submit, assessment-builder.
-- 3) Never expose SUPABASE_SERVICE_ROLE_KEY / sb_secret_* in the browser.
