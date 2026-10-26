# Tasks: User Authentication and Private Image Sync — Go/Hexagonal Backend

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md).

**Prerequisites**: Self-hosted option B and Go with hexagonal architecture are explicit user requirements. This list replaces the unfinished Node-oriented task-generation work; it does not create a new feature.

**Tests**: Required by the spec's independent tests, SC-001–SC-006 and the approved design's acceptance gates. Add missing regression assertions before implementing the corresponding fixes. The existing 19 frontend unit passes and 6 Node API passes are historical; they do not satisfy Go tasks.

**Organization**: Tasks are grouped by user story. Tasks were generated unchecked because existing drafts needed review, replacement or acceptance verification; execution status is now recorded below. Reuse compatible frontend work; do not rewrite working guest storage or mark drafts complete solely because files exist.

## Format and Path Conventions

Each checklist line uses `Tnnn`, optional `[P]`, and a required `[USn]` label inside story phases. Paths are repository-relative. `[P]` means file-independent work after the prerequisites named below, not permission to ignore dependencies or run multiple suites against one shared port/database. `server/` is the Go module; `tests/account/` is a new browser suite isolated from the existing guest test globs.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preserve baseline evidence and initialize Go tooling without deleting draft or private data.

- [X] T001 Reconcile the Go revision against existing drafts and recorded results in specs/004-user-cloud-sync/validation.md; inventory server/app.mjs, server/app.test.mjs, server/Dockerfile, package.json and compose.yaml, record Go/Node/Docker/browser availability, and identify superseded files without deleting data or claiming old tests validate Go.
- [X] T002 Initialize server/go.mod and server/go.sum for Go 1.26 with pinned compatible modernc.org/sqlite, golang.org/x/crypto and golang.org/x/image versions; create server/cmd/api/ and server/internal/{domain,application,adapters}/ using the exact package boundaries in specs/004-user-cloud-sync/plan.md and verify module resolution.
- [X] T003 [P] Add playwright.accounts.config.ts and tests/account/helpers.ts for the Compose origin http://127.0.0.1:8081, isolated browser contexts, unique account emails, test-owned fixtures and retained failure traces; select tests/account/ only, keep playwright.config.ts guest production-preview behavior separate, and avoid a second webServer or production debug endpoints.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish real ports/adapters and a runnable Go service. Complete setup before foundation; complete this phase before story implementation.

- [X] T004 Define domain account/image/session value shapes and typed errors in server/internal/domain/{account,image,errors}.go, then application-owned repository, password, image-validation and transactional unit-of-work interfaces in server/internal/application/ports.go; expose only use-case-required methods, context.Context and domain values, never HTTP/SQL/adapter-specific types.
- [X] T005 Implement schema initialization, owner-scoped repository primitives and transaction-bound repositories in server/internal/adapters/sqlite/{store,schema,transaction}.go with real temporary-database tests in server/internal/adapters/sqlite/store_test.go; enable WAL/foreign keys, one connection, context-aware parameterized SQL, atomic final session-check/write callbacks and atomic throttle counters; preserve existing column encodings and test reopen/rollback without destructive schema replacement.
- [X] T006 [P] Implement and test the password port in server/internal/adapters/password/{scrypt,scrypt_test}.go using scrypt N=32768, r=8, p=3, a random salt and timing-safe verification; bound concurrent derivations to four and return a typed retryable overload error, with no plaintext/password verifier logging.
- [X] T007 Implement shared HTTP routing/error handling/Origin checks and database-aware health in server/internal/adapters/httpapi/{router,middleware}.go, and configuration/wiring/graceful shutdown in server/cmd/api/main.go; default PORT=3000, DATA_DIR=./data and APP_ORIGIN=http://127.0.0.1:8081, bound body/deadline handling, propagate contexts and return generic JSON errors without SQL or secrets.
- [X] T008 Replace the API build in server/Dockerfile with a golang:1.26-alpine builder and non-root CGO-disabled binary runtime, and align compose.yaml, nginx.conf and vite.config.ts with API health, internal-only port 3000, overwritten X-Real-IP and the existing gallery-data volume; keep nginx on loopback 8081 and preserve the earlier standalone deployment and guest mode.
- [X] T009 [P] Review and complete the five-operation storage contract/default guest context in src/storage/collection.tsx without changing src/storage/images.ts or its IndexedDB version; retain interfaces compatible with account-scoped cancellation and existing collection/image hooks.
- [X] T010 Add an import-direction check in server/internal/architecture/dependencies_test.go and execute foundational Go tests/vet/build from server/; domain/application must not import adapters, net/http, database/sql or driver types, handlers must call use cases rather than SQL, and server/cmd/api/main.go must only compose dependencies; record actual results in specs/004-user-cloud-sync/validation.md.

**Checkpoint**: Go health service runs through nginx, dependencies point inward, persistent schema and adapter foundations work, and guest mode remains available. Health alone is not authentication or cloud-sync acceptance.

## Phase 3: US1 — Access a Private Account (Priority: P1; Account MVP)

**Goal**: Register, sign in, restore a session, and sign out without exposing another identity's view.

**Independent Test**: Create two accounts through the real API/browser form, test invalid credentials, reload a signed-in session, and sign out. Change authentication in a second tab and return to a hidden tab; old account content must hide while identity is rechecked. This increment can be validated without uploading images; it is not the full cloud-image feature.

### Tests First

- [X] T011 [US1] Port and extend auth assertions from server/app.test.mjs into server/internal/application/auth_test.go and server/internal/adapters/httpapi/auth_test.go using port fakes plus real SQLite/httptest as appropriate; cover duplicate registration, normalized email, password boundaries, fresh/hashed sessions, expiry, revocation, cookie flags under HTTP/HTTPS, wrong/absent Origin, throttling and failed-session-lookup errors; do not treat Node test passes as Go results.
- [X] T012 [P] [US1] Add browser regressions in tests/account/auth.spec.ts for separate /sign-in and /sign-up pages, direct navigation/reload, home links with no home form, no gallery on auth pages, success/signed-in redirects and registration/login/logout forms, invalid login, reload restore, failed initial lookup, delayed session responses, matching-account 401 handling, cross-tab auth notifications and revalidation on tab return; reproduce currently missing error/cross-tab behavior before fixing it.

### Implementation

- [X] T013 [US1] Implement register/login use cases in server/internal/application/auth.go using account/password ports and constraints from data-model.md: user id is "server-generated UUID, primary key; immutable ownership identity", email is "trimmed/lowercased, valid address syntax, maximum 254 characters, unique", salt is "random 16-byte salt represented as hex", password is "64-byte scrypt-derived key; never returned to clients", and "Submitted passwords are 12–128 characters"; commit account and initial session atomically.
- [X] T014 [US1] Implement session and throttle use cases in server/internal/application/auth.go and transaction support in server/internal/adapters/sqlite/auth.go: token is "SHA-256 digest of a random 32-byte bearer token, primary key", user_id is "foreign key to users.id", expires is "absolute server timestamp in milliseconds; seven days after creation"; throttle key is "server-generated email or client-IP throttle key, primary key", count is "number of accepted attempts to process within the fixed window", expires is "window expiration time; expired entries are removed", and "Refuse more than 30 attempts per key per 15-minute window before expensive password derivation"; revoke current sessions and never derive owner identity from client input.
- [X] T015 [US1] Implement GET /api/auth/session and POST /api/auth/{register,login,logout} in server/internal/adapters/httpapi/auth.go, wire use cases in server/cmd/api/main.go, enforce the 8192-byte JSON bound and contracted status/error shapes, and set "HttpOnly, SameSite=Strict, host-scoped cookie, Secure under HTTPS" with Path=/ and Max-Age=604800; distinguish a failed lookup from a confirmed null session.
- [X] T016 [US1] Complete session restore, home links to dedicated /sign-in and /sign-up pages, pending/errors, successful-revocation-only sign-out and identity-keyed gallery remounting in src/components/Account.tsx; implement accessible email/password forms and page navigation in src/components/AuthPage.tsx without rendering the gallery on auth pages, redirect successful auth/signed-in auth visits to home; wire src/main.tsx and scoped src/styles.css using the existing design and keep passwords/tokens out of browser storage.
- [X] T017 [US1] Implement auth-change notifications and visibility/focus rechecks in src/components/Account.tsx, including listener cleanup and stale-generation protection; broadcast only an auth-changed signal, hide private content during identity rechecks, show lookup failures explicitly, and ensure a late old-account 401 cannot clear a newer account.
- [X] T018 [US1] Execute US1 Go tests and tests/account/auth.spec.ts via playwright.accounts.config.ts, with real Compose API and supported installed browser engines; save reports, browser versions, cookie observations and passed/failed/skipped/not-run counts under specs/004-user-cloud-sync/evidence/ and update specs/004-user-cloud-sync/validation.md; request command-specific escalation if localhost/browser sandboxing blocks execution.

**Checkpoint**: SC-001's auth journey is proven; cross-tab/session behaviors work. Do not release cloud-image behavior before its own ownership and lifecycle gates.

## Phase 4: US2 — Save and Retrieve a Cloud Collection (Priority: P1)

**Goal**: Upload private account images and retrieve the same confirmed originals in another browser.

**Independent Test**: Upload JPEG, PNG and WebP in context A; sign in as the same user in isolated context B, refresh and compare image names/order/favorites and original bytes. Reject invalid uploads and failed writes without a saved confirmation. No favorite/delete journey is needed to prove this increment.

### Tests First

- [X] T019 [US2] Add upload/list/read and rollback tests in server/internal/application/collection_test.go and server/internal/adapters/httpapi/images_test.go for owner scoping, all formats, original bytes, ordering ties, corrupt/truncated/unsupported/empty/oversized content, fractional/out-of-range metadata, duplicate IDs, wrong expected-account header, revoked sessions before commit, cancelled contexts and real rejected SQLite writes.
- [X] T020 [P] [US2] Add tests/account/cloud-sync.spec.ts using two isolated contexts and all three tests/fixtures images; assert remote saved state only after response confirmation, second-browser retrieval and deterministic ordering, explicit refresh/reload, failed refresh vs empty success, upload failure/retry and refresh-before-retry after an ambiguous committed upload response.

### Implementation

- [X] T021 [US2] Implement image validation rules in server/internal/domain/image.go and application validation in server/internal/application/collection.go: id is "client-generated UUID; composite primary key with user_id", owner is "always supplied by authenticated server logic", name is "nonempty original display name, at most 1024 characters; never a filesystem path", mimeType is "derived from decoded bytes; JPEG, PNG, or WebP only", size is "actual content bytes; 1 byte–10 MiB", addedAt is "nonnegative safe-integer timestamp", batchId is "UUID for stable upload ordering", ordinal is "nonnegative safe integer within a batch", and favorite is "boolean; updated only on successful commit"; reject fractional metadata integers or values above JavaScript's maximum safe integer and preserve original content privately.
- [X] T022 [US2] Implement the decoder port and fixture/boundary tests in server/internal/adapters/imagevalidation/{decode,decode_test}.go with JPEG/PNG and golang.org/x/image/webp, checking DecodeConfig dimensions with overflow-safe multiplication before full decoding within the "40-million-pixel bound"; derive MIME from verified bytes, reject broken images and bound upload buffering/decoding to two concurrent requests with context-aware admission and retryable 429.
- [X] T023 [US2] Implement owner-scoped upload/list/content use cases in server/internal/application/collection.go and SQLite image repositories in server/internal/adapters/sqlite/images.go; store metadata and original BLOB atomically, validate the live session and expected owner inside the write transaction, refuse duplicate (user_id,id) with 409, and sort by "descending addedAt, then batchId, ordinal and ID to make ties deterministic" without leaking another account's rows.
- [X] T024 [US2] Implement GET/POST /api/images and GET /api/images/:id/content in server/internal/adapters/httpapi/images.go, wire the image-validator port in server/cmd/api/main.go, bound multipart bodies to 10 MiB plus 64 KiB overhead, enforce actual per-image limits, return private/no-store plus verified MIME/nosniff for original bytes, and map invalid/session/not-owned/overload failures per specs/004-user-cloud-sync/contracts/http-api.md.
- [X] T025 [US2] Complete src/storage/cloud.ts and src/storage/collection.tsx so each account storage instance sends same-origin credentials and X-Gallery-Account, owns cancellable requests without breaking React StrictMode, maps API errors, never writes account blobs into guest IndexedDB, and discards results after its account lifetime ends.
- [X] T026 [US2] Update src/hooks/useCollection.ts and src/hooks/useImageUrl.ts to stop remaining batch work and suppress late loads/mutations/outcomes after unmount or identity change, preserve pending and last-confirmed semantics, revoke all owned preview URLs, and avoid continuing an old batch against a new cookie; retain current guest save behavior.
- [X] T027 [US2] Finish account/local storage labels, explicit collection refresh and uncertain-upload retry guidance in src/App.tsx and src/components/Uploader.tsx as needed, then execute T019/T020 against the Go API and record three-format, original-byte, second-browser and failure results in specs/004-user-cloud-sync/validation.md with raw evidence under specs/004-user-cloud-sync/evidence/.

**Checkpoint**: SC-002 and upload/connectivity parts of SC-004 pass using the Go service and independent browser contexts; account image bytes are never public. Account access plus this story is the first useful cloud-storage increment.

## Phase 5: US3 — Keep Changes Consistent and Private (Priority: P2)

**Goal**: Sync confirmed favorites/deletions, deny all cross-account operations, preserve guests, and protect identity transitions during pending work.

**Independent Test**: Change favorites/delete in A and refresh B. Attempt owner-A resources anonymously and as account B. Hold uploads/reads/mutations across logout/account switching, and confirm no stale data or continuation request. A guest image survives sign-in/sign-out with zero automatic uploads.

### Tests First

- [X] T028 [US3] Add concurrent favorite/delete/session-revocation and cross-owner contract regressions in server/internal/application/collection_test.go, server/internal/adapters/sqlite/store_test.go and server/internal/adapters/httpapi/images_test.go; prove authorization+write atomicity against concurrent logout, transaction rollback, last-committed favorite behavior, malformed favorite rejection and refusal of unsupported replacement without modifying owner data.
- [X] T029 [P] [US3] Add tests/account/privacy-lifecycle.spec.ts for delayed upload/list/content/favorite responses across logout and A-to-B changes, no remaining old batch uploads, old object-URL revocation, stale 401 suppression, cross-tab changes/tab return, session expiry during mutation and injected upload/favorite/delete failures; assert no old names/previews/saved outcomes in the new account and no false commit indication.
- [X] T030 [P] [US3] Add tests/account/guest-preservation.spec.ts and narrowly adjust tests/e2e/privacy-storage-failures.spec.ts to allow the explicit session probe while prohibiting guest image uploads; seed an existing guest IndexedDB v1 image, sign in/out, assert unchanged readable bytes/metadata and zero automatic upload calls, and retain existing external-network privacy assertions.

### Implementation

- [X] T031 [US3] Implement favorite/delete use cases and repository transactions in server/internal/application/collection.go and server/internal/adapters/sqlite/images.go; atomically revalidate session/owner and mutate, retain previous committed state on error, treat concurrent deletion as not-found without resurrection, and remove image bytes with metadata in one commit.
- [X] T032 [US3] Implement PATCH/DELETE /api/images/:id in server/internal/adapters/httpapi/images.go with boolean-only favorite input, owner-only lookup, contracted statuses, cancellation/deadline propagation and no replacement endpoint; do not leak whether a missing ID belongs to another user.
- [X] T033 [US3] Complete committed-state favorite/delete integration in src/hooks/useCollection.ts and src/App.tsx, preserving old pressed/image state on failure, preventing duplicate conflicting same-image mutations, keeping errors actionable in active previews/deletion prompts and ensuring explicit retry cannot apply another account's stale action.
- [X] T034 [US3] Close any remaining lifecycle gaps reproduced by T029 in src/components/Account.tsx, src/storage/cloud.ts, src/hooks/useCollection.ts and src/hooks/useImageUrl.ts; account changes must cancel requests and batch continuation, clear UI/preview/outcomes and prevent stale events from changing the next identity while preserving guest storage.
- [X] T035 [US3] Execute the full anonymous/account-B list/content/favorite/delete/replace probe matrix in server/internal/adapters/httpapi/images_test.go and tests/account/privacy-lifecycle.spec.ts against Go, including forged owner metadata and expected-account headers; verify account-A original bytes/flags/row counts remain unchanged and retain reports under specs/004-user-cloud-sync/evidence/.
- [X] T036 [US3] Execute all US3 browser cases and the concurrent Go tests with go test -race ./... from server/; record SC-003–SC-006 and remaining SC-004 outcomes in specs/004-user-cloud-sync/validation.md, distinguishing failed assertions, unavailable engines and infrastructure-not-run cases; do not mark the story complete with missing identity/guest acceptance evidence.

**Checkpoint**: All six spec outcomes have actual API/browser evidence. No direct/private-resource access or stale-account test is waived by source inspection.

## Phase 6: Polish and Cross-Cutting Concerns

- [X] T037 Remove the superseded server/app.mjs and server/app.test.mjs only after Go parity gates pass, remove only the newly added backend-only sharp dependency from package.json/package-lock.json, and add explicit Go backend test/vet/build verification scripts in package.json; preserve Node frontend tooling and private volume/schema data.
- [X] T038 Run real Go frontend/API image builds and Compose startup using server/Dockerfile, Dockerfile and compose.yaml; verify nginx -t, proxied /api/health, non-root API binary with no Node/Go compiler runtime requirement, no public API port, private-volume isolation, correct Origin/cookie behavior and retryable overload mapping, recording image IDs and command outputs in specs/004-user-cloud-sync/evidence/.
- [X] T039 Add and execute tests/deployment/cloud-persistence.mjs to seed test-owned accounts/images/favorites via the API, restart/recreate the Go API using the same gallery-data volume, and restore a stopped-volume backup into a disposable separate volume/project; verify credentials, original bytes, flags and guest storage, preserve original volumes, clean only test-owned temporary artifacts and save results under specs/004-user-cloud-sync/evidence/.
- [X] T040 [P] Update README.md and specs/004-user-cloud-sync/quickstart.md with verified Go development/build/test commands, Docker origin/port settings, HTTP API and browser commands, volume preservation, concrete stopped-volume backup/restore instructions, private host/backup access, storage limits and public HTTPS prerequisites; replace the earlier local-only product claim with accurate guest/account behavior.
- [X] T041 Execute final frontend typecheck, units and production build; Go tests/race/vet/import-direction checks; all account browser projects and relevant existing guest suites using package.json, playwright.accounts.config.ts and playwright.config.ts; record command exits, passed/failed/flaky/skipped/not-run counts, browser versions, inherited failures and exact blockers in specs/004-user-cloud-sync/validation.md without treating discovery as execution.
- [X] T042 Reconcile specs/004-user-cloud-sync/{spec,plan,tasks,validation}.md and checklists/requirements.md against the finished Go implementation and evidence; map every FR/SC to the checks below, remove only newly orphaned code, confirm no credentials or private data entered build contexts/logs, and leave unmet task/acceptance boxes unchecked instead of declaring completion.

## Dependencies and Execution Order

```text
Setup T001–T003
  → Foundation T004–T010
  → US1 T011–T018
  → US2 T019–T027
  → US3 T028–T036
  → Final delivery T037–T042
```

- T001 establishes the baseline before edits. T002 and T003 are file-independent after T001.
- T004 defines the shared Go ports/types. T005 and T006 can then run independently; T009 can also run alongside backend work. T007 waits for shared type/store contracts; T008 waits for the Go health entry point. T010 validates the full foundation before stories.
- US1 has no story dependency. US2 requires US1 authentication/session boundaries. US3 requires US1 identities and US2 persisted images; its acceptance tests create their own fixtures and can run independently after these prerequisites.
- Within each story, author missing tests first and reproduce current bugs before changes. Do not require already-correct draft behavior to fail artificially; replace its runtime and revalidate it instead.
- T011/T012, T019/T020 and T028/T029/T030 are independent test-authoring groups after their phase prerequisites. Parallel authoring does not authorize simultaneous tests modifying the same accounts, volume, port or SQLite file.
- T025 provides account-scoped cancellation before T026's hook integration. T034 closes issues exposed by the broader identity-race tests after basic US2 integration.
- T037 follows all story gates and precedes final image builds. T039 follows T038; T040 documentation can proceed alongside T039 in separate files. T041 follows final code/dependency changes and actual deployment checks; T042 follows complete evidence collection.
- If sandbox restrictions block a required command, request approval for that specific command and retain the actual failure/not-run evidence. Never bypass restrictions or substitute previous runtime results.

## Parallel Execution Examples

**US1**: After foundation, author T011 in Go application/HTTP test files alongside T012 in tests/account/auth.spec.ts. Implement T013–T017 in dependency order, then run T018 with a single test-owned backend.

**US2**: After US1, author T019's Go upload/read assertions alongside T020's isolated-browser journey. The service and frontend integration share contracts; finish T021–T026 before executing T027.

**US3**: After US2, author T028's Go transaction tests alongside T029's delayed-account browser tests and T030's guest tests. They touch distinct files. Execute mutating suites sequentially or with isolated accounts/Compose projects; lifecycle tests must not share login cookies unintentionally.

**Cross-cutting**: T040 can update documentation while T039 exercises a disposable restore volume. Each retains its own outputs; merge evidence into validation.md after both complete.

## Requirement Traceability

| Requirement | Main tasks |
| --- | --- |
| FR-001 | T011–T018 |
| FR-002 | T004–T005, T014–T015, T023–T024, T028, T031–T035 |
| FR-003 | T019, T023–T024, T028–T029, T031–T035, T038 |
| FR-004 | T020–T027, T031–T033 |
| FR-005 | T020, T023, T027, T035, T039 |
| FR-006 | T019–T020, T025–T027, T029, T033–T036 |
| FR-007 | T019, T021–T024 |
| FR-008 | T012, T017, T025–T026, T029, T034–T036 |
| FR-009 | T009, T025, T030, T036 |
| FR-010 | T020, T025–T027, T033 |
| FR-011 | T006–T008, T013–T015, T024, T038, T040–T042 |
| FR-012 | T008, T037–T042 |
| FR-013/FR-014/SC-007 | T003, T012, T016, T018, T040–T042 |
| SC-001 | T011–T018 |
| SC-002 | T019–T027, T039 |
| SC-003 | T028, T031–T032, T035–T036 |
| SC-004 | T019–T020, T027–T029, T033–T036 |
| SC-005 | T012, T017, T025–T026, T028–T029, T034–T036 |
| SC-006 | T030, T036 |
| Go/hexagonal delivery constraint | T002, T004–T010, T013–T015, T021–T024, T028, T031–T032, T037–T042 |

## Implementation Strategy

1. Establish the Go foundation, then deliver US1 as the account MVP. Validate it independently; it is an account-access increment, not the whole requested cloud feature.
2. Add US2 as the first cloud-storage increment. Validate original bytes and a truly isolated second browser rather than relying on one browser's cache.
3. Complete US3 before claiming the private synchronized collection is delivered. Owner isolation, guest preservation and delayed-request safety are required, not optional polish.
4. Replace the runtime/dependency drafts and execute container persistence/restore plus all relevant regressions. Release only with explicit evidence for the required acceptance gates; leave unavailable checks visible and unchecked.

## Notes

42 tasks: 3 setup, 7 foundation, 8 US1, 9 US2, 9 US3 and 6 final delivery. Eight tasks are marked `[P]`; their prerequisites and examples are above. No task or test was executed by generating this document. The requirements checklist's completed document-review items do not imply completed implementation tasks.

### Accepted routing update

The user requested and confirmed dedicated sign-in/sign-up URLs during implementation. T012, T016 and T018 are reopened for this refinement; earlier inline-form test results remain historical. The Go API contract and other story scopes are unchanged.


### Execution closeout

All 42 task execution/review steps are recorded complete. This does **not** mean all browser tests
passed: final evidence reports 39/39 account cases and 14 Go race tests passing, while five guest
focus failures remain and one legacy WebKit seed case is skipped. T041's execution/reporting is
complete; the broader guest regression gate is not green. Feature-001/002 focus work remains outside
this implementation. See validation.md for original full-run and targeted-rerun counts separately.
The user explicitly authorized removing app.mjs during execution; its orphaned Node test and backend-only
sharp dependency were removed while preserving frontend tooling and the private volume.
SQLite primitives/transactions are consolidated in server/internal/adapters/sqlite/store.go rather than
split into unused schema/transaction files; the requested port and transaction boundaries are verified.
