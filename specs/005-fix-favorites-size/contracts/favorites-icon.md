# UI Contract: Favorites Icon — 24px Revision

**Updated**: 2026-10-27

## Scope

Applies to image favorite actions in Gallery, Random viewer and image preview.
Favorites-only filters and unrelated icons are excluded. No HTTP or storage interface
changes are part of this feature.

## Presentation and interaction

| Surface | Required contract |
| --- | --- |
| Icon | Decorative `favorite-icon` span, exactly 24 × 24 CSS pixels; centered outlined ♡ or filled ♥; no flex shrink |
| Button | Existing native button with `favorite-button` class; at least 44 × 44 CSS pixels, centering the full icon box on both axes; retain 46 × 46 outer size including 1px border |
| Inactive | Outline, `aria-pressed="false"`, existing image-specific Favorite name |
| Active | Fill, `aria-pressed="true"`, existing image-specific Unfavorite name |
| Pending | Existing disabled behavior and prior saved indicator; same geometry |
| Failure | Prior saved indicator, existing error/retry feedback; same icon dimensions |
| Keyboard | Enter/Space activation and existing visible focus remain available |

No state change alters icon dimensions or moves its center or neighboring content
solely because the heart changed. A surrounding error message may affect page layout;
that is distinct from movement caused by different heart metrics. Existing result
removal/empty-state behavior remains applicable after unfavoriting.

## Verification boundary

Measure the icon span independently from the button; a 24px font-size or a target of
at least 44px alone does not meet the icon contract. Check button containment and
centering on both axes, and adjacent-action separation, not only the absence of page overflow.
Containment uses the measured icon width/height; minimum target checks stay at 44px. Test at normal
page zoom, widths 320/375/768/1440, and both themes. Compare geometry with loaded images,
fixed viewport and scroll position; compare within the same view, not between views.
Use a small subpixel measurement tolerance (at most 0.1 CSS pixel) for floating-point
comparison while retaining the exact declared 24px icon dimensions.
