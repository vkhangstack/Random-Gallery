# Quickstart: Validate Fixed Favorites Icon Size — 24px Revision

**Updated**: 2026-10-27

The 24px icon revision is implemented and verified by the current revision results
below. The 46px clickable target and existing Favorites behavior are retained.

## Prerequisites and setup

Use Node.js >=24 and the repository's existing Playwright configuration. From the
repository root, install locked dependencies if missing:

```sh
npm ci
```

If the configured browsers are missing:

```sh
npx playwright install chromium firefox webkit
```

Use fresh guest browser profiles for local persistence scenarios. No API or account
setup is required for these UI checks. Avoid an existing service on port 4173;
Playwright builds and starts its own preview server there.

## Reproduce before implementation

Update the existing `tests/e2e/favorites-size.spec.ts` before production CSS: expect
24px icon width/height, retain minimum 44px target checks, use measured dimensions
for containment, and assert horizontal/vertical centering. Reuse the existing fixture
and state coverage. Run against the current implementation and record the 44px actual
versus 24px expected mismatch before editing production styles. Failures must come
from the revised measurements, not browser dependencies or server setup. The planning
command does not change this test or the production CSS.

```sh
npx playwright test tests/e2e/favorites-size.spec.ts --project=chromium
```

## Validate after implementation

```sh
npx playwright test tests/e2e/favorites-size.spec.ts
npx playwright test tests/e2e/random-favorites.spec.ts tests/e2e/gallery-management.spec.ts tests/e2e/responsive-state.spec.ts tests/e2e/accessibility-responsive.spec.ts tests/e2e/privacy-storage-failures.spec.ts
npm run build
```

The default projects run Chromium, Firefox and WebKit. Build performs the TypeScript
check as well as the production build. Backend checks are unnecessary for this
frontend-only size change unless implementation scope changes.

## Scenario matrix and expected outcomes

1. At each width 320, 375, 768, 1440 and in both themes, upload a long-named valid image
   using `upload(...)` from `tests/fixtures/images.ts`. Wait for the image to finish
   loading before taking measurements. Use all-images scope and no favorites filter.
2. In Random, Gallery and preview, measure the icon span and containing button in
   inactive, active, then inactive states. Every icon measures 24 × 24 and is centered on both axes in the existing
   46 × 46 target, which remains above the 44 × 44 minimum. Its full box fits within
   the target. Button size, icon center, and nearby filename/action
   rectangles remain unchanged within each view after successful toggles. Use
   `aria-pressed` to await completed changes rather than fixed sleeps.
3. At 320px, check that long filenames yield space to the icon, that the icon stays
   fully visible, and that its target overlaps neither the thumbnail nor Delete.
   Check visible heart strokes in every engine; a correct wrapper size alone must
   not hide a clipped glyph. Compare measurements at fixed scroll position and use
   the tolerance documented in the UI contract.
4. Use Enter and Space to toggle favorites in each view; verify pressed state,
   image-specific action names, focus indication, and persistence after reload.
   Confirm existing favorites-only behavior, including last-favorite removal.
5. For pending geometry in each view, first wait for image reads to finish, then use
   `holdStorageWrites(page)` from `tests/integration/locks.ts`. Toggle and assert the
   control is disabled with prior state and fixed icon geometry. Release the lock in
   `finally`; await completion and check final geometry.
6. For failed writes in each view, adapt the temporary `IDBObjectStore.prototype.put`
   failure in `privacy-storage-failures.spec.ts`. Save and restore the original method
   in `finally`. Verify prior state, icon dimensions and existing error feedback;
   restore writes and retry successfully. Do not require global vertical positions
   to stay unchanged when a surrounding error message is inserted.

For manual visual inspection:

```sh
npm run dev -- --host 127.0.0.1
```

Open the printed local URL at normal zoom and repeat the state transitions in all
three views. See [UI contract](contracts/favorites-icon.md) for exact presentation
invariants and [data model](data-model.md) for the unchanged state lifecycle.

Record browser results and any pre-existing failures during implementation. Passing
planning checks alone does not establish that the feature is implemented.

## Current revision evidence (2026-10-27)

- Setup: Node v24.16.0, dependencies and Chromium/Firefox/WebKit already installed; port 4173 available. Git/Docker ignore patterns cover existing outputs and credentials; no changes needed. Baseline icon is 44px and containing target is 46px.
- Regression helper updated to expect 24px icons, retain minimum 44px target assertions, use measured dimensions for containment and verify centering on both axes. Existing behavior coverage retained.

- Pre-change regression: Chromium 320px light fails at the new width assertion with a 20px difference (actual 44px versus expected 24px), before production CSS changed.
- Implementation: changed only favorite-icon width, height, font-size and line-height to 24px. Existing centered 46px target, markup and behavior retained.

- Focused revised regression: 42/42 pass across Chromium, Firefox and WebKit (38.3s), with 24px dimensions, minimum target size and centering checks throughout the existing matrix.

- Retained behavior suites: 97/102 pass (43.8s). The same five baseline failures remain: accessibility-responsive.spec.ts:101 in light/dark on Chromium and WebKit, plus gallery-management.spec.ts:119 on WebKit. Their assertions match the previously documented baseline; no new failures appeared.
- npm run build passes, including TypeScript checking and the production build.
- Visual review: inspected all 36 current 320px button screenshots across three views, two states, two themes and three engines. Heart strokes remain visible and unclipped inside centered 24px boxes; Unicode painted extents can still vary by state/browser as allowed by A-002. Screenshots were preserved at /private/tmp/favorites-24-visual before the retained-behavior suite cleared test-results/.
- Scope review: production diff contains only the four requested favorite-icon CSS values; test diff updates dimensions/containment and adds two center checks. Existing component markup, target size, handlers, storage and configuration are unchanged. git diff --check passes. All seven revision tasks completed; the requirements checklist and historical evidence were left unchanged.

## Historical execution evidence — 44px revision (2026-10-26)

The following entries record the prior implementation and remain unchanged as history.

- Setup: Node v24.16.0, locked dependencies and all three Playwright browsers already installed. Port 4173 available. Git/Docker ignore patterns verified; no additions needed.
- Pre-fix regression: Chromium 320px light fails because the fixed favorite-icon wrapper is absent; production markup/styles were unchanged for this run. Stopped after the first failure. Initial sandbox run could not bind port 4173 (EPERM); rerun with approved elevated Playwright execution reached the application and reproduced the defect.
- Production change: two existing render sites use the shared 44px icon wrapper and nonshrinking 46px bordered target; handlers and state logic retained.
- Focused regression: 42/42 pass on Chromium, Firefox and WebKit (41.8s). Covers all three views, four widths, both themes, pointer/keyboard transitions, reload persistence, pending and failed writes. At 320px the existing state eyebrow wrapped differently by state; single-line truncation now preserves caption geometry. Focus is checked in keyboard modality before activation because the existing pending disabled behavior can clear native focus.
- Existing behavior suites: 97/102 pass. Five focus-related failures: accessibility-responsive.spec.ts:101 in light/dark on Chromium and WebKit, plus gallery-management.spec.ts:119 on WebKit. All five reproduce with the same assertions in an isolated pre-change copy at /private/tmp/favorites-baseline-check (targeted baseline run: 1 pass, 5 failures). No unrelated focus behavior was changed for this feature.
- Build: npm run build passes, including TypeScript checking and the Vite production build.
- Guest-only runs emit the existing /api/auth/session connection warning when the API is absent; guest upload and favorite checks still execute successfully.
- Final visual verification: reran the 320px cases on all three engines, 6/6 pass. Inspected all 36 saved button screenshots (three views × two states × two themes × three engines): heart strokes are visible without clipping. Existing Unicode glyph shapes and painted extents differ by browser/state, while every icon display box remains 44 × 44 as specified. Screenshots are generated under test-results/ by the focused spec.
- Final scope review: production edits are limited to the two Favorites render sites, shared fixed geometry, and the viewer state eyebrow truncation needed to avoid state-driven wrapping at 320px. No handlers, storage, server, dependencies, or unrelated controls changed. Final TypeScript check passes after adding screenshot output paths.
- Implementation complete: all 10 tasks executed. The five independently reproduced pre-existing focus failures remain outside this icon-size change.
