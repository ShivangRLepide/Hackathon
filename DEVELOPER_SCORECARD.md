# Developer scorecard: MiniDSP Data Discovery

Generated on the human's request after the final milestone. Sources: the application source, Git history, [WORK_LOG.md](WORK_LOG.md), test evidence and the conversation. Items that are not verified earn no objective credit and are listed for facilitator review.

## Summary

| Category | Score | Max |
|---|---:|---:|
| Functionality | 20 | 30 |
| Testing and reliability | 18 | 25 |
| AI orchestration | 13 | 20 |
| Lepide design compliance | 6 | 10 |
| Git and deployment | 5 | 10 |
| Learning and demonstration | 2 | 5 |
| **Total** | **64** | **100** |

## Git timeline (from git log, author-date +05:30)

| Time (+05:30) | Commit | Subject |
|---|---|---|
| 2026-10-21 11:09:28 | ede50e1 | Initial commit (GitHub repository, not developer work) |
| 2026-10-21 12:16:32 | 9e67aa9 | Phase 1 detection, Next.js scaffold and test tooling |
| 2026-10-21 12:16:40 | 0706e0a | Merge origin/main (GitHub initial commit); README conflict resolved |
| 2026-10-21 12:34:55 | edb2682 | Add scan schema migration with RLS and log RLS verification |
| 2026-10-21 13:10:19 | 221f7ba | Add sign-in page, Supabase browser client, upload shell and static Lepidus styles |
| 2026-10-21 13:36:02 | 30b402b | Save scan results to Supabase via save_scan RPC; add upload validation and tests |
| 2026-10-21 13:55:50 | b0f09fa | Add dashboard, findings filters, CSV export and tests |
| 2026-10-21 14:09:01 | 2f72725 | Match UI to reference: sidebar shell, breadcrumbs, dashboard share bars, upload heading |
| 2026-10-21 14:22:05 | b0c1f5e | Fill viewport with signed-in page column; fix rail width |
| 2026-10-21 14:41:47 | aad1820 | Match upload page to reference: copy, file picker, submit button |
| 2026-10-21 14:59:50 | 1808eeb | Add dashboard assistant that answers from live scan data |
| 2026-10-21 15:03:14 | fafad4c | Add close button to dashboard assistant panel |
| 2026-10-21 15:08:54 | 0d6c2ee | Restyle dashboard assistant as a chat window |
| 2026-10-21 15:20:19 | 98fcfcf | Restyle sign-in page to the Lepide layout |
| 2026-10-21 15:57:53 | 2d279c6 | Add full login and signup flow |

The first developer commit (9e67aa9) to the last (2d279c6) spans 3 h 41 min 21 s by Git timestamps. The start of the challenge is not recorded in Git, so no challenge-minute total is claimed.

## Category evidence

### Functionality (20 / 30)

Built and covered by tests:
- Detection for email, UK phone, NINO and Luhn-checked card, with masking and risk classification: 44 original tests plus 5 characterisation tests, from the 06:09 and review-fix rows in [WORK_LOG.md](WORK_LOG.md).
- Server-side upload validation (empty, over 1 MiB, unsupported type, NUL byte, invalid UTF-8) in [src/lib/upload/validate.ts](src/lib/upload/validate.ts), with 8 unit cases.
- Auth-gated scan route, returning masked results only, in [src/app/api/scan/route.ts](src/app/api/scan/route.ts).
- Save through the `save_scan` RPC, with 4 API cases in [tests/api/scan.test.ts](tests/api/scan.test.ts).
- Dashboard, findings filters, and CSV export with formula neutralisation, covered by the reports, csv and export tests.
- Login and sign-up pages, covered by UI tests. The human verified sign-in in a browser (08:00 row); the agent did not sign in.
- The dashboard assistant in [src/lib/assistant/answer.ts](src/lib/assistant/answer.ts) is rule-based and calls no external service.

Coverage of the core requirements:
- Detection and classification: covered by fixture and unit tests.
- Invalid uploads rejected: covered by validation tests.
- Two-user RLS isolation: human-run API check, 18/18 (07:03 row). The script was deleted and is not in the repository.
- Atomic save: relies on the RPC. No test in the repository checks rollback after a failed finding write.
- Totals and masked export: covered by unit tests.
- Deployed login, upload, findings and export: NOT verified.

Deductions: the live end-to-end path is unverified, and the detection policy questions (DECISION PENDING 1 to 3 in [WORK_LOG.md](WORK_LOG.md)) have no recorded human decision.

### Testing and reliability (18 / 25)

Test runs from this session, on the tree that became commit 2d279c6:

| Command | Result | Exit code |
|---|---|---|
| `npm run typecheck` | passed | 0 |
| `npm run test:unit` | 85 passed, 0 failed | 0 |
| `npm run test:ui` | 7 files, 40 tests passed | 0 |
| `npm run build` | passed; routes /, /dashboard, /findings, /upload, /signup, /api/scan, /api/export | 0 |
| `npm run test:e2e` | 1 passed (heading smoke test only) | 0 |

Failures were recorded and fixed: the first ambiguous-case test run failed because count constants were unset; a stale heading reference; a Chromium download ECONNRESET (retry succeeded); a cold dev-server timeout on the first e2e run; a MODULE_TYPELESS_PACKAGE_JSON warning; and STATIC_BUILD_NO_OUT_DIR on Vercel.

Deductions: there is one end-to-end test, a smoke test of the heading. No test runs a real signed-in session. The characterisation counts pin current behaviour, not correct behaviour. The RLS check is not reproducible from the repository.

### AI orchestration (13 / 20)

Evidence of good orchestration:
- Scope was stated for each milestone, and migrations, installs, commits, pushes and deployments waited for human approval (for example the 07:03 and 08:23 rows).
- Unverified items are labelled "NOT verified" in most rows.
- Failures and retests are kept in the work log.
- Decisions the agent could not make are listed as DECISION PENDING.

Gaps:
- No work-log row exists for six commits: b0c1f5e, aad1820, 1808eeb, fafad4c, 0d6c2ee and 98fcfcf.
- Several rows say "UTC time not recorded" instead of recording a timestamp.
- [LEARNINGS.md](LEARNINGS.md) has only the Detection and Testing entries. The Security, UI and "what I'd do differently" sections are empty.

### Lepide design compliance (6 / 10)

Evidence:
- The UI uses documented `lp-` classes and tokens. The sign-in restyle was confirmed by the human to match the reference image.
- The sidebar, breadcrumb and share-bar patterns follow [design.md](design.md).
- Sign-up reuses the same shell and password field.

Gaps:
- lepidus.js is not loaded, so the dropdown and tab components are replaced by toggle buttons.
- No browser check of the dashboard, findings or upload screens against the reference is recorded as verified.
- The design-system class names were checked by reading [design.md](design.md), not by a validator.

### Git and deployment (5 / 10)

Evidence:
- The repository is on `main` with 14 commits on top of the GitHub initial commit (including merge 0706e0a), and was clean before this scorecard was created. The remote is `https://github.com/ShivangRLepide/Hackathon.git`.
- A search of tracked files for `sb_secret_`, `service_role`, `sb_publishable_` values and JWT-shaped strings found no matches (exit code 1). `.env.local` is gitignored.
- The live Vercel URL was confirmed to serve the scaffold page only, on the edb2682 deploy (07:19 row).

Gaps:
- The first Vercel build failed (STATIC_BUILD_NO_OUT_DIR). The settings change was not recorded.
- No deployment of any commit after edb2682 is recorded.
- `next-env.d.ts` is tracked in Git, which conflicts with the WORK_LOG note that it stays uncommitted by design.

### Learning and demonstration (2 / 5)

Evidence: the work log records failures and decisions. [LEARNINGS.md](LEARNINGS.md) records two lessons: a Luhn pass is not evidence of a card (about 10% of random 13 to 19 digit strings pass), and the Node module-type warning was cleared by setting "type": "module".

Gaps: no demo run or demo evidence is recorded. The Planning, Security/persistence, UI and "What I'd do differently" sections of LEARNINGS.md are empty.

## Three strengths

1. Security-first design: server-side validation, masked-only results, owner-scoped RLS checked with two users, and a rule-based assistant that does not call an external AI service.
2. Honest reporting: most rows separate verified from NOT verified items, and failures are kept in the log.
3. Test coverage of the detection core: fixtures, unit tests and characterisation tests, all passing in this session's runs.

## Three improvements

1. Deploy the current HEAD and verify the live login, upload, findings and export path, with results recorded in the work log.
2. Complete the work log for every commit and fill in LEARNINGS.md, including the missing rows for six commits.
3. Record human decisions for DECISION PENDING 1 to 3 and the NINO rules, rotate the password that was posted in chat, and add an automated test for failed atomic saves.

## Unverified items (facilitator review)

- Live deployed end-to-end path on the current HEAD (login, upload, findings, export).
- Live sign-up. Sign-ups are disabled in the project, and the human must enable them. Sign-in was verified by the human (08:00 row); the agent did not sign in.
- Confirmation email delivery. The work log says the Supabase Site URL must be the deployed URL; this is not verified.
- The 18/18 RLS checker run. Human-reported, the script is not in the repository, and the two test accounts remain in Supabase Auth.
- The `save_scan` migration: the human confirmed it was applied, but no check output was provided.
- A live save by a signed-in user.
- Visual match of the dashboard, findings and upload screens to the reference image in a browser.
- Human decisions on DECISION PENDING 1 to 3 in the work log: card detection is Luhn-only with no context or issuer rules; a NINO without a suffix is classified High; an 11-digit number starting 01, 02 or 03 with no phone context is classified Medium. The NINO prefix and suffix rules follow public HMRC guidance and need human confirmation.
- Rotation of the password that was posted in chat. The work log says to treat it as exposed; no rotation is recorded.
- Which commit is currently deployed on Vercel, and the settings change that fixed the first failed build.
- The demo at the end of the challenge: no record exists.
- `next-env.d.ts` is tracked in Git. Review whether it should be removed from the index.
