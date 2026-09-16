# EduTest release procedure

## Sources and safety

- Edit `src/legacy-app/` for the legacy shell/runtime; `public/app.html` is generated. Ordered fragments are deliberately assembled into one classic script to preserve global handlers and hoisting. This is build-time modularization, not a claim of complete lazy-loading.
- Shared school policy: `public/school-rules.js`, re-exported to server/importers by `lib/school-policy.mjs`. Source-bank availability is a separate restriction.
- New UI: `public/learning-hub.js` and `public/learning-hub.css`. All dynamic text uses DOM text nodes.
- Do not change production secrets or include database contents/credentials in source commits.

## Required gate

1. Run `node scripts/assemble-app.mjs`, then `node scripts/release-gate.mjs`. This checks generated-source parity, TypeScript, all locally delivered scripts, regression tests, actual start/submit route handlers against an isolated SQLite fixture, and the normal build. Run `npm run lint` as well.
2. Run `node scripts/build-cloudflare.mjs`. Do not deploy if either build fails.
3. Record current source SHA and Cloudflare version. Review unapplied migrations; apply only additive migrations. `0011` adds email confirmation tables, `0012` adds isolated learning practice sessions, and `0013` adds resumable assessment drafts, version-bound question review records, and a remediation lookup index. Do not add duplicate runtime CREATEs for these migration-owned tables. Apply migrations to fresh local databases too.
4. Commit only reviewed task files, push, save/deploy a Sites version using `.openai/hosting.json`, then deploy Worker `edutestge` with the generated Cloudflare configuration. Preserve existing environment and secrets.
5. Run `node scripts/verify-production.mjs https://edutest.ge` after deployment. Also manually verify provider sign-in and a real browser flow using a designated test account; unauthenticated smoke checks are not evidence of OAuth or email delivery success.

## Rollback

- Before deployment, record the previous Worker version from Wrangler's deployment list. If health checks fail, use Wrangler's supported rollback command targeting that exact recorded version, with the user's authorized release scope.
- Roll back Sites by selecting the last successfully verified saved version, preserving its access mode and audience.
- Keep additive tables and data; do not roll back database schema or delete newly collected learning records. Older code ignores the new tables.
- Re-run read-only production checks against the expected previous behavior, and report the rollback. Do not label a rolled-back release successful.

## Deliberate limits

- Additional practice currently supports multiple choice, true/false and numeric questions. It requires a genuinely different selection group in the same grade/subject/semester/topic. If none exists, explain unavailability; do not fabricate a variation.
- Daily plans are rule-based recommendations from server history, not certified learning diagnostics or guaranteed new content every day.
- Weekly summaries are on demand only. Guardian access requires verified adult account email matching a child's current accepted consent. There is no scheduled email opt-in yet.
- Human question review is recorded only after an administrator explicitly checks and submits it. Approval is bound to the exact question/answer/explanation version and becomes stale when that content changes. Source `curriculum_reviewed` labels are not evidence. A correction request records a finding; it does not silently edit or publish a question. Bank group totals are not guaranteed daily test capacity.
- Drafts preserve the server-issued question order, answers, revision, and original deadline. Reopening a draft does not restart its timer. Concurrent stale tabs cannot overwrite a newer saved revision.
- The scheduled public health check runs through GitHub Actions every six hours. It does not exercise real OAuth, MFA, email delivery, or authenticated student workflows; notification delivery depends on the repository/account settings.

## September 2026 reliability release

- Local gate: 120 passing tests, TypeScript and browser-script syntax checks, lint, and production build. Lifecycle tests execute the real route handlers against isolated SQLite fixtures.
- Parent interface was inspected with a fictional local API fixture. This is UI evidence, not evidence of production parent linking or provider sign-in.
- Real provider sign-in, MFA/email delivery and pedagogical accuracy still require their respective live/manual checks; passing the release gate is not a claim of a verified 9/10 product score.
