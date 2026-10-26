# User Interface Contract

Applies to existing Random Gallery screens; extends the
[baseline UI contract](../../001-random-gallery/contracts/user-interface.md).
No HTTP API is introduced. Requirements reference [spec.md](../spec.md).

## Responsive surfaces — US1

- Navigation, uploader, Random controls, Gallery search/filter/grid, empty/loading/errors,
  preview and deletion confirmation fit widths 320–1440 CSS pixels. Validate widths 320, 375,
  414, 768, 1440 at heights 320 and 800, in both themes.
- No horizontal page scrolling, overlapping activation targets, clipped action labels or hidden
  primary actions. Vertical scrolling is permitted and expected on short screens.
- Long spaced, unbroken and non-Latin names/messages wrap or truncate within allocated space.
  Full filename remains accessible through image alternatives and action names; truncation never
  mutates metadata. Favorite actions do not shrink to accommodate filenames.
- Gallery adapts column count to usable width and preserves image proportions. Random/preview
  show the entire image using contain sizing; no distortion or cropping.
- Both dialogs fit available width and bound their height to the available viewport, allowing
  vertical scrolling to every control. Focus indicators remain visible, including near scroll edges.
  Opening, Tab/Shift+Tab containment, Escape and nested deletion confirmation retain native behavior.
- Reflow, orientation changes and actual desktop 200% zoom from 1280px preserve destination,
  selected image, query, filter, scope and pending operation. No responsive remount or state reset.
- A passing scrollWidth assertion is insufficient when clipping masks overflowing content.
  Validate action bounds/reachability and inspect with page clipping disabled.

## Shared favorite button — US2 and US3

Proposed public component surface in src/components/FavoriteButton.tsx:

| Prop | Type | Meaning |
| --- | --- | --- |
| image | ImageMetadata | Existing ID/name and confirmed favorite value; not an optimistic copy. |
| pending | boolean | Existing same-image mutation lock; disables activation. |
| onToggle | () => void | Ask parent to change favorite; no storage or local saved state inside button. |

Gallery calls its parent with that image; ImageViewer uses the same control in inline and
modal modes. No context-specific icon geometry, target size, or saved-state semantics.

- Native button, type=button, containing one decorative SVG with a fixed 24 × 24 CSS-pixel box.
  Use the same heart geometry; outlined when unsaved and filled when saved. No font glyphs,
  external image assets, fonts or icon service.
- Target at least 44 × 44 CSS pixels, including while pending, at every breakpoint and theme.
  It must not overlap thumbnail opening, Delete, or another favorite target. Activation changes
  only favorites; no preview-opening, delete action, or navigation side effect.
- Accessible name exactly follows action plus complete filename: `Favorite {name}` when false,
  `Unfavorite {name}` when true. aria-pressed is the confirmed boolean. SVG is aria-hidden and
  nonfocusable, without additional accessible title or duplicate hidden Favorite label.
- Enter and Space operate the native button; Tab focus is visibly indicated. Pending uses native
  disabled and aria-busy, preserves saved aria-pressed and heart geometry, and blocks duplicates.
  Do not replace the heart with a spinner or resize/reposition the target.
- Both themes distinguish state by outline/fill independently of color/hover. Normal text >=4.5:1;
  large text, heart, relevant control boundary and focus indicator >=3:1 against adjacent surfaces.
  Evaluate pending as well as idle state; inherited disabled opacity must not break contrast.
- Mutation success/failure/retry follows [favorite-state.md](favorite-state.md).

## Preview focus and selection

Opening a Gallery thumbnail initially focuses Close in the native modal. Preview ID remains
resolved against the complete collection, so unfavoriting under a favorites-only filter leaves
it open. Closing via Close or Escape returns to the initiating control if connected, otherwise
a surviving thumbnail, otherwise Gallery main controls/the programmatically focusable heading.
Focus must not end on body or an unmounted element. Native modal containment and nested Delete
confirmation must continue working; cancel returns focus to the preview's Delete control.

## Preservation

Keep distinct empty collection, no favorites, no search results and unreadable-image guidance.
Existing data, Random scope/non-repeat, query/filter behavior, refresh persistence, confirmation,
retry and device-only privacy retain baseline outcomes. Cosmetic work does not mark inherited
baseline acceptance checks complete.
