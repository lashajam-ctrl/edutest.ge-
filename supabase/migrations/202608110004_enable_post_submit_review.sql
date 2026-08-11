-- AI tutoring and post-submit review require the authoritative explanation only
-- after a server-verified attempt has been graded. Answer keys remain server-only.
update public.assessment_tests
set reveal_answers = true
where owner_user_id is null;
