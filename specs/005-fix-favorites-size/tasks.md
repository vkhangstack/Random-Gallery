# Tasks: Fixed Favorites Icon Size — 24px Revision

**Input**: Design documents from `specs/005-fix-favorites-size/`
**Updated**: 2026-10-27
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/favorites-icon.md`, `quickstart.md`

**Tests**: Update the existing browser regression as prescribed by the plan and
spec acceptance scenarios. The constitution requires a reproducing regression before
the fix. Reuse existing coverage rather than creating another suite.

**Organization**: One user story, US1 (P1). These seven tasks apply only to
the 24px revision. The previous ten completed tasks are preserved in
[tasks-44px.md](tasks-44px.md); previous execution evidence remains in `quickstart.md`.

## Format: `[ID] [P?] [Story] Description`

- `[US1]` maps to the single story in `spec.md`.
- `[P]` is reserved for independent work in different files with no incomplete prerequisites;
  this revision has no tasks that benefit from parallel execution.
- All file paths are relative to the repository root.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the existing environment and revision baseline.

- [X] T001 Verify Node.js >=24, locked dependencies and Chromium/Firefox/WebKit availability using `package.json` and `playwright.config.ts`; follow conditional setup in `specs/005-fix-favorites-size/quickstart.md` only if needed, confirm port 4173 is available, and verify the existing 44px icon and 46px target in `src/styles.css` before recording current revision setup evidence in that guide.

## Phase 2: Foundational (Blocking Prerequisites)

No new foundational code is required. The existing favorite-icon span and native
favorite-button already cover Gallery, Random and preview. Existing state, storage,
fixtures and mutation controls are reused. Completion of T001 is sufficient to begin
US1; no schema, service, API, dependency or markup task is needed.

## Phase 3: User Story 1 - Toggle favorites without changing icon size (Priority: P1) — MVP

**Goal**: Reduce the icon to 24 × 24 CSS pixels in both favorite states, centered in
the unchanged 46 × 46 button, without movement caused by changing heart metrics.

**Independent Test**: Across Gallery, Random and preview at widths 320/375/768/1440,
in light/dark themes and Chromium/Firefox/WebKit, complete inactive → active → inactive.
Measure a 24 × 24 icon, target at least 44 × 44, containment and equal X/Y centers;
verify stable surrounding geometry, saved state, keyboard operation, pending/failure
behavior and no clipping with long filenames. Floating-point tolerance is at most
0.1 CSS pixel, per the UI contract.

### Regression before production changes

- [X] T002 [US1] Update the shared geometry helper in `tests/e2e/favorites-size.spec.ts`: change icon width/height expectations from 44 to 24 while retaining button minimum assertions at 44; replace hardcoded `icon.x + 44` and `icon.y + 44` with measured icon width/height; add horizontal and vertical icon/button center equality checks with at most 0.1 CSS pixel tolerance. Preserve existing 42-case view/theme/width/browser coverage, unchanged-neighbor checks, target separation, long-name checks, outlined/filled indicators, accessible action names, pointer/Enter/Space activation, focus indication, reload persistence, pending locks and failed-write/retry coverage.
- [X] T003 [US1] Before editing production CSS, run `npx playwright test tests/e2e/favorites-size.spec.ts --project=chromium --grep 'fixed favorites geometry 320px light' --workers=1` and record the expected measured 44px versus required 24px failure in `specs/005-fix-favorites-size/quickstart.md`; separate infrastructure failures from a genuine size mismatch and retain the historical 44px evidence unchanged.

### Implementation

- [X] T004 [US1] In `src/styles.css`, change only `.favorite-icon` width, height, font-size and line-height from 44px to 24px. Keep its centered flex alignment and no shrinking, the existing 46 × 46 favorite-button with zero padding and 1px border, current responsive rules and caption stabilization. Retain the existing markup in `src/components/Gallery.tsx` and `src/components/ImageViewer.tsx`, handlers, accessible state, heart indicators, colors, focus and disabled behavior.

### Story validation

- [X] T005 [US1] Run `npx playwright test tests/e2e/favorites-size.spec.ts --workers=3` using the three configured projects in `playwright.config.ts`; require the existing 42 cases to pass with the revised 24px dimensions and centering assertions, resolve revision-related failures, and record fresh results under the current revision section of `specs/005-fix-favorites-size/quickstart.md` without changing the historical results or weakening the contract.

**Checkpoint**: US1 is independently complete when the focused matrix passes in all
three views. The complete MVP includes this whole story; there are no additional
stories or data-model implementation tasks.

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Confirm retained behavior, build and visible rendering.

- [X] T006 Run the existing `tests/e2e/random-favorites.spec.ts`, `tests/e2e/gallery-management.spec.ts`, `tests/e2e/responsive-state.spec.ts`, `tests/e2e/accessibility-responsive.spec.ts` and `tests/e2e/privacy-storage-failures.spec.ts` together with `npx playwright test` across configured engines, then run `npm run build` from `package.json`. Record actual results in `specs/005-fix-favorites-size/quickstart.md`, distinguishing new regressions from the five historically reproduced focus failures; require no new failures and a passing TypeScript/production build.
- [X] T007 Inspect current 320px screenshots from `tests/e2e/favorites-size.spec.ts` in all three engines, both states and themes, rerunning with `--grep 'fixed favorites geometry 320px'` only if fresh screenshots are needed; confirm visible heart strokes are unclipped and centered, then review `src/styles.css` and `tests/e2e/favorites-size.spec.ts` for the minimal intended diff, unchanged 46px targets and minimum 44px assertions. Record current revision visual/scope evidence in `specs/005-fix-favorites-size/quickstart.md` and mark completed entries in `specs/005-fix-favorites-size/tasks.md` only after their checks pass.

## Dependencies & Execution Order

```text
T001 → T002 → T003 → T004 → T005 → T006 → T007
```

- Setup precedes US1; there is no new foundational work or cross-story dependency.
- T002 and T003 must finish before T004 so the existing 44px implementation reproduces
  the revised requirement failure.
- T005 requires T004. Final checks require successful focused validation.
- Execute browser commands sequentially because their web servers share port 4173.
- Evidence writes share quickstart.md and remain sequential.

## Parallel Example: User Story 1

No safe implementation parallelism is needed for the two-file revision:

```text
Update tests/e2e/favorites-size.spec.ts → reproduce failure → update src/styles.css → run matrix
```

T002 and T004 edit different files but have a deliberate regression-first dependency,
so neither is marked `[P]`. Playwright itself may use its configured workers inside
a single test command; do not start competing preview servers.

## Requirement Coverage

| Requirement / outcome | Tasks |
| --- | --- |
| FR-001, SC-001: 24px icon across views, widths and themes | T002–T005 |
| FR-002, SC-002: stable icon/neighbor geometry | T002, T004, T005 |
| FR-003: outlined/filled state indicators | T002, T004, T005, T007 |
| FR-004, SC-004: pending, failure, narrow layout and long names | T002, T004–T007 |
| FR-005: centered icon, retained minimum 44px target | T002, T004, T005, T007 |
| FR-005, SC-003: retained accessibility, persistence and filtering | T002, T004–T006 |

## Implementation Strategy

Verify setup, update the existing regression, demonstrate the old size mismatch,
then change four CSS values. Complete US1 and its matrix before checking retained
behavior, build and visual output. Keep the existing 46px button rather than resizing
surrounding controls. Preserve historical completion/evidence as the 44px revision;
new completion and results must establish the 24px revision independently.

No component refactor, icon-system replacement, dependency, API, schema or unrelated
focus fix belongs to this change. Task generation itself runs no browser tests and
does not implement the size reduction.
