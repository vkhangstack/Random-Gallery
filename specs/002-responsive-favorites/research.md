# Research: Responsive Layout and Favorites Controls

Date: 2026-10-25. Scope: repository-based design research for feature 002.
No upstream version choice or new dependency is required. Package declarations and existing
behavior are established from local source, not assumptions about latest library releases.

## 1. Reuse the implemented architecture

**Decision**: Keep React/TypeScript/Vite, existing CSS/Tailwind integration, native dialogs,
App view context, useCollection mutation ownership, and IndexedDB version 1 unchanged.

**Rationale**: package.json, src/App.tsx, src/hooks/useCollection.ts and src/storage/images.ts
already implement the feature's baseline. useCollection guards mutations with a synchronous
per-ID ref and updates saved metadata only after the storage promise resolves. Storage resolves
on transaction completion. No schema or service change is necessary.

**Alternatives considered**: A state library, router, storage wrapper or migration would add
unrequested scope. Rebuilding baseline infrastructure would duplicate working source and leave
inherited verification gaps unresolved.

## 2. One shared SVG favorite control

**Decision**: Add src/components/FavoriteButton.tsx: native button, image/pending/callback props,
24 × 24 inline SVG, same path for outline and filled state, >=44 × 44 target, native disabled
and aria-busy while pending, saved aria-pressed, image-specific Favorite/Unfavorite name.
SVG is decorative (aria-hidden, nonfocusable); no glyph, SVG title, or redundant hidden label.

**Rationale**: Gallery.tsx uses text hearts and exposes their decorative text; ImageViewer.tsx
hides the heart but repeats a hidden Favorite label. A shared component fixes both and keeps
shape independent of font/OS. It serves three contexts with only two integration points.
Existing global disabled opacity .6 needs a scoped override to retain icon contrast while pending.

**Alternatives considered**: Unicode hearts vary by font; duplicate SVG markup can drift;
an icon library or raster asset adds unnecessary dependencies/assets. No image generation needed.

## 3. Responsive layout and short dialogs

**Decision**: Start with current 420/767/1100-pixel breakpoints; fix content shrinkage, wrapping,
and action spacing. Use one Gallery column at <=420px if needed to accommodate captions and
44px buttons. Bound both dialogs to the viewport with vertical scrolling and focus-ring space.
Do not use viewport-driven remounts or new responsive state.

**Rationale**: styles.css currently keeps two narrow Gallery columns at 320px, applies nowrap
to buttons, and has fixed-row dialog actions. Preview already scrolls; deletion lacks explicit
height/overflow rules. .viewer overflow:hidden can cut focus rings. html/body overflow-x:clip
can mask defects, so checks must inspect action/element bounds with clipping disabled as well
as document scrollWidth. Keep object-fit:contain and accessible full filenames.

**Alternatives considered**: A new navigation/layout framework or complete redesign exceeds
scope. Merely hiding overflow or reducing target sizes violates the observable requirements.

## 4. Preserve state, errors and focus

**Decision**: Preserve collection-confirmed metadata and transient per-image locks. Retain the
previous heart until commit and after failure; expose retry in the active context. Keep selected
preview lookup against all collection.images, not Gallery results. Retain existing native modal
focus handling and test origin/surviving-thumbnail/Gallery-heading fallback.

**Rationale**: App.tsx already derives preview independently from results and reconciles Random
eligibility. ImageViewer.tsx already restores focus to a connected opener, then .thumbnail or
#main h1; the heading is programmatically focusable. Replacing this would be unnecessary.
Background error alerts alone cannot serve an active modal, so preserve its inline error message.
App's stored retry closure captures an image record; any change to retry wiring must resolve
current saved metadata so stale callbacks cannot reverse the intended action.

**Alternatives considered**: Optimistic favorite changes conflict with FR-010. New global error
or focus stores are unjustified unless a reproduced scenario shows current ownership insufficient.
No multi-tab synchronization or persistence of pending/error state is introduced.

## 5. Verification without new tooling

**Decision**: Expand Playwright layout/accessibility coverage and add cross-context favorite
contract scenarios. Reuse tests/integration/locks.ts for pending native writes and existing
transaction-abort injection for deterministic failure. Run existing Node unit, typecheck, build
and browser regression commands. Keep actual zoom, physical touch and screen-reader evidence
separate from automated viewport/engine checks.

**Rationale**: Existing accessibility-responsive.spec.ts tests populated views at height 800,
but short empty/error checks cover only three widths; dialog/pending bounds and full SC matrix
need stronger coverage. Existing pending-uploads.spec.ts tests native locks, and
storage-favorites.spec.ts tests commit/abort. No package installation is needed for this feature.
Baseline validation.md records unexecuted browser/component/manual checks and infrastructure
failures; authored/discovered tests cannot establish acceptance.

**Alternatives considered**: Installing a new runner solely for SVG/CSS assertions is unnecessary.
Viewport resize or deviceScaleFactor alone cannot establish actual desktop browser 200% zoom.
Mock success events cannot prove IndexedDB commit behavior.

## Resolution and gate outcome

Research resolved icon representation, layout approach, state ownership, retry/focus behavior,
platform scope and verification approach. No blocking design unknown remains. Implementation
must collect runtime evidence; historical blockers remain explicit and are not marked resolved.
Constitution gates pass before research and after design; no exception is needed.
