-- Payment rollout is intentionally deferred. Keep every test accessible during QA.
update public.assessment_tests
set paid = false;
