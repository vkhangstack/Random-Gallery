# Implementation Plan: Fixed Favorites Icon Size — 24px Revision

**Branch**: `main` (actual Git branch; setup reports feature identifier `005-fix-favorites-size`) | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Updated feature specification from `specs/005-fix-favorites-size/spec.md`

## Summary

Reduce the existing Favorites icon display box from 44 × 44 to 24 × 24 CSS pixels
in Gallery, Random and preview. Keep the containing button at 46 × 46, satisfying
the minimum 44 × 44 target while preserving surrounding layout. Reuse existing
markup, centering, favorite behavior and browser regression; update size assertions
and explicitly verify centering.

## Technical Context

**Language/Version**: TypeScript ~5.9, TSX and CSS; Node.js >=24.

**Primary Dependencies**: Existing React/React DOM ^19.3, Vite ^8.1, Tailwind CSS ^4.3;
no dependency changes. Version ranges are from repository package.json.

**Storage**: Existing guest IndexedDB and signed-in cloud adapter; unchanged.

**Testing**: Existing Playwright ^1.63 Chromium/Firefox/WebKit projects, existing
`tests/e2e/favorites-size.spec.ts`, TypeScript checking and production build.

**Target Platform**: Existing browser app, normal page zoom; both themes and required
widths 320, 375, 768, 1440 CSS pixels.

**Project Type**: React web application with existing Go API; revision is frontend only.

**Performance Goals**: Zero icon-size or center-position change and zero neighboring
movement caused by favorite state changes; no additional network or storage work.

**Constraints**: Icon exactly 24 × 24; target at least 44 × 44; outlined/filled heart,
centering, no clipping or shrinking, existing accessibility and persistence preserved.
The 2026-10-27 spec revision supersedes the previous 44px icon requirement.

**Scale/Scope**: One stylesheet rule and the existing browser geometry helper.
Two existing component render sites cover three views and need no markup changes.
No new component, API, state, schema or dependency.

## Constitution Check

*GATE: Checked before Phase 0 research and again after Phase 1 design.*

| Principle | Pre-research | Post-design |
| --- | --- | --- |
| I. Think Before Coding | PASS: distinguish requested 24px icon from minimum 44px target | PASS: retain existing 46px target; all measurement and scope decisions resolved |
| II. Simplicity First | PASS: reuse existing controls and tests | PASS: four CSS values and focused geometry assertions; no new abstractions |
| III. Surgical Changes | PASS: limit revision to icon sizing and validation | PASS: preserve markup, button size, state, persistence and unrelated focus behavior |
| IV. Goal-Driven Execution | PASS: revised spec has measurable outcomes | PASS: update regression first, demonstrate 44-versus-24 mismatch, verify matrix and build |

No violations or unresolved design questions remain. These gates assess the design;
new acceptance test results must be collected during implementation.

## Project Structure

### Documentation (this feature)

```text
specs/005-fix-favorites-size/
├── spec.md
├── checklists/requirements.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/favorites-icon.md
└── tasks.md                       # Existing completed tasks for the earlier 44px revision
```

Regenerate revision tasks using `$speckit-tasks` before implementation. Existing
completed tasks are historical and do not establish completion of the 24px revision.
This planning command leaves their completion markers intact.

### Source Code (repository root)

```text
src/
├── styles.css                         # Planned: change only favorite-icon dimensions/type size
└── components/
    ├── Gallery.tsx                    # Existing markup retained
    └── ImageViewer.tsx                # Existing shared Random/preview markup retained

tests/
├── e2e/favorites-size.spec.ts          # Planned: update icon measurements and assert centering
├── e2e/random-favorites.spec.ts
├── e2e/gallery-management.spec.ts
├── e2e/responsive-state.spec.ts
├── e2e/accessibility-responsive.spec.ts
├── e2e/privacy-storage-failures.spec.ts
├── fixtures/images.ts
└── integration/locks.ts
```

**Structure Decision**: Reuse the already implemented shared icon span and button.
Only the stylesheet and existing geometry regression need implementation edits.

## Phase 0: Research Outcome

[research.md](research.md) records why retaining the 46px target is the smallest
change and how to revise the existing measurements without reducing the target
minimum. Local code inspection resolves the design; no new integration is involved.

## Phase 1: Design

1. In `tests/e2e/favorites-size.spec.ts`, change only icon width/height expectations
   from 44 to 24; retain button minimum assertions at 44. Use measured icon dimensions
   for containment instead of hardcoded `+ 44`. Add X/Y center equality checks between
   icon and button with at most 0.1 CSS pixel tolerance. Run a focused case before
   production changes and record the expected mismatch (current icon 44, required 24).
2. In `src/styles.css`, set `.favorite-icon` width, height, font-size and line-height
   to 24px. Retain its flex centering/no shrinking, the 46 × 46 `.favorite-button`,
   zero padding, 1px border, existing markup and responsive caption stabilization.
   The button's 44px inner area centers the 24px icon with 10px space per side.
3. Run the existing full geometry matrix, pending/failure checks and nearby behavior
   suites, then build. Visually inspect updated 320px screenshots in all three engines,
   both states and themes. Preserve historical results, document fresh results, and
   distinguish known baseline focus failures from new failures.

State invariants are in [data-model.md](data-model.md), the UI contract is in
[contracts/favorites-icon.md](contracts/favorites-icon.md), and runnable validation
is in [quickstart.md](quickstart.md). The 24px revision is planned, not yet implemented.
