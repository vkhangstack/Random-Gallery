# Historical Tasks: Fixed Favorites Icon Size — 44px Revision

**Input**: Design documents from `specs/005-fix-favorites-size/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/favorites-icon.md`, `quickstart.md`

**Tests**: Include the browser regression prescribed by the implementation plan and
quickstart, covering the spec's acceptance scenarios and measurable outcomes. The
project constitution requires a reproducing regression before this bug fix.

**Organization**: One user story, US1 (P1), delivers the complete requested change.
Completion is tracked below; execution evidence is recorded in `quickstart.md`.

## Format: `[ID] [P?] [Story] Description`

- `[P]` marks independent file edits that can run together once their shared prerequisite is complete.
- `[US1]` maps to the single user story in `spec.md`.
- Paths are relative to the repository root. Preserve surrounding conventions and unrelated work.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the existing environment without changing dependencies.

- [X] T001 Verify Node.js >=24, installed locked dependencies and Chromium/Firefox/WebKit availability using `package.json` and `playwright.config.ts`; follow conditional installation commands in `specs/005-fix-favorites-size/quickstart.md` only if needed, confirm port 4173 is available, and record environment blockers in that guide.

## Phase 2: Foundational (Blocking Prerequisites)

No new foundational code is needed. Existing native buttons, ImageMetadata.favorite,
collection mutations, storage adapters, upload fixtures, and storage-lock helper
already support US1. Reuse these without schema, service, API, or configuration work.
Phase 1 completion is the only prerequisite for the story regression.

## Phase 3: User Story 1 - Toggle favorites without changing icon size (Priority: P1) — MVP

**Goal**: Keep the icon display box 44 × 44 CSS pixels in active/inactive states
across Gallery, Random and preview, without shifts caused by changing heart metrics.

**Independent Test**: In each view at widths 320/375/768/1440 and in both themes,
complete inactive → active → inactive. Measure the icon and containing button,
compare icon centers and neighboring rectangles within that view, and verify the
saved state and input behavior. Cover pending/failure geometry and long filenames.

### Regression before production changes

- [X] T002 [US1] Create `tests/e2e/favorites-size.spec.ts` using `upload` from `tests/fixtures/images.ts`: cover Gallery, Random and preview at widths 320/375/768/1440 in light/dark themes; assert the contract in `specs/005-fix-favorites-size/contracts/favorites-icon.md`, including separate 44 × 44 icon measurements, target containment, unchanged centers and neighboring filename/action rectangles across inactive → active → inactive with at most 0.1 CSS pixel tolerance, and no clipping/adjacent-target overlap with long filenames at 320px. Wait for loaded images, keep viewport/scroll fixed and filters off for geometry comparisons; verify outlined/filled characters, image-specific action names, aria-pressed, Enter/Space activation, visible focus, and saved state after reload in each view. Add pending checks using `tests/integration/locks.ts` after image reads finish and failed-write checks adapted from `tests/e2e/privacy-storage-failures.spec.ts`; release locks and restore the original put method in finally blocks, assert prior saved state and 44 × 44 dimensions, then verify successful retry. Do not compare global vertical positions across newly inserted error messages or removal from filtered results.
- [X] T003 [US1] Run `npx playwright test tests/e2e/favorites-size.spec.ts --project=chromium` before editing production files and record the reproducing geometry failure in `specs/005-fix-favorites-size/quickstart.md`; distinguish missing icon wrappers or incorrect dimensions from browser/server setup failures.

### Implementation

- [X] T004 [P] [US1] In `src/components/Gallery.tsx`, add the shared favorite-button class to the existing favorite button and wrap its existing ♥/♡ character in a favorite-icon span with aria-hidden="true"; retain the handler, optional rendering, image-specific aria-label, aria-pressed and disabled behavior.
- [X] T005 [P] [US1] In `src/components/ImageViewer.tsx`, add favorite-button alongside the existing icon-button class and favorite-icon to the existing decorative heart span for both Random and preview; retain the sr-only label, all handlers, aria-label, aria-pressed, disabled behavior, dialog behavior and Delete action.
- [X] T006 [P] [US1] In `src/styles.css`, give favorite-icon an exactly 44 × 44 CSS pixel centered box with explicit 44px font size/line height and no shrinking; give favorite-button a nonshrinking centered 46 × 46 border box with zero padding and a 1px border so its inner area contains the entire icon. Ensure scoped selectors win over the existing Gallery/viewer font and padding rules, including the max-width 420px override; retain existing surface/border colors, active color, focus outline and disabled appearance. Adjust only directly affected caption sizing if required to prevent long filenames from clipping or overlapping the control.

### Story validation

- [X] T007 [US1] After T004–T006, run `npx playwright test tests/e2e/favorites-size.spec.ts` using the Chromium/Firefox/WebKit projects in `playwright.config.ts`; resolve feature-related failures within the scoped component/style/test files and record actual matrix results in `specs/005-fix-favorites-size/quickstart.md` without weakening the contract assertions.

**Checkpoint**: US1 is independently functional once the focused geometry, state,
pending/failure, persistence and keyboard checks pass. This is the complete MVP;
there are no additional user stories or data-model implementation tasks.

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Verify preserved behavior and document actual results.

- [X] T008 Run the existing `tests/e2e/random-favorites.spec.ts`, `tests/e2e/gallery-management.spec.ts`, `tests/e2e/responsive-state.spec.ts`, `tests/e2e/accessibility-responsive.spec.ts` and `tests/e2e/privacy-storage-failures.spec.ts` together with `npx playwright test` across the configured engines; confirm filtering, last-favorite empty states, preview behavior, keyboard/focus and failure handling remain intact, and record results or pre-existing failures in `specs/005-fix-favorites-size/quickstart.md`.
- [X] T009 Run `npm run build` as defined in `package.json` to complete TypeScript checking and the production build; record the outcome in `specs/005-fix-favorites-size/quickstart.md` and resolve errors introduced by this feature.
- [X] T010 Follow the visual inspection steps in `specs/005-fix-favorites-size/quickstart.md` to check visible heart strokes in all three browser engines, both states and themes, especially long filenames at 320px; record findings, then review changes in `src/components/Gallery.tsx`, `src/components/ImageViewer.tsx`, `src/styles.css` and `tests/e2e/favorites-size.spec.ts` for scope, retained accessible behavior, and unnecessary code. Update validation evidence in the guide and mark completed entries in `specs/005-fix-favorites-size/tasks.md` only after their checks pass.

## Dependencies & Execution Order

```text
T001 → T002 → T003 → { T004, T005, T006 } → T007 → T008 → T009 → T010
```

- Phase 1 precedes the existing-foundation checkpoint; no new infrastructure blocks US1.
- US1 has no other story dependencies. Its regression must reproduce before production edits.
- T004, T005 and T006 share completed prerequisite T003 and edit different files.
- T007 requires all three production edits. T008–T010 follow successful story validation.
- Execute browser commands sequentially: the configured web server uses the same port 4173.
- Keep validation evidence updates sequential because they share quickstart.md.

## Parallel Example: User Story 1

After T003 has recorded a genuine pre-fix failure, the independent edits are:

```text
T004: Update Gallery favorite markup in src/components/Gallery.tsx.
T005: Update Random/preview favorite markup in src/components/ImageViewer.tsx.
T006: Define fixed geometry in src/styles.css using the agreed shared classes.
```

Integrate all three before T007. Parallel markers describe available scheduling;
they do not require additional agents or simultaneous browser servers.

## Requirement Coverage

| Requirement / outcome | Tasks |
| --- | --- |
| FR-001, SC-001: fixed icon dimensions across views, widths and themes | T002–T007 |
| FR-002, SC-002: stable centers and neighboring content | T002, T003, T006, T007 |
| FR-003: outline/fill state distinction | T002, T004, T005, T007, T010 |
| FR-004, SC-004: pending, failure and narrow/long-name layout | T002, T006, T007, T008, T010 |
| FR-005, SC-003: existing actions, persistence, filtering and accessibility | T002, T004, T005, T007, T008, T010 |

## Implementation Strategy

Complete setup, reproduce the defect, then apply the smallest shared markup/CSS
change. Validate US1 independently before checking the existing behavior suites and
production build. The MVP is all of US1 across all three views; completing only one
render site leaves the story incomplete. Record actual results without claiming
implementation or test success from this task-generation step.

Reuse existing state and persistence. Do not introduce a shared component, SVG
system, dependency, API, migration, or unrelated cleanup for this size correction.
