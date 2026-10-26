# Current Validation: User Cloud Sync

Date: 2026-10-26 (Asia/Ho_Chi_Minh); detailed execution timestamps are retained in the reports. **Go backend and dedicated auth pages implemented; all 45 current account browser cases passed. The broader guest regression suite is not fully green: five focus failures remain.**


## Final executed results

| Check | Actual result | Evidence |
| --- | --- | --- |
| Frontend typecheck + production build | Exit 0 | final host run and final-compose.log |
| Frontend units | 19 passed, 0 failed, 0 skipped | final host run |
| Go vet + production CGO-disabled build | Exit 0 | final Go command |
| Go race tests and architecture check | 14 passed, 0 failed | [go-final.json](evidence/go-final.json) |
| Account Chromium 153.0.8010.12 | 15 passed, 0 failed/skipped/flaky | [report](evidence/accounts-chromium.json) |
| Account Firefox 155.0 | 15 passed, 0 failed/skipped/flaky | [report](evidence/accounts-firefox.json) |
| Account WebKit 26.6 | 15 passed, 0 failed/skipped/flaky | [report](evidence/accounts-webkit.json) |
| Docker API/nginx and persistent-volume validation | 5 groups passed, 0 failed | [persistence.json](evidence/persistence.json), [log](evidence/persistence.log) |
| Existing guest full suite (initial final run) | 149 passed, 9 failed, 1 skipped; exit 1 | [report](evidence/guest-browser.json) |
| Guest fixture/serialization corrections, targeted rerun | 9 passed, 0 failed/skipped; exit 0 | [report](evidence/guest-harness-rerun.json) |

The targeted rerun verifies the original 100-image × 2 MiB performance workload using file paths
instead of exceeding Playwright's 50 MiB in-memory payload limit, and decode-error URL cleanup using
ArrayBuffer-corrupt data. It resolves four failures from the initial full run without lowering timing
or correctness assertions. It is a separate execution, not a new all-passing full-suite report.

Five focus failures remain from the full guest run: primary keyboard journey in both themes in
Chromium and WebKit (four cases), plus filtered-trigger preview return focus in WebKit (one case).
The two Chromium failures were previously executed and recorded before feature 004. The three
WebKit focus failures are newly observed on this runner; no historical pass/fail claim is made for
them. ImageViewer focus behavior was not changed in this feature, consistent with the plan's scope.
The only skipped case seeds a legacy Blob record in WebKit, where this runner cannot write that
record representation; actual WebKit guest persistence and all account cases executed successfully.
No failed/skipped/unexecuted case is counted as passed.

All seven feature-004 outcomes have executed evidence in the account suite and Go API checks,
including dedicated auth URLs, account isolation, original image sync, commit/failure semantics,
identity cancellation and guest preservation. The broader feature-001/002 focus acceptance remains
open; completing task execution/reporting here does not complete those earlier features.

The normal deployment remains on http://127.0.0.1:8081 with a non-root Go API and nginx. Public
hosting, domain/TLS provisioning, physical-device and assistive checks were not executed or claimed.
The normal private volume was preserved; all disposable test stacks/restore archives were cleaned.

Current summary: [final-summary.json](evidence/final-summary.json).

## Historical executed checks (before Go requirement)

| Command | Actual result |
| --- | --- |
| `npm install sharp` | Initial sandbox DNS failure; approved retry succeeded, updated manifest/lockfile |
| `npm run typecheck` | Exit 0 after the initial account/storage draft |
| `npm test` | Exit 0: 19 passed, 0 failed, 0 skipped |
| `node --test server/app.test.mjs` (sandboxed) | Exit 1: 1 passed, 5 failed before HTTP assertions because localhost bind was denied |
| Same backend test command (approved) | Exit 0: 6 passed, 0 failed, 0 skipped |

The six approved API tests executed real HTTP/SQLite checks for registration/login, password/session digests, expiry/logout, ownership, all three formats and original bytes, favorite/delete commits, duplicate IDs, rejected database writes, malformed uploads, origin checks, throttling, and on-disk reopening. The persistence test reopens a real database; it is not a container replacement test. The current backend tests do not prove browser state transitions or session changes during a slow request.

The results above concern the superseded Node draft and existing frontend only. They do not count as Go API, architecture or concurrency validation. Host toolchain discovery reports Go 1.26.4; no Go module/build/test was executed by the planning revision.

## Earlier planning snapshot: checks not executed at that time

- Go implementation, module resolution, domain/application/adapter tests, HTTP contract tests, `go test -race`, `go vet`, dependency-direction checks or CGO-disabled binary build.
- Production frontend build after backend/account changes.
- Compose image builds/startup, nginx/API proxy, volume recreation or backup/restore.
- Account browser journeys, isolated second-browser sync, cross-tab changes, guest preservation, delayed account-switch responses, and browser failure injection.
- Complete guest browser regression suite after adding session requests.
- Public hosting, TLS, physical devices, or account tests in any browser engine.

The preceding features' test/deployment results do not establish these outcomes.

## Earlier implementation work list (subsequently implemented)

- Replace the superseded Node API with the Go domain, application ports/use cases and HTTP/SQLite/crypto/image adapters; enforce transactional session checks under concurrent writes.
- Switch the API Dockerfile and project verification scripts, then remove only superseded Node sources/tests and sharp after Go parity checks.
- Cancel pending account upload batches and scoped requests on identity change.
- Cross-tab authentication notifications and session rechecks on tab return, with account content hidden while rechecking.
- Surface failed initial session lookup distinctly from confirmed guest/empty-account state.
- Add and execute the browser/deployment checks mapped in plan.md.
- Finish operator documentation integration and ensure normal project verification includes backend checks.

The plan skill's Phase 0 review was read-only. It does not mark any missing behavior implemented. No feature completion claim is made.

## Go design and task revision checks (pre-implementation snapshot)

Updated feature 004 in place after the explicit Go/hexagonal instruction. Spec, plan,
research, data mapping, HTTP contract and quickstart now describe the Go replacement;
the Node draft and its historical test record remain intact until verified replacement.
Generated tasks.md with 42 unchecked, sequential tasks: 16 shared, 8 US1, 9 US2 and 9 US3;
8 are marked parallel with explicit prerequisites. A document validator confirmed task
format, IDs, story labels, path references and resolving local Markdown links. All 16
specification-quality review items remain checked. These are document checks, not Go tests.
Parsed extension configuration has no before/after specify, plan or tasks hooks registered.

## Implementation run started

Requirements gate: 16/16 checked (read-only). No implementation hooks registered. Existing Node/React drafts and all historical evidence preserved. Go 1.26.4 is installed; initial module download was sandbox DNS-blocked, and command-specific approval was requested.

### Foundation gate completed

Go dependency resolution succeeded after approval. `go test ./...` passed four foundational tests (decoder, password, SQLite rollback/reopen/ownership, architecture); `go vet ./...` and CGO-disabled production build exited 0. The sandboxed Go run could not access standard-library sources; the approved run succeeded. Both Docker images built and Compose started successfully. API and frontend report healthy, and the nginx-proxied `/api/health` returned 200 `{ "ok": true }` at 8081. API port remains internal. T001–T010 completed; no account acceptance claimed at this checkpoint.

### Account access gate

The new auth use-case test initially failed because Go auth methods were not implemented; the session-error Chromium regression failed before its fix (auth-baseline.json). Implemented auth/session/throttling, HTTP-only cookies, exact origin checks, session restore/errors and cross-tab notifications. The subsequent Go suite passed including auth HTTP tests; Chromium auth suite passed 3/3, zero skipped/flaky (auth-browser.json). Typecheck exited 0. Firefox download was attempted with approval but all CDN requests timed out; no Firefox pass is claimed.

### Dedicated routes and cloud collection gate

User-confirmed routing refinement: /sign-in and /sign-up are separate pages with home links, no home auth form, no auth-page gallery, and success/signed-in redirects home. Chromium passed all 7 current auth/cloud cases (routes-browser.json). These include direct route/reload checks, original fixture bytes and decoded images in an isolated second browser, failed refresh, failed upload/retry, and refresh after an upload committed but its response was lost. Go upload test initially failed with 404 before image endpoints; subsequent upload/read/validation and session-revocation-during-validation tests passed. WebKit downloaded successfully after retries; no WebKit tests executed at this checkpoint. T019–T027 and reopened routing tasks complete for the executed Chromium gate.

### Private mutation and lifecycle checks

Go race-detector suite passed 14 tests, zero failed (go-race.json): includes real SQLite read-only write failures and rollback, concurrent logout ordered against a protected write, revocation during validation, owner denial and cookie/session contracts. The new mutation tests failed before their endpoints/use cases existed, then passed after implementation. The isolated Chromium account suite passed 13/13, zero skipped/flaky, using a disposable Compose project. It covers separate auth URLs, sync, original bytes, failed mutations, guest preservation, batch cancellation, object-URL cleanup, expired session and a late private content read. Each test project has fresh throttling state; the normal deployment/volume was preserved. WebKit and final regression/restore checks remain pending here.

### WebKit failure investigation and verified correction

Initial WebKit account run: 11 passed, 2 failed; retained as accounts-webkit-initial.json. Diagnostic isolated databases showed Blob, revoked-Blob and fresh-Blob writes aborting while ArrayBuffer committed. Copying file-backed data into another Blob did not solve it and was reverted. Guest storage now writes ArrayBuffer bytes with MIME type using the same v1 stores/key paths, and reads legacy Blob records. Separately, WebKit route interception supplied a zero-byte multipart file, so the lost-response test reconstructs the same metadata/fixture bytes before deliberately dropping the response. This does not waive actual browser upload tests. Both reproduced WebKit failures subsequently passed (2/2). A legacy-Blob reader regression is included for Chromium/Firefox; WebKit explicitly skips only the unsupported legacy-record seeding case, with its actual ArrayBuffer persistence checked in account and integration tests.

User explicitly requested removal of app.mjs: server/app.mjs and its orphaned Node test were deleted after Go/Chromium parity; Docker already ran Go.

Final read-only deployment inspection: API and nginx both healthy; API runs as `gallery`; proxied `/api/health` returned 200. API image: `sha256:e9046811200d89e591d46ed798d605adcb7b11cda64754c5ae081a111d5e459c` (see final-summary.json for the exact inspected digest). No post-implementation hooks registered.

## Follow-up: signed-in upload focus reset

The file-picker focus/session revalidation race was reproduced and fixed after the initial feature delivery. Current account suite: 45 passed, zero failed/skipped/flaky (15 per engine), with explicit checks for one backend upload, no signed-in guest IndexedDB writes, a separate browser reading the image, and safe handling of session lookup errors. The normal frontend was rebuilt; API/account volume preserved. Details: [bug fix](../../.specify/bugs/signed-in-upload-focus-reset/fix.md). Earlier full guest regression counts remain historical; that suite was not rerun for this focused frontend fix.
