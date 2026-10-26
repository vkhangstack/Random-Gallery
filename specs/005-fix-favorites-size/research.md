# Research: Fixed Favorites Icon Size — 24px Revision

**Updated**: 2026-10-27

## Resize the existing icon

**Decision**: Change only width, height, font-size and line-height of `.favorite-icon`
in `src/styles.css` from 44px to 24px. Preserve centered flex contents and no shrinking.

**Rationale**: Both `src/components/Gallery.tsx` and `src/components/ImageViewer.tsx`
already have the shared decorative span and native button. Random and preview share
the viewer. No markup change is needed for the revised spec.

**Alternatives considered**: Changing only font size leaves the display box at 44px.
New wrappers, a reusable component, SVG replacement, or a dependency would add scope.
Keep the established Unicode hearts; their painted extents can differ within the
fixed box, as documented in spec assumption A-002.

## Retain the existing clickable target

**Decision**: Keep `.favorite-button` at 46 × 46 CSS pixels, zero padding, 1px border,
centered flex alignment and no shrinking. Center the 24px icon in its 44px inner area.

**Rationale**: FR-005 requires a target of at least 44 × 44, not exactly that size.
The existing 46px target already satisfies this and preserves surrounding layout.
The smaller centered icon leaves 10px on each side inside the border.

**Alternatives considered**: Shrinking the button to 44px is unnecessary; shrinking
it to 24px would violate the minimum target requirement. Removing previous responsive
caption stabilization is unrelated to reducing the icon.

## Reuse and revise geometry regression

**Decision**: Update `tests/e2e/favorites-size.spec.ts` to expect a 24 × 24 icon while
retaining minimum 44 × 44 button assertions. Replace the two `+ 44` icon containment
calculations with measured icon width/height. Add horizontal and vertical center
comparisons with the existing 0.1 CSS pixel tolerance.

**Rationale**: The current test helper explicitly measures the 44px icon and would
otherwise keep passing the superseded size. Containment alone cannot prove centering,
which FR-005 now specifies explicitly. The shared helper reaches all three views,
both themes, four widths, and pending/failed states without another test harness.

**Alternatives considered**: A global 44-to-24 replacement would weaken the minimum
target assertions. A new test suite would duplicate the existing 42 browser cases.
Keep current keyboard, persistence, filtering and failure coverage.

## Validation history

**Decision**: Preserve 2026-10-26 evidence as historical results for the 44px revision;
record fresh results for the 24px revision during implementation.

**Rationale**: Earlier focused tests passed 42/42, but they asserted the old size.
Five existing focus failures were independently reproduced in a pre-change copy.
Those results describe the prior run and cannot certify this revision.

**Alternatives considered**: Rewriting historical measurements would misrepresent
execution evidence. Fixing unrelated dialog focus behavior expands this request.

Repository inspection resolves all design questions. No new technology or integration
is introduced, so no external research is needed. Implementation/tests are unchanged
by this planning step.
