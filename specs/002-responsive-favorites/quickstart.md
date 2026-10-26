# Quickstart Validation: Responsive Layout and Favorites Controls

This guide describes checks to run during implementation; no runtime result is claimed by the
planning workflow. See [plan](plan.md), [UI contract](contracts/user-interface.md),
[favorite state contract](contracts/favorite-state.md) and [data model](data-model.md).

## Prerequisites and setup

- Node >=24, npm and repository dependencies. Preserve package-lock.json; use `npm ci` only if
  dependencies are absent. No additional package is planned.
- Playwright Chromium/Firefox/WebKit binaries and permission to start localhost and browsers.
  If binaries are missing in an unrestricted environment, use `npx playwright install chromium firefox webkit`.
- Genuine fixtures in tests/fixtures: landscape.png, portrait.jpg, square.webp. Use existing
  upload helpers and include long spaced/unbroken/non-Latin filenames and a deliberately corrupt file.
- A disposable browser profile for normal scenarios. Separately retain a pre-change seeded
  profile for migration-free data preservation; do not clear its site storage.

From the repository root:

```sh
npm run typecheck
npm test
npm run build
npm run dev -- --host 127.0.0.1
```

Open the printed localhost address for manual checks. Stop that server before any full browser
run if it conflicts with the configured preview. Playwright itself builds/starts preview on
127.0.0.1:4173 and requires that port to be free; no separate preview command is needed.

## Automated validation commands

First capture the existing relevant suite before modifying source. Reproduce applicable bugs
with regression assertions; implement fixes, then re-run the targeted suite. The proposed
favorite-controls.spec.ts is written during implementation, so its command is not runnable yet.

```sh
npm run test:e2e -- tests/e2e/accessibility-responsive.spec.ts tests/e2e/gallery-management.spec.ts tests/e2e/random-favorites.spec.ts tests/integration/pending-uploads.spec.ts tests/integration/storage-favorites.spec.ts
npm run test:e2e -- tests/e2e/favorite-controls.spec.ts
npm run test:e2e -- --reporter=json
```

Expected after implementation: zero failing assertions; retain baseline unit/build checks and
all existing browser assertions. The final command covers configured Chromium/Firefox/WebKit
projects and preservation/privacy tests. Test discovery is not execution evidence. Use existing
transaction locks/abort patterns for pending/failure checks, with no production debug API.

## US1 — Responsive collection (SC-001/002)

1. For widths **320, 375, 414, 768, 1440** and heights **320, 800**, in **both themes**, inspect
   navigation, uploader, Random, Gallery, preview and deletion confirmation. Cover empty,
   populated, collection loading, upload processing, upload failure, favorite pending/failure,
   read error, zero favorites and no search results. Suspend native writes for deterministic
   processing/pending checks rather than relying on timing.
2. Include all three image aspect ratios and long spaced/unbroken/non-Latin filenames/messages.
   Confirm proportions, whole-image Random/preview, accessible full names, reachable actions,
   zero overlapping action rectangles and no horizontal scrolling. Compare action/descendant
   bounds to containers and viewport; temporarily disable page overflow clipping to expose hidden
   defects. Allow deliberate caption text truncation while checking complete accessible names.
3. At height 320 open preview and nested deletion confirmation. Tab and Shift+Tab through each
   modal; scroll to every action and inspect its focus outline. Close/Escape must work, and
   confirmation cancel must return focus to preview Delete.
4. Set query/filter/scope, open a preview, hold a favorite write and resize portrait to landscape
   and back. Verify selection and input state unchanged, saved pressed state unchanged while
   pending, then release and confirm exactly one commit. A CSS-only layout change cannot reset state.
5. Manually use actual desktop browser zoom **200% from a 1280px viewport**. Verify reflow and
   all primary actions, then reset zoom. A 640px emulated viewport is supplementary, and
   deviceScaleFactor is not a substitute for this check.

**Pass**: Every specified matrix case fits without hidden/unreachable actions; dialog scrolling
works; reflow and zoom preserve state. Record screenshots for representative widths/states and
failures, with actual browser versions. Mark missing combinations not run.

## US2 — Consistent saved state (SC-003/004/006)

1. Seed favorite and non-favorite entries. Inspect Gallery, inline Random and modal preview.
   Assert the SVG box is exactly 24 × 24 CSS pixels and geometry matches in all contexts;
   false uses outline, true fill. The same control retains its position and dimensions while pending.
2. In each context hold a genuine storage write, activate once, and attempt repeated/conflicting
   actions. Confirm old heart/pressed state, disabled control/aria-busy, no duplicate request,
   and unrelated-image usability. Release the lock; await committed state across views and refresh.
3. Inject an aborted favorite write in each context. Verify prior saved state and collection
   remain intact, actionable error is available in the active view (inside modal when open),
   and retry succeeds after removing injection. Verify stale Retry last action cannot reverse
   an already-confirmed choice. Restore patched APIs between cases.
4. Under Gallery favorites filter, remove a favorite in preview: the result disappears but modal
   stays open. Under Random favorites scope remove its last favorite: show favorites empty
   guidance; with alternatives show an eligible image. Favorite on a thumbnail opens/deletes nothing.
5. Reopen the pre-change browser profile at the same origin after the update: IDs, names,
   counts, favorite flags and readable image content remain intact without migration. Run
   existing search/filter, 100-shuffle non-repeat, deletion-confirmation and privacy regressions.

**Pass**: No false saved indication, duplicate same-ID mutation, unintended action or lost data.
Record native commit/abort evidence rather than only UI mock results.

## US3 — Input, focus and contrast (SC-003/005)

1. Measure every favorite target >=44 × 44 CSS pixels in both themes and narrow/wide views;
   verify no target intersection with thumbnail opening, deletion or neighboring favorite buttons.
2. Tab to each enabled favorite button; operate with Enter and Space. Verify visible focus,
   image-specific Favorite/Unfavorite name, saved aria-pressed and no decorative SVG announcement.
   Inspect the accessibility tree and perform a screen-reader smoke check with recorded software.
3. Open a favorites-only preview by keyboard; unfavorite its image and dismiss with Close and
   separately Escape. With another filtered thumbnail, focus returns there; with none, focus
   returns to Gallery main controls/heading. With the original still present, return to it.
   Check nested confirmation containment and Cancel focus as part of this journey.
4. Check light/dark normal-text contrast >=4.5:1 and large text/icon/relevant boundary/focus
   contrast >=3:1 against actual adjacent surfaces. Include enabled, hover, focus and pending
   presentations; source-token calculations alone do not establish rendered contrast.
5. On actual Android Chrome and iOS Safari, check target separation, orientation changes and
   short-dialog scrolling. Emulated touch is supplemental evidence, not a physical-device pass.

**Pass**: Full keyboard journeys succeed with meaningful state/name, valid return focus and
required dimensions/contrast in both themes. Record actual device/OS/browser/assistive versions.

## Evidence and inherited limitations

During implementation, record commands, environment, pass/fail/skipped/not-run counts, matrix
coverage, traces/screenshots and manual outcomes in this feature's validation.md. That evidence
file is not generated as a passing report during planning. Keep inherited open tasks under
feature 001 and cross-reference its [validation record](../001-random-gallery/validation.md).

That record reports historical localhost EPERM, browser startup permission denial, unavailable
component tooling/binaries, and missing physical/manual evidence. Reassess only when executing
checks; do not assume those conditions changed or claim they are resolved. If blocked, report
the exact command/error and not-run cases. Build/unit success, test discovery and viewport
emulation cannot establish browser, real zoom, screen-reader or physical-device acceptance.
