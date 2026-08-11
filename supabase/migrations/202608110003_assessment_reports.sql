-- EduTest.ge authenticated question-reporting migration
-- Run AFTER 02-server-verified-assessment.sql.

begin;

create table if not exists public.assessment_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  test_id text not null references public.assessment_tests(id) on delete cascade,
  question_id text not null references public.assessment_questions(id) on delete restrict,
  report_type text not null check(report_type in ('wrong_answer','bad_question','typo','other')),
  comment text not null default '' check(char_length(comment) <= 1000),
  question_text_snapshot text not null default '' check(char_length(question_text_snapshot) <= 300),
  resolved boolean not null default false,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assessment_reports_created_idx
  on public.assessment_reports(created_at desc);
create index if not exists assessment_reports_status_idx
  on public.assessment_reports(resolved,created_at desc);
create index if not exists assessment_reports_reporter_rate_idx
  on public.assessment_reports(reporter_user_id,created_at desc);

alter table public.assessment_reports enable row level security;
revoke all on table public.assessment_reports from anon, authenticated;
-- Intentionally no browser RLS policies. Creation, listing and resolution go
-- through the authenticated assessment-report Edge Function.

commit;

