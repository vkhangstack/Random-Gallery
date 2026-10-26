# Tasks: Random Gallery

**Input**: Design documents from `specs/001-random-gallery/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/storage.md](contracts/storage.md),
[contracts/user-interface.md](contracts/user-interface.md), [quickstart.md](quickstart.md).
**Tests**: Explicitly requested by the user: unit selection/filtering tests and upload,
persistence, favorite, and deletion integration tests. Write the tests before the behavior they
verify; demonstrate relevant failures before implementation, then make them pass.
**Organization**: One root React/TypeScript/Vite/Tailwind app. Implementation is present.
Checked tasks have satisfied acceptance criteria with executed evidence. Authored-but-unexecuted
tests and browser-dependent implementation remain unchecked. See task-audit.md and validation.md.

## Format: `[ID] [P?] [Story] Description`

Every task has a status checkbox, sequential ID, concrete file paths, and a story label when
inside a story phase. `[P]` means eligible to run alongside other marked tasks in the same
explicit execution group after its prerequisites; it does not waive dependencies. Unmarked
implementation/integration tasks run sequentially. Do not edit shared files concurrently.

## Path Conventions

Application paths `src/` and `tests/` are relative to the repository root. Documentation and
validation evidence live under `specs/001-random-gallery/`. Match the approved plan and native
storage/UI contracts; do not add backend, routing/state frameworks, remote assets, or product features.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the requested stack and runnable verification commands without overwriting
existing Spec Kit artifacts.

- [x] T001 Initialize the root React/TypeScript/Vite app with Node 24 LTS and compatible stable dependencies in package.json, package-lock.json, tsconfig.json, vite.config.ts, index.html, src/main.tsx, src/App.tsx, and src/styles.css; enable strict TypeScript, React Strict Mode, Tailwind's Vite plugin, and local-only assets; provide dev, preview, typecheck, build, test, and test:e2e scripts without adding a backend.
- [ ] T002 Configure Vitest, jsdom, Testing Library, user-event, and fake-indexeddb in vite.config.ts and tests/setup.ts; isolate each unrelated test with a fresh IDBFactory, preserve the factory for reopen scenarios, support required Blob/structuredClone operations, and reset mocks/DOM after tests; verify an initial runner smoke test in tests/unit/setup.test.ts.
- [ ] T003 Configure Playwright projects for Chromium, Firefox, and WebKit in playwright.config.ts with a fixed localhost origin, isolated contexts, and a webServer that builds and starts Vite preview; ensure package.json test:e2e runs browser tests against production assets and document browser installation requirements in specs/001-random-gallery/quickstart.md.

**Checkpoint**: Type checking, build, and initial test runner work; browser runner can start the
static preview. Do not report empty-suite results as feature acceptance.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish common types and genuine test inputs before story implementation.

- [x] T004 Define ImageMetadata, ImageBlob, upload outcomes, and collection/session status types in src/types.ts following specs/001-random-gallery/data-model.md; quote/enforce metadata constraints: id “UUID, unique, immutable”; name “Original filename, preserved and rendered as text”; mimeType “Canonical image/jpeg, image/png, or image/webp from validation”; size “1 through 10,485,760 bytes inclusive; equals blob size”; addedAt “Batch selection time in milliseconds since epoch”; batchId “UUID shared by one batch, used to order simultaneous batches”; ordinal “Zero-based position in selected batch; preserves tie ordering”; favorite “Initially false; changed only after committed update”; blob id “Same ID as metadata entry”; blob “Original validated content, canonical MIME; never base64 or an object URL”.
- [x] T005 [P] Add genuine small JPEG/PNG/WebP files and reproducible fixture helpers in tests/fixtures/images.ts and tests/fixtures/README.md covering portrait/landscape/square, 12-file mixed-type collection, duplicate/Unicode/long names, corrupt/unsupported/empty content, accepted signatures with misleading names/MIME, exact 10,485,760-byte and 10,485,761-byte otherwise decodable files, and a generated 100-image workload up to 2 MiB each; document generation without committing a large workload.

**Checkpoint**: Setup and foundation complete before any story implementation. Types carry no
storage behavior. Fixture generation is independent of implementation and must be reused by tests.

---

## Phase 3: User Story 1 - Build and retain a private collection (Priority: P1) — MVP

**Goal**: Upload valid images, report failures independently, view saved entries, and retain
original images locally across refresh/reopening without false persistence claims.
**Independent Test**: Start empty; upload a mixed batch; inspect Gallery; refresh/reopen against
the same origin/profile. Successful entries persist, failed entries do not appear as saved,
and storage-read failure shows an error rather than an empty collection. Favorite persistence
is completed/tested with US2, where the first favorite controls are introduced.

### Tests for User Story 1

Write T006–T010 first and observe failures for the behavior before T011–T016. They may be
authored concurrently after Phase 2 because each uses a different test file and stable contracts.

- [ ] T006 [P] [US1] Write storage contract tests in tests/integration/storage-upload.test.ts against the real src/storage/images.ts boundary for schema version 1, metadata-only listing/default addedAt-descending and ordinal tie ordering, blob readback, independent duplicate entries, atomic metadata/blob adds, reopen retention, transaction abort after request success, no orphan records, denied/open/blocked/read/quota failures, and versionchange connection close/reopen; assert writes resolve only at transaction completion.
- [x] T007 [P] [US1] Write file-validation tests in tests/unit/validateImage.test.ts for nonempty content, canonical signature-derived JPEG/PNG/WebP MIME, misleading extensions/MIME, corrupt decode, unsupported content, exact size boundary and +1 byte rejection, and temporary object URL revocation on success/error; use controlled decode only in these fast tests.
- [ ] T008 [P] [US1] Write tests in tests/integration/image-url.test.tsx for independent URL consumers, replacement/unmount/decode-failure cleanup, pending reads resolved after unmount or ID change, no premature revocation while displayed, and Strict Mode setup/cleanup symmetry; every created URL must eventually be revoked.
- [ ] T009 [P] [US1] Write user-facing integration tests in tests/integration/uploads.test.tsx using Testing Library and the real storage module plus fake-indexeddb for loading/empty/read-error states, named per-file failures, saved/failed counts, sequential processing after failures, no saved entry before commit, picker reset/retry, duplicates and order, collection retention on remount, and interrupted-batch committed entries only.
- [ ] T010 [P] [US1] Write browser tests in tests/e2e/uploads-persistence.spec.ts using real decoding/IndexedDB for 12 valid files, mixed-file failures and boundaries, persistent images on reload and page reopen in the same context/origin, a separate persistent-profile browser restart, and site-data clearing; do not reset data inside retention scenarios.

### Implementation for User Story 1

- [ ] T011 [US1] Implement native IndexedDB opening, listImages, getImageBlob, addImage, and closeDatabase in src/storage/images.ts with database random-gallery version 1, stores images/blobs keyed by id, atomic per-image transactions, commit-only success, abort/error rejection, blocked-open retry guidance, versionchange closing, deterministic ordering, and actionable unavailable/quota/read errors; do not decode inside transactions or fall back to localStorage/memory as saved storage.
- [ ] T012 [US1] Implement validateImage in src/lib/validateImage.ts with size 1–10,485,760 bytes inclusive, content signatures and canonical MIME, and successful browser decode using a temporary URL revoked in finally; reject each invalid file with reason/recovery text and preserve original content.
- [ ] T013 [US1] Implement consumer-owned blob loading/object URLs in src/hooks/useImageUrl.ts with explicit loading/error/retry state, stale-read suppression, replacement/unmount/error revocation, and separate lifetimes per consumer; never persist URL strings or revoke an image still in use.
- [ ] T014 [US1] Implement collection loading/retry and sequential per-file upload orchestration in src/hooks/useCollection.ts with UUID/batch time/ordinal assignment, queued → validating → saving → saved/failed outcomes, commit-confirmed metadata updates, independent file failures, retained completed saves on refresh, and no concurrent batch; release completed file references when no longer needed.
- [ ] T015 [US1] Implement src/components/Uploader.tsx with multiple-file input, pre-selection type/10 MiB guidance, browser/device-only/no-sync/site-data-loss explanation, accessible processing feedback and final saved/failed counts, filename-specific recovery messages, and picker reset for retry; disable a second upload batch while processing.
- [ ] T016 [US1] Integrate collection/Uploader with src/App.tsx and a basic responsive saved-image grid in src/components/Gallery.tsx using src/hooks/useImageUrl.ts; provide Random/Gallery navigation with upload in both destinations, Random opening by default, and distinct loading/empty/error/retry states; meaningful labels, visible focus, preserved thumbnail aspect ratio, and long-name containment are required from first introduction.
- [ ] T017 [US1] Run US1 unit/integration/browser checks plus typecheck/build and record commands, results, executed browsers, and persistence/validation evidence in specs/001-random-gallery/validation.md; correct story defects before marking this checkpoint complete, and record any unexecuted profile-restart check as open.

**Checkpoint**: Private upload/retention MVP is demonstrable. Random discovery and interactive
favorites are added by US2; full gallery management is added by US3.

---

## Phase 4: User Story 2 - Discover an image at random (Priority: P1)

**Goal**: Show one uncropped random image, prevent immediate repeats when alternatives exist,
and support all/favorites scopes with reliable favorite persistence.
**Independent Test**: Seed saved metadata/blobs and favorites independently of the uploader;
shuffle 100 times in each scope, exercise zero/one/two-image collections, change favorite status,
and verify refresh retention. US2 depends on the US1 storage/collection primitives, not its upload UI.

### Tests for User Story 2

- [x] T018 [P] [US2] Write pure selection tests in tests/unit/random.test.ts for empty → null, one → same ID, two → alternating IDs, absent current ID, many candidates, injected source bucket boundaries with input in [0,1), current exclusion, input immutability, and 100 consecutive selections; validate favorites/readable eligibility through test inputs without flaky statistical sampling.
- [ ] T019 [P] [US2] Write favorite storage tests in tests/integration/storage-favorites.test.ts for explicit target boolean, no upsert of missing ID, metadata-only update leaving blob unchanged, commit-only success, abort/quota rollback, duplicate independence, and database reopen persistence.
- [ ] T020 [P] [US2] Write viewer/scope integration tests in tests/integration/random-viewer.test.tsx for image name/status, no immediate repeats, one-image feedback, empty favorites/all states, scope changes, commit-confirmed favorite toggling/pending controls, favorite failure/retry, removal of displayed last favorite, rapid clicks, and unreadable IDs with all-unreadable error/retry rather than false empty collection.
- [ ] T021 [P] [US2] Write browser tests in tests/e2e/random-favorites.spec.ts for 100 nonrepeating selections per populated scope, exactly two-image alternation, no out-of-scope selection, uncropped portrait/landscape/square display, favorite changes persisting after reload/reopen, and saved-image decode failure/retry using genuine files.

### Implementation for User Story 2

- [x] T022 [US2] Implement pure selectRandomImage in src/lib/random.ts per contracts/storage.md using unique eligible IDs, null for empty, single-image retention, current-ID exclusion only with alternatives, one uniform indexed sample, and injectable random source defaulting to Math.random; no retry loop or history deck.
- [ ] T023 [US2] Extend src/storage/images.ts and src/hooks/useCollection.ts with setFavorite and commit-confirmed metadata updates, pending mutation IDs, retained prior status on failure, actionable retry, and session unreadable IDs with retry; exclude broken images from Random without removing their stored metadata or source files.
- [ ] T024 [US2] Create shared src/components/ImageViewer.tsx for filename, favorite state/toggle, pending/error feedback, contained aspect ratio, and readable blob loading/retry; integrate Random scope/current ID and prominent Random image action in src/App.tsx, using functional updates for rapid actions and reconciliation after favorite/scope/readability changes; show distinct zero/one/all-unreadable states.
- [ ] T025 [US2] Run US2 checks and the US1 regression suites, recording non-repeat/scope, favorite persistence/failure, resource-lifetime, and image-presentation evidence in specs/001-random-gallery/validation.md; make story checks pass before continuing.

**Checkpoint**: Core Random Gallery product loop works with upload and favorites. Gallery
query/filter and deletion are not yet complete.

---

## Phase 5: User Story 3 - Browse and manage the collection (Priority: P2)

**Goal**: Search/filter the grid, inspect images in a larger viewer, favorite from Gallery, and
confirm individual deletion without stale viewers or loss of unrelated entries.
**Independent Test**: Seed a known collection; search/filter, inspect/favorite, cancel deletion,
confirm deletion of displayed/final images, inject failed deletions, and reload to check retention.
Use persisted seeds so testing does not depend on completing the uploader flow.

### Tests for User Story 3

- [x] T026 [P] [US3] Write filtering tests in tests/unit/filter.test.ts for trimmed case-insensitive filename substring including extension, Unicode/duplicate names, empty query, favorites-only intersection, stable order/reference preservation, and no mutation of input.
- [ ] T027 [P] [US3] Write delete storage contract tests in tests/integration/storage-delete.test.ts for atomic metadata/blob removal, persistent absence on reopen, no effect on identical-name/content entries, abort after a successful request with full rollback, and actionable failed deletion without false success.
- [ ] T028 [P] [US3] Write user-interface contract tests in tests/integration/gallery-management.test.tsx for grid search/filter clearing, no-results vs empty states, Gallery favorite propagation, larger viewer remaining open when filtered out, deletion identity/permanence/cancel/failure/pending/retry, successful removal of current/last image, independent Random scope, and focus recovery after deleted trigger removal.
- [ ] T029 [P] [US3] Write browser tests in tests/e2e/gallery-management.spec.ts for search/favorite combinations, Gallery/Random state consistency, larger viewer, cancelled/successful/failed deletion, nested confirmation dismissal, logical focus return, duplicate independence, and favorite/deletion retention across reload.

### Implementation for User Story 3

- [x] T030 [US3] Implement pure filterImages in src/lib/filter.ts per contracts/storage.md, trimming query and intersecting case-insensitive filename search with favorites-only while preserving order/records and leaving Random eligibility independent.
- [ ] T031 [US3] Extend src/storage/images.ts and src/hooks/useCollection.ts with commit-confirmed atomic deleteImage across both stores, per-ID pending/error state, retained saved entry on failure, and collection removal only after commit; source files and unrelated duplicate entries remain untouched.
- [ ] T032 [US3] Extend src/components/Gallery.tsx and src/components/ImageViewer.tsx with search/favorites filter, clear-filter no-results action, grid favorite controls, and native larger-viewer dialog by selected ID; use shared mutation state and consumer-owned URLs, keep filtered-out inspected images open, preserve full accessible names, and manage keyboard dismissal/focus.
- [ ] T033 [US3] Implement src/components/DeleteConfirmation.tsx and connect deletion actions in src/App.tsx, src/components/Gallery.tsx, and src/components/ImageViewer.tsx; identify permanent app-only removal, focus Cancel initially, support Escape/cancel, prevent duplicate pending deletion, expose retry on failure, and on commit close a deleted Gallery viewer/focus next result or controls and reconcile Random to eligible image or correct empty/error state.
- [ ] T034 [US3] Run US3 suites with US1/US2 regression checks and record successful/failed mutation, duplicate, viewer, scope, focus, and persistence evidence in specs/001-random-gallery/validation.md; fix failures before this checkpoint completes.

**Checkpoint**: Collection browsing and management are complete; all data operations have explicit
loading, empty, and failure behavior and leave viewers valid.

---

## Phase 6: User Story 4 - Use the app comfortably across devices (Priority: P2)

**Goal**: Complete every core flow on mobile/desktop, in light/dark themes, with keyboard and
assistive technology, without horizontal overflow or inaccessible feedback.
**Independent Test**: With seeded data and genuine upload fixtures, complete upload, shuffle,
favorite, search, open/close, cancelled deletion, and confirmed deletion at narrow/wide widths,
in both themes, using keyboard only; check retained theme and failed preference writes.

### Tests for User Story 4

- [ ] T035 [P] [US4] Write theme/status integration tests in tests/integration/theme-accessibility.test.tsx for system default, localStorage value constrained to “light” or “dark” with “absent/invalid means follow device preference”, read/write exceptions, session-only fallback notice, persisted explicit choice, accessible image/control names and states, and live loading/upload/error announcements.
- [ ] T036 [P] [US4] Write browser tests in tests/e2e/accessibility-responsive.spec.ts for all core keyboard flows using Tab/Enter/Space/Escape, dialog containment and restored/surviving focus including nested delete prompts, visible focus, full long-name accessibility, both themes, 320/768/1440 widths and portrait/landscape, and zero page-level horizontal overflow in loading/empty/error/populated states.

### Implementation for User Story 4

- [ ] T037 [US4] Implement guarded theme initialization/toggle/persistence in src/App.tsx and src/styles.css with localStorage key random-gallery.theme holding only light/dark; follow system preference without explicit choice, retain session theme on write failure, announce unsaved preference, and never store collection metadata/image bytes/base64/URLs in localStorage.
- [ ] T038 [US4] Complete responsive layouts and light/dark treatments in src/styles.css and src/components/Gallery.tsx, src/components/Uploader.tsx, src/components/ImageViewer.tsx, src/components/DeleteConfirmation.tsx, and src/App.tsx; enforce readable wrapped names/errors, uncropped whole-image viewers, visible focus, ≥4.5:1 normal text contrast, ≥3:1 large text/control boundaries/focus contrast, and usable controls without horizontal scroll from 320 through 1440 CSS pixels.
- [ ] T039 [US4] Audit and correct keyboard/focus order, dialog opening/closing/containment, surviving-target focus recovery, meaningful filename labels, stateful favorite/navigation names, and non-color status announcements across src/App.tsx and src/components/Gallery.tsx, src/components/Uploader.tsx, src/components/ImageViewer.tsx, and src/components/DeleteConfirmation.tsx; ensure mutation/read failures remain operable and screen-reader accessible.
- [ ] T040 [US4] Execute US4 suites, manual screen-reader/contrast/keyboard checks, and current Android Chrome/iOS Safari file-picker smoke checks per specs/001-random-gallery/quickstart.md; record browser/device versions and evidence in specs/001-random-gallery/validation.md, retaining unexecuted physical-device/manual checks as open rather than passing.

**Checkpoint**: Accessible responsive flows and themes are verified to the extent evidenced;
manual gates without the required devices or screen reader remain explicitly incomplete.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verify privacy, performance, full acceptance, and reproducible operation. No unrelated
refactor, speculative feature, or new architecture is authorized by this phase.

- [ ] T041 [P] Add cross-flow browser privacy/failure tests in tests/e2e/privacy-storage-failures.spec.ts observing outgoing requests during upload, browse, search, shuffle, favorite, deletion, and reopening; assert no fixture filenames/metadata/bytes leave the device and no external service calls occur, inspect IndexedDB blob/metadata vs theme-only localStorage, and inject deterministic denied/read/quota/aborted mutations through test-only instrumentation without introducing product debug routes.
- [ ] T042 [P] Add repeatable production-build timing scenarios in tests/e2e/performance.spec.ts using the generated 100-image fixture and 100 shuffle/search samples, checking upload feedback within one second and reporting 95th-percentile visible-result timing; document physical Pixel 6a/Android Chrome and MacBook Air M1/Safari/Chrome procedure and distinguish automated timing from physical-device acceptance in specs/001-random-gallery/performance.md.
- [ ] T043 Execute the physical-device workload per specs/001-random-gallery/quickstart.md and record fixture dimensions/sizes, OS/browser versions, 100 shuffle and 100 search samples, ≥95% results within one second, and upload feedback within one second in specs/001-random-gallery/performance.md and specs/001-random-gallery/validation.md; if required hardware is unavailable, leave this task unchecked and record the blocker rather than claiming SC-005 passes.
- [ ] T044 Run the five-first-time-user walkthrough from specs/001-random-gallery/quickstart.md and record anonymized completion times and errors in specs/001-random-gallery/usability.md; verify ≥4/5 complete upload/shuffle/favorite/find within three minutes unaided and 5/5 locate device-only/site-data-loss guidance; if participants are unavailable, leave unchecked and record the blocker in specs/001-random-gallery/validation.md.
- [x] T045 Update specs/001-random-gallery/quickstart.md with actual scripts/setup/fixture commands, browser prerequisites, and measured limitations after implementation, keeping its contract/model links accurate and distinguishing already executed checks from remaining manual acceptance work.
- [ ] T046 Run typecheck, production build, all Vitest suites and all Playwright browser projects from package.json; review src/storage/images.ts, src/hooks/useImageUrl.ts, and src/lib/validateImage.ts for atomicity/cleanup and review runtime dependencies/network usage for local-only scope; record final SC-001–SC-008 coverage, outputs, browser versions, failures/blockers, and outstanding manual gates in specs/001-random-gallery/validation.md without marking unexecuted tasks complete.

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Setup T001–T003 → Foundation T004–T005 → US1 T006–T017
                                      → US2 T018–T025 → US3 T026–T034
                                                        → US4 T035–T040
                                                          → Final T041–T046
```

The arrows from US1 onward describe the normal incremental implementation order. All stories
require Phase 2. US2 additionally consumes US1 storage/blob/collection infrastructure; US3 consumes
those same primitives and US2 favorite/shared-viewer behavior; US4 verifies the complete UI.
No story must use another story's user journey to seed its independent tests. Do not pretend
shared App/collection/storage edits can be integrated concurrently without coordination.

### Within Each User Story

Write its test group first, establish relevant failures, then implement in listed order and run
the checkpoint. T022 waits for T018; T023 waits for T019; T024 waits for T020 and T011–T014.
T030 waits for T026; T031 waits for T027; T032–T033 wait for T028/T029. T037–T039 wait for
T035/T036. Integration tests may initially fail on missing imports until the implementation exists;
then ensure behavioral assertions exercise the intended failure rather than accepting compile errors
as the only regression evidence. Existing passing story checks must keep passing.

### Parallel Opportunities

- After Phase 2, author T006–T010 together: storage, validation, URL, upload UI, and browser tests
  occupy separate files and consume the approved types/contracts/fixtures.
- After US1 checkpoint, author T018–T021 together; no test requires another test's artifacts.
- After US2 checkpoint, author T026–T029 together; implementation remains ordered due to shared files.
- After US3 checkpoint, author T035–T036 together; theme/status and browser-accessibility files differ.
- After US4, T041 and T042 may run together; they write separate tests and only T042 writes
  performance.md. T043 must wait for T042; T045/T046 wait for preceding applicable verification.
- T005 has no dependency on T004 after Setup, but its Phase 2 checkpoint still blocks story work.
- Parallel opportunities describe scheduling only; they do not require delegation or extra agents.

## Parallel Example: User Story 1

Author T006 in `tests/integration/storage-upload.test.ts` while T007 covers
`tests/unit/validateImage.test.ts`, T008 covers `tests/integration/image-url.test.tsx`, T009 covers
`tests/integration/uploads.test.tsx`, and T010 covers `tests/e2e/uploads-persistence.spec.ts`.
Run against shared read-only fixtures/contracts; do not change tests/setup.ts concurrently.

## Parallel Example: User Story 2

Author T018 selection tests and T019 favorite storage tests alongside T020 viewer integration
and T021 browser tests. After the group is ready, implement T022 → T023 → T024 and verify T025.

## Parallel Example: User Story 3

Author T026 filtering, T027 deletion storage, T028 Gallery contract integration, and T029 browser
tests together. Keep T031/T032/T033 sequential because storage/collection/viewer/App edits overlap.

## Parallel Example: User Story 4

Author T035 theme/status tests concurrently with T036 responsive/keyboard browser tests. Complete
shared UI/style changes sequentially, then execute T040 with actual device/manual evidence.

## Implementation Strategy

### MVP First (User Story 1 Only)

Complete Setup, Foundation, and US1, then validate upload/persistence independently. This is the
smallest private collection increment; it is not the complete Random Gallery product. Adding US2
provides the first useful random-discovery product loop. Do not deploy or publish as part of this task list.

### Incremental Delivery

After each checkpoint demonstrate that story with seeded data and run previous story regressions.
Add US2 discovery/favorites, US3 management, then US4 full responsive/theme/accessibility coverage.
Complete cross-cutting privacy/performance/usability acceptance without expanding product scope.

### Requirement Coverage

| Scope | Tasks |
| --- | --- |
| FR-001–008: upload, validation, persistence, privacy | T001, T004–T017, T041, T046 |
| FR-009–013: viewer, scopes, selection, aspect ratio | T018–T025, T033, T038 |
| FR-014–018: Gallery, filters, favorites, deletion | T019, T023, T026–T034 |
| FR-019–024: responsive, themes, accessible states/focus | T009, T013–T016, T020, T024, T028–T040 |
| FR-025: independent scopes and duplicate handling | T006, T009, T020, T026–T034 |
| SC-001/002: retained 12-file upload and validation outcomes | T005–T017, T019, T021 |
| SC-003: eligible selection and no immediate repeats | T018, T020–T025 |
| SC-004: committed/failed mutations and valid viewer | T019–T025, T027–T034 |
| SC-005: performance | T005, T042–T043 |
| SC-006: mobile/keyboard/themes | T035–T040 |
| SC-007: first-time-user success | T044 |
| SC-008: privacy and failure correctness | T006–T017, T019–T021, T027–T034, T041, T046 |

## Notes

Evidence audit: 9/46 tasks are verified and checked; 37 remain unchecked. This replaces the
previous 30-task count, which incorrectly treated authored-but-unexecuted tests and source-only
inspection as sufficient evidence. Reopening those tasks does not remove their implementation.
The full criteria for every task and the minimum evidence needed are in [task-audit.md](task-audit.md).

## Implementation Status and Tooling Blockers

Core code and browser test sources exist. Native-browser execution is blocked by sandbox EPERM
on localhost binding and Chromium Mach-port bootstrap. Escalated execution was requested through
the tool and rejected because sandbox_approval is false. External dependency/browser downloads
also fail DNS resolution. No restriction was bypassed. T002 still requires its planned test stack;
existing Node and Playwright suites provide additional coverage without replacing that requirement.
The remaining runtime/component/device/user gates stay unchecked until executed evidence exists.
See [validation.md](validation.md), [manual-checks.md](manual-checks.md), and evidence/ for commands,
errors, acceptance mappings, and required user participation.
