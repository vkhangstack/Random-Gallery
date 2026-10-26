# Task acceptance and evidence audit

This audit applies the user's stricter completion rule: source code and authored tests alone
are not completion evidence. The original task acceptance criteria remain in tasks.md; this
summarizes the required proof for every task. No physical device or human results are inferred
from code, viewport emulation, or suite discovery.

No on-disk AGENTS.md exists in the workspace or scanned parent directories. The AGENTS.md
instructions supplied in the conversation govern this work. The approved spec, plan, tasks,
constitution, current source, and test suites were read during this audit.

Evidence codes:

- **N**: Executed Node tests, evidence/unit-tests.log.
- **C**: Strict TypeScript check and production build, evidence/typecheck.log and build.log.
- **B**: Browser execution blocked before tests: localhost EPERM and Chromium Mach-port denial.
- **D**: Dependency installation blocked by registry DNS; T002's specific runner is unavailable.
- **M**: Physical hardware, screen reader, or human participants required.

| Task | Acceptance proof required | Status/evidence |
| --- | --- | --- |
| T001 | Requested stack, strict types, lockfile, working build/test scripts, no backend | Verified C/N and manifest inspection |
| T002 | Vitest/jsdom/Testing Library/user-event/fake-indexeddb installed; isolated/reset DOM/database and runner smoke passes | D; not delivered; no substitute claimed complete |
| T003 | Three-engine production-preview runner actually starts at fixed origin | Configuration exists; B prevents startup proof; reopened |
| T004 | Metadata/blob/batch/session types retain all documented constraints | Verified C, types.ts and creation path inspection |
| T005 | Genuine fixtures, duplicate/Unicode names, batch/boundary/workload helpers; supported fixture content | Verified N, fixture inspection and ffmpeg decoding |
| T006 | Real storage contract tests pass for schema, ordering, duplicates, atomic commit/abort, reopen, blocked/read/denied/quota/versionchange failures | Browser source exists; N covers blocked/denied opens; full native transaction proof B/D |
| T007 | Size/signature/MIME/decode-failure checks and temporary URL cleanup tests pass | Verified N, including fallback onload/onerror decoding orchestration |
| T008 | Actual mounted consumers pass replacement/unmount/stale-read/decode-failure/Strict Mode ownership checks | Existing browser ownership cases B; stale-read/Strict Mode component coverage requires D to resolve |
| T009 | Upload UI tests pass for all states, named batch outcomes, commit boundary, picker retry, ordering/remount/interruption | Added native pending-write/interrupted-batch cases; all UI assertions B; exact component runner D |
| T010 | Genuine decoding, 12 mixed uploads, boundaries, duplicates, reload/page/profile restart and clearing pass | Tests authored; profile restart expanded to every engine; B; reopened |
| T011 | Native schema/read/blob/add/close behavior, atomic write boundary and recoverable failures work | Code C; open-failure branches N; native successful transactions B; reopened |
| T012 | Content/size validation plus real browser decoding and all cleanup paths work | Controlled decode/cleanup N; genuine browser decode B; reopened |
| T013 | Mounted image URL consumers load/retry, suppress stale reads, and release only owned URLs | Source C; browser ownership B and component gaps D; reopened |
| T014 | Sequential batch outcomes reflect only committed saves, preserve successes, and refuse overlapping batches | Source C; native pending/interruption cases B; reopened |
| T015 | Multiple-file upload guidance, privacy, accessible progress, per-file recovery and retry work | Source C; runtime picker/announcements B; reopened |
| T016 | Both destinations show correct collection states, names, responsive grid and focus | Source C; runtime state/layout B; reopened |
| T017 | US1 unit/integration/browser checks and genuine persistence evidence all pass | N/C pass; browser/profile evidence B |
| T018 | Deterministic candidate buckets, empty/single/absent current, immutable inputs and 100 selections pass | Verified N; expanded to larger/favorite eligible subsets |
| T019 | Explicit favorite targets, missing ID, metadata-only commit/rollback, duplicate/reopen behavior pass | Source authored; native mutation proof B; reopened |
| T020 | Viewer scopes/status/pending/failure/retry/last favorite/rapid selection/unreadable cases pass | Pending-write cases added; browser assertions B; component runner D |
| T021 | 100 selections in each scope, alternation, aspect ratio, favorite retention and decode recovery pass | Tests authored; runtime proof B; reopened |
| T022 | Pure selector excludes current with alternatives, samples uniformly and handles zero/one | Verified N |
| T023 | Favorite updates and unreadable-ID recovery keep all views consistent after commits/failures | Source C; native/React behavior B; reopened |
| T024 | Shared viewer and Random UI reconcile all scopes/states, rapid actions and aspect ratios | Source C; browser assertions B; reopened |
| T025 | US2 checks plus US1 regressions pass with persistence/resource evidence | N/C pass; B |
| T026 | Search/favorite intersection, whitespace/case/Unicode, stable records/order and no mutation pass | Verified N |
| T027 | Atomic delete/rollback and persistent absence with duplicate independence pass | Source authored; native storage proof B; reopened |
| T028 | Gallery contracts pass including filtering an open preview, pending/error/retry deletion and surviving focus | Added focus-fallback regression and native pending mutations; assertions B; exact component runner D |
| T029 | Gallery browse/filter/favorite/delete/cancel/failure/keyboard/focus/retention pass | Source authored; B; reopened |
| T030 | Pure filtering meets documented name/favorites/intersection/order rules | Verified N |
| T031 | Persistent atomic deletion updates collection only after commit and retains data on failure | Source C; native mutation B; reopened |
| T032 | Gallery search/filter/preview/favorites/resource lifetimes work consistently | Source C; runtime UI assertions B; reopened |
| T033 | Named permanent confirmation, Cancel/Escape/pending/retry, successful viewer/focus reconciliation work | Source C; native-dialog behavior B; reopened |
| T034 | US3 and preceding suites pass with deletion/focus/persistence evidence | N/C pass; B |
| T035 | System/invalid/explicit themes, read/write failures, accessible labels/states and live feedback pass | Added invalid/system-change/read-error/loading cases; browser assertions B; component runner D |
| T036 | Keyboard-only upload/shuffle/favorite/search/preview/cancel/delete and responsive portrait/landscape states pass in both themes | Added whole-journey and landscape cases; browser assertions B |
| T037 | Guarded theme storage and session fallback work and collection never enters localStorage | Source C; runtime theme/privacy assertions B; reopened |
| T038 | All screens, long names/errors, contained images, contrast and focus work at specified widths/themes | Token contrast evidence exists; rendered layout/contrast B/M; reopened |
| T039 | Every control and dialog supports focus order/containment/recovery and accessible state/error announcements | Missing-trigger focus bug fixed with regression source; runtime audit B/M |
| T040 | Browser checks plus physical mobile pickers/screen-reader/keyboard/contrast evidence recorded | B/M |
| T041 | Collection operations make no external data requests and injected storage failures preserve data | Tests authored; actual request/storage evidence B; reopened |
| T042 | 100-image timing scenario enforces feedback <=1s and p95 visible results <=1s | Missing feedback assertion fixed using in-page timing; execution B; reopened |
| T043 | Required phone/laptop physical-device timing samples meet SC-005 | M; no hardware/timing evidence |
| T044 | Five actual first-time users meet completion/privacy-discovery thresholds | M; no participants/results |
| T045 | Quickstart accurately documents runnable scripts, fixtures, limitations and executed vs pending checks | Verified document/manifest/link review; refreshed for current audit |
| T046 | All requested checks pass, runtime privacy/cleanup reviewed, final evidence and manual gates recorded | N/C pass; full B/D/M acceptance remains open |

## Previously completed tasks reopened

T003, T010–T016, T019, T021, T023–T024, T027, T029, T031–T033, T037–T038,
T041–T042 were checked without executed acceptance evidence. They are now unchecked. No source,
assertion, test case, or product requirement was removed to obtain the lower verified count.

## Specific external dependencies

1. Allow localhost process listeners and native browser launch in a rerun environment. The session
   rejected an escalated npm run test:e2e request because sandbox_approval is false; no approval
   prompt can be presented by the available tool under that policy.
2. Allow npm/browser-download DNS or supply the missing packages/browser binaries. T002's exact
   tooling and mounted component tests remain blocked; native browser integration sources provide
   additional coverage but do not replace that requirement.
3. Supply physical devices/screen-reader participation and five first-time users for manual gates.

See manual-checks.md for the smallest user actions and validation.md for current run counts.
