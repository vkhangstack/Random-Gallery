---
description: "Dependency-ordered implementation tasks for responsive layouts and favorites controls"
---

# Tasks: Responsive Layout and Favorites Controls

**Input**: Design documents in `specs/002-responsive-favorites/`: [spec.md](spec.md),
[plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md),
[UI contract](contracts/user-interface.md), [favorite state contract](contracts/favorite-state.md),
and [quickstart.md](quickstart.md). Governance: `.specify/memory/constitution.md`.

**Prerequisites**: Existing React/TypeScript/Vite app and Node >=24. Reuse package.json,
package-lock.json, native IndexedDB/dialogs and existing Node/Playwright tooling. No new package,
application scaffolding, migration, backend or unrelated baseline cleanup is needed.

**Tests**: Included because the spec explicitly defines SC-001–006 and independent scenario
validation; constitution requires regression reproduction before bug fixes. Write relevant
assertions before source changes and observe failures where executable. Existing passing
behavior stays covered; do not manufacture a failure or weaken existing assertions. Record
infrastructure-blocked execution as not run, not passed.

**Organization**: Each story has its own phase and acceptance checkpoint. Paths are relative
to repository root. All tasks start unchecked: generated tasks are not completion evidence.
`[P]` identifies work that can run concurrently only after its named prerequisites; do not run
concurrent edits to the same file or concurrent preview suites on port 4173.

## Phase 1: Setup (Existing Project)

**Purpose**: Establish reproducible baseline and evidence without reinitializing the app.

- [X] T001 Inspect package.json, package-lock.json, playwright.config.ts and tests/fixtures/images.ts against specs/002-responsive-favorites/quickstart.md; verify Node >=24 and existing dependency/browser/fixture availability, using npm ci only if dependencies are absent, and record environment and exact missing prerequisites in specs/002-responsive-favorites/validation.md.
- [ ] T002 Run npm run typecheck, npm test, npm run build and the existing targeted browser command from specs/002-responsive-favorites/quickstart.md; save command results and pass/fail/skipped/not-run counts in specs/002-responsive-favorites/validation.md, distinguishing current failures from historical blockers in specs/001-random-gallery/validation.md and retaining a same-origin pre-change browser profile with favorite/non-favorite images for T020.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Lock down existing data/context invariants and map acceptance cases before any story edits.

- [X] T003 Audit src/types.ts and src/storage/images.ts and record the unchanged field invariants in specs/002-responsive-favorites/validation.md: id — "Required; preserve the existing stable ID; do not regenerate on resize or toggle."; name — "Required; preserve the complete original filename, including spaces and Unicode; do not add a length cap or truncate stored data."; mimeType — "Required; existing enum `image/jpeg`, `image/png`, `image/webp`; unchanged."; size — "Required; existing byte size and baseline upload validation remain unchanged."; addedAt — "Required; existing upload timestamp and ordering remain unchanged."; batchId — "Required; existing upload-batch identity remains unchanged."; ordinal — "Required; existing in-batch ordering remains unchanged."; favorite — "Required; true only for the saved favorite state; change UI state only after transaction completion."; retain random-gallery v1 images/blobs and random-gallery.theme without migration.
- [X] T004 Map tests and reproducible gaps to FR-001–014 and SC-001–006 in specs/002-responsive-favorites/validation.md after inspecting src/App.tsx, src/hooks/useCollection.ts, src/components/ImageViewer.tsx and src/styles.css; include the full 5-width × 2-height × 2-theme matrix, active-dialog errors, native pending/abort seams, current focus fallback and clipping-masked overflow; carry forward unverified baseline obligations rather than marking them complete.

**Checkpoint**: Baseline and constraints documented; story work may begin. These tasks audit
existing code and create evidence scaffolding, not a new model/storage/state framework.

## Phase 3: User Story 1 — Use the collection at any supported screen size (Priority: P1) — MVP

**Goal**: Existing screens and dialogs fit supported widths/heights and preserve context during reflow.

**Independent Test**: With the existing favorite design, validate empty/populated/loading,
processing/error and dialog states at 320/375/414/768/1440 × 320/800 in both themes. Include
long spaced/unbroken/Unicode names and portrait/landscape/square images. All action rectangles
must be reachable and non-overlapping; actual desktop zoom and orientation preserve selections.

### Tests first

- [ ] T005 [P] [US1] Expand the responsive UI contract checks in tests/e2e/accessibility-responsive.spec.ts for all specified width/height/theme combinations and existing screen/state variants, including populated preview/deletion dialogs; assert actual action bounds, no target intersections or clipped labels, accessible full filenames, contain image sizing and scroll access with page overflow clipping disabled as well as document scrollWidth (FR-001–004, SC-001).
- [ ] T006 [P] [US1] Add tests/e2e/responsive-state.spec.ts using tests/integration/locks.ts and existing fixtures to check portrait/landscape resizing before and during a real pending favorite write; verify saved heart/pressed state until release and the view-context constraints: destination — "Preserve during reflow/zoom/orientation changes."; scope — "Existing Random eligibility semantics; independent of Gallery filters."; current — "Random image ID; reconcile against eligible IDs on saved data changes only, not viewport width."; query — "Preserve exact current search input on reflow; existing matching rules unchanged."; favoritesOnly — "Gallery filter; must not determine preview lifetime."; selected — "Preview ID resolves against the complete collection; keep open when filtered out until dismissed or deleted."; deleting — "Existing confirmation context; preserve during resize and pending operation." (FR-005, SC-002).

### Implementation

- [ ] T007 [US1] Fix reproduced header/navigation, uploader, toolbar, empty/error-message and long-action-label sizing/wrapping failures in src/styles.css; preserve current breakpoints as a starting point, allow intrinsic shrinkage and vertical reflow, and make fit independent of overflow-x clipping (depends on T005).
- [ ] T008 [US1] Adjust Gallery grid/caption and Random/preview sizing in src/styles.css so narrow cards retain filenames and room for a future 44px favorite target; reduce columns at the smallest breakpoint where needed, preserve aspect ratios and whole-image object-fit containment, and avoid shrinking actions or stored-name truncation (depends on T007).
- [ ] T009 [US1] Bound preview and deletion dialog height and enable vertical access to every action in src/styles.css; wrap narrow dialog actions and preserve room for visible focus outlines without changing native dialog opening, containment or dismissal (depends on T008).
- [ ] T010 [US1] Resolve only remaining markup-related layout failures in src/components/Uploader.tsx, src/components/Gallery.tsx, src/components/ImageViewer.tsx and src/components/DeleteConfirmation.tsx after T007–T009; preserve accessible full names, separate action targets and native dialog behavior, and record no source change when CSS alone satisfies a surface.
- [ ] T011 [US1] Verify src/App.tsx and src/components/ImageViewer.tsx against T006; fix only reproduced viewport-driven resets/remounts while preserving the quoted view-context constraints and collection-owned pending state, leaving existing state ownership and preview lookup intact when tests pass.
- [ ] T012 [US1] Execute the US1 matrix and resize checks from specs/002-responsive-favorites/quickstart.md, including actual 200% desktop browser zoom from 1280px and short-dialog keyboard scrolling; record per-case results, versions and representative screenshots in specs/002-responsive-favorites/validation-us1.md, explicitly marking unavailable browser/manual cases not run (depends on T005–T011).

**Checkpoint**: US1 can be delivered without the icon refactor. SC-001/002 require observed
results; source changes or authored tests alone do not establish this checkpoint.

## Phase 4: User Story 2 — Recognize the same favorites control everywhere (Priority: P1)

**Goal**: Gallery, inline Random and modal preview share one stable heart and confirmed-save behavior.

**Independent Test**: Seed favorite/non-favorite entries and operate each context through idle,
pending, commit, failure, retry and repeated activation. Same 24px geometry, correct saved state,
consistent results, no unintended opening/deletion and no persistence regression.

### Tests first

- [ ] T013 [P] [US2] Add shared-control UI contract scenarios in tests/e2e/favorite-controls.spec.ts for Gallery, Random and modal preview in both themes: identical 24 × 24 SVG silhouette, outline/filled state independent of color/hover, fixed target position/dimensions through pending, thumbnail activation without opening/deletion, and preserved preview/Random favorites-only outcomes (FR-006/008/011, SC-003/004).
- [ ] T014 [P] [US2] Add tests/integration/pending-favorites.spec.ts covering contracts/favorite-state.md in all three UI contexts using existing native write locks and controlled abort patterns: no duplicate/conflicting same-ID mutation, unrelated images usable, no state before commit, rollback/blob retention, active-view error/retry, pending navigation/resize and stale Retry last action; assert "Outline for false; fill for true; aria-pressed equals this saved value.", "One mutation per image ID; block duplicate/conflicting same-ID actions until settlement; preserve saved state." and "Empty means no current error; failure guidance and retry must be available in the active context; never persisted." (FR-010, SC-004).

### Implementation

- [ ] T015 [US2] Create src/components/FavoriteButton.tsx with image: ImageMetadata, pending: boolean and onToggle callback; render type=button and one local aria-hidden/nonfocusable 24 × 24 SVG path with outline/filled saved state, native disabled, aria-busy, image-specific Favorite/Unfavorite name and saved aria-pressed; own no storage/local favorite cache and enforce "Required; true only for the saved favorite state; change UI state only after transaction completion." (depends on T013/T014 test authoring).
- [ ] T016 [US2] Add scoped favorite-button rules in src/styles.css for a fixed nonshrinking >=44 × 44 target and 24 × 24 SVG; keep outline/fill geometry stable during pending, override inherited disabled opacity to preserve contrast and remove only heart-specific rules made obsolete by the shared control (depends on T015; serialize with US1 CSS tasks).
- [ ] T017 [P] [US2] Replace the Gallery glyph/button duplication with FavoriteButton in src/components/Gallery.tsx; pass each confirmed image and same-ID pending flag, invoke the existing favorite callback and retain a separate thumbnail-opening target (depends on T015–T016).
- [ ] T018 [P] [US2] Replace favorite markup in both inline/modal modes of src/components/ImageViewer.tsx with FavoriteButton, removing redundant decorative labels while preserving the dialog lifecycle, selected image, deletion action and inline modal error/retry guidance (depends on T015–T016).
- [ ] T019 [US2] Fix reproduced retry/current-state failures from T014 in src/App.tsx and, only if the existing guard fails, src/hooks/useCollection.ts; resolve current saved metadata for intended retries, clear stale retry availability after success, preserve active-view failure messages and existing synchronous per-ID lock/commit-only updates, and retain preview lookup against collection.images and Random eligibility reconciliation (depends on T017/T018; preserve passing behavior without speculative refactoring).
- [ ] T020 [US2] Extend tests/e2e/uploads-persistence.spec.ts to verify the retained pre-change same-origin profile and its IDs, complete names, mimeType, size, addedAt, batchId, ordinal, favorite values and readable content survive the update/reload; use all unchanged field constraints quoted in T003, preserve real persistence assertions, and record any unavailable pre-change-profile evidence rather than substituting a fresh profile (FR-014, SC-006).
- [ ] T021 [US2] Run T013/T014/T020 and existing tests/e2e/random-favorites.spec.ts, tests/e2e/gallery-management.spec.ts and tests/integration/storage-favorites.spec.ts; document cross-context pending/commit/abort/retry/filter/last-favorite outcomes and preservation evidence in specs/002-responsive-favorites/validation-us2.md (depends on T015–T020).

**Checkpoint**: US2 is testable at a fixed supported viewport independently of US1 layout edits.
The shared component already includes native accessibility semantics; US3 verifies/refines their
full input, focus, dimension and contrast behavior rather than creating a second control.

## Phase 5: User Story 3 — Operate favorites with touch, keyboard, and assistive technology (Priority: P2)

**Goal**: Every shared favorite control is reachable, understandable and operable across input methods/themes.

**Independent Test**: In all three contexts verify >=44px distinct targets, Enter/Space,
image-specific names/saved pressed state, no decorative announcement, visible unclipped focus
and required contrast. Dismissal restores a surviving focus target after filtered removal.

### Tests first

- [ ] T022 [P] [US3] Expand tests/e2e/accessibility-responsive.spec.ts with favorite UI contract assertions in all three contexts and both themes: actual >=44 × 44 target and nonintersection with adjacent actions, Enter/Space, complete image-specific names and saved aria-pressed, decorative SVG absent from accessible content, visible focus and rendered text/icon/boundary/focus contrast including hover and pending (FR-007/009/013, SC-003/005; depends on US2 integration).
- [ ] T023 [P] [US3] Expand tests/e2e/gallery-management.spec.ts for Close and Escape after favorites-filter removal with surviving-thumbnail and no-result variants, original-opener return when connected, nested deletion Cancel focus and modal containment; assert focus-origin constraint "Return to connected opener, else surviving thumbnail, else focusable Gallery main controls/heading." (FR-012, SC-005; depends on US2 integration).

### Implementation and validation

- [ ] T024 [US3] Correct only failing target/focus/contrast cases from T022 in src/styles.css and native semantic issues in src/components/FavoriteButton.tsx; retain stable 24px heart and >=44px target, visible non-clipped focus, image-specific names, decorative SVG and saved pressed state, with >=4.5:1 normal text and >=3:1 large text/icon/relevant boundary/focus contrast in both themes including pending (depends on T022).
- [ ] T025 [US3] Verify and repair only reproduced T023 failures in src/components/ImageViewer.tsx and src/App.tsx; preserve existing origin/surviving-thumbnail/Gallery-heading fallback, initial Close focus, native containment and nested confirmation return without adding a new focus system or closing a filtered-out preview (depends on T023/T024; record no source change when behavior passes).
- [ ] T026 [US3] Perform the US3 screen-reader and actual Android Chrome/iOS Safari journeys from specs/002-responsive-favorites/quickstart.md, checking touch separation, both themes, orientation, short dialogs, names and state; record device/OS/browser/assistive versions and actual results in specs/002-responsive-favorites/validation-us3.md, distinguishing emulation and unavailable manual checks (depends on T024/T025).
- [ ] T027 [US3] Run the expanded keyboard/focus/dimension/contrast suites and record executed versus not-run cases, screenshots and focus journeys in specs/002-responsive-favorites/validation-us3.md; confirm no redundant names or lost body focus and retain any outstanding manual gate from T026 (depends on T022–T026).

**Checkpoint**: US3 acceptance requires keyboard/focus/contrast results and distinct actual-device/
assistive evidence. Passing emulated geometry does not imply physical-touch or screen-reader completion.

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify the integrated feature and report evidence without broadening scope.

- [ ] T028 Run npm run typecheck, npm test, npm run build and the full npm run test:e2e -- --reporter=json suite through playwright.config.ts; verify Chromium/Firefox/WebKit coverage and existing performance/privacy/upload/search/filter/Random/delete regressions, inspect the final source changes for no new external assets, migration, viewport remount or unnecessary blob loads, and save raw outputs plus actual command/count/version results in specs/002-responsive-favorites/validation.md (depends on all story implementation tasks).
- [ ] T029 Reconcile FR-001–014 and SC-001–006 against specs/002-responsive-favorites/validation-us1.md, specs/002-responsive-favorites/validation-us2.md and specs/002-responsive-favorites/validation-us3.md in specs/002-responsive-favorites/validation.md; include real zoom, pre-change retention, release-browser and physical-device/screen-reader gaps and cross-reference inherited specs/001-random-gallery/validation.md without changing its task completion claims (depends on T012/T021/T027/T028).
- [ ] T030 Update only stale commands/scenario references in specs/002-responsive-favorites/quickstart.md and mark completed entries in specs/002-responsive-favorites/tasks.md only when their stated checks have executed successfully; report concrete blockers and leave unverifiable acceptance tasks unchecked (depends on T029).

## Dependencies & Execution Order

### Phase dependencies

```text
Setup T001 → T002
                ↓
Foundation T003 → T004
                ├── US1 T005–T012 ──────────────┐
                └── US2 T013–T021 → US3 T022–T027 ┤
                                                 ↓
                                  Polish T028 → T029 → T030
```

- All story work depends on T001–T004. No new setup infrastructure is implied.
- Default delivery: US1 (P1) → US2 (P1) → US3 (P2) → final validation. US1/US2 have no
  functional dependency; cross-story edits to src/styles.css, App and ImageViewer must be serialized.
- US3 depends on US2's shared-control integration (T015–T019), but its own independent acceptance
  is the input/focus/contrast journey, not reimplementation of US2 saved-state semantics.
- Within US1: T005/T006 can be authored concurrently; T007→T008→T009→T010, then T011,
  then T012. T011 also needs T006. Re-run tests after relevant edits.
- Within US2: T013/T014 can be authored concurrently; T015→T016→(T017 and T018)→T019.
  T020 can be authored after foundation and the retention fixture is captured; execute its
  post-update assertions after integration. T021 requires all US2 tasks.
- Within US3: T022/T023 can be authored concurrently, followed by T024→T025→T026→T027.
- T028 may run once all implementation tasks are complete; T029 waits for story evidence and
  T028. Do not mark story validation complete if browser/manual prerequisites are unavailable.

### Parallel opportunities and examples

`[P]` means a scheduling opportunity, not automatic agent delegation. Independent test authoring
uses separate files; actual browser executions share a configured port and run serially.

| Story | Concurrent example | Prerequisites and conflicts |
| --- | --- | --- |
| US1 | T005 layout tests in tests/e2e/accessibility-responsive.spec.ts with T006 state tests in tests/e2e/responsive-state.spec.ts | Foundation complete; neither depends on the other's new code. |
| US2 | T013 control-contract tests in tests/e2e/favorite-controls.spec.ts with T014 native operation tests in tests/integration/pending-favorites.spec.ts | Foundation complete; separate test files, reuse existing locks. |
| US2 | T017 Gallery integration with T018 ImageViewer integration | Shared component/styles T015/T016 complete; separate files; serialize against US1 markup work. |
| US3 | T022 input/contrast tests in tests/e2e/accessibility-responsive.spec.ts with T023 focus regressions in tests/e2e/gallery-management.spec.ts | US2 integrated; T005 edits to the accessibility file completed first. |

## Requirement Coverage

| Requirement | Primary implementation/verification tasks |
| --- | --- |
| FR-001 | T005, T007–T010, T012 |
| FR-002 | T005, T008, T012 |
| FR-003 | T003, T005, T008, T010, T015, T022 |
| FR-004 | T005, T009, T010, T012, T023 |
| FR-005 | T006, T011, T012, T014 |
| FR-006 | T013, T015–T018, T021 |
| FR-007 | T016, T022, T024, T026 |
| FR-008 | T013–T016, T021, T024 |
| FR-009 | T015, T022, T024, T026, T027 |
| FR-010 | T014, T015, T019, T021 |
| FR-011 | T013, T017–T019, T021, T023 |
| FR-012 | T023, T025, T027 |
| FR-013 | T016, T022, T024, T026, T027 |
| FR-014 | T003, T019–T021, T028, T029 |
| SC-001 | T005, T007–T010, T012 |
| SC-002 | T006, T011, T012 |
| SC-003 | T013, T015–T018, T022, T024, T026, T027 |
| SC-004 | T013, T014, T019, T021 |
| SC-005 | T022–T027 |
| SC-006 | T002, T003, T020, T021, T028, T029 |

## Implementation Strategy

### MVP first

Complete Setup and Foundation, then US1. Validate the full responsive state matrix and actual
200% zoom before declaring that increment accepted. No favorite icon change is needed for this MVP.
If browser/manual checks cannot run, retain a concrete implementation candidate with unchecked
acceptance tasks and exact blockers rather than claiming the MVP is validated.

### Incremental delivery

Add US2's shared heart and transaction-bound feedback, validate independently at a stable viewport,
then add US3's comprehensive input/focus/contrast checks and minimal necessary corrections.
Run integrated regression and reconcile all evidence last. Preserve the original feature's
unfinished work and do not silently absorb it into this feature.

### Scope and completion notes

There are no new entities, endpoints, storage fields or migrations to implement. Model field
constraints are quoted in T003, control-state constraints in T014/T015, and view-context constraints
in T006/T023. Implement behavior only where contract tests demonstrate missing work; passing
existing behavior needs verification, not a speculative rewrite. No commit, deployment or
external publication is required. This file contains 30 tasks: 8 US1, 9 US2, 6 US3 and 7 shared.
