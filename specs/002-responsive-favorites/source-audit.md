# Source-only audit and coverage map

Date: 2026-10-25. T003/T004 source review; not browser acceptance.
The user explicitly authorized independent work despite the T002 startup blocker.

## Persistent field constraints (T003)

Reviewed src/types.ts and src/storage/images.ts against the following unchanged constraints
from data-model.md. This feature introduces no persistent model fields or validation changes.

## Image entry — existing ImageMetadata

Source: src/types.ts; persisted in IndexedDB random-gallery v1, images store, keyed by id.

| Field | Existing type | Constraint for this feature |
| --- | --- | --- |
| id | string | Required; preserve the existing stable ID; do not regenerate on resize or toggle. |
| name | string | Required; preserve the complete original filename, including spaces and Unicode; do not add a length cap or truncate stored data. |
| mimeType | ImageMime | Required; existing enum `image/jpeg`, `image/png`, `image/webp`; unchanged. |
| size | number | Required; existing byte size and baseline upload validation remain unchanged. |
| addedAt | number | Required; existing upload timestamp and ordering remain unchanged. |
| batchId | string | Required; existing upload-batch identity remains unchanged. |
| ordinal | number | Required; existing in-batch ordering remains unchanged. |
| favorite | boolean | Required; true only for the saved favorite state; change UI state only after transaction completion. |

ImageBlob retains its existing id-to-blob relationship in the blobs store. No blob read/write
is introduced by SVG rendering or CSS reflow. Full filenames stay available in accessible button
names and image alternatives even when captions visually shorten them. This feature introduces
no new filename validation or upload constraint.


Source findings: src/types.ts requires all eight ImageMetadata fields; mimeType is the existing
JPEG/PNG/WebP union. Upload constructs UUID, original name, canonical MIME, byte size, batch
time/ID and ordinal in src/hooks/useCollection.ts. Storage opens random-gallery version 1
with images/blobs stores keyed by id. setFavorite spreads the existing entry and changes only
favorite, resolving at transaction completion; useCollection publishes returned metadata only
after that promise. No schema, key or localStorage metadata change is needed. Runtime retention
and abort semantics remain unexecuted and are not established by this audit.

## Context and reproducible gaps (T004)

- App owns destination, Random current/scope, query/favoritesOnly, selected/deleting and theme.
  Its selected preview resolves against collection.images, independently of Gallery results.
  No resize listener or viewport-driven remount is present.
- useCollection owns a synchronous pendingRef guard plus rendered per-ID pending Set, and
  updates favorites only after storage commit. Existing locks.ts can hold native writes;
  storage-favorites.spec.ts injects native transaction aborts. No new production seam is needed.
- ImageViewer stores focus origin and falls back to a surviving .thumbnail or #main h1;
  App makes the heading programmatically focusable. Preserve and validate this behavior.
- Preview renders errors inside the dialog; Random/Gallery use App's background alert.
  App's lastAction retry closure captures an image; retry and overlapping operation behavior
  need a runtime regression before deciding any minimal source correction.
- styles.css applies overflow-x:clip at page level, potentially masking overflow; uses two
  Gallery columns at 320px and nowrap buttons; .viewer has overflow:hidden, and deletion
  lacks an explicit viewport height bound. These are source risks, not observed browser defects.
- Existing responsive cases cover populated 800px heights and only three widths for empty/error
  landscape cases. Add action-rectangle, short-dialog and pending/selection checks rather than
  relying solely on scrollWidth. Existing tests are retained.

## Required matrix

All widths 320, 375, 414, 768, 1440 × heights 320, 800 × light/dark = 20 viewport/theme
combinations per relevant state, repeated for configured Chromium/Firefox/WebKit. Surfaces:
header/nav, uploader, Random, Gallery, preview, nested deletion. States: loading, empty,
populated, upload processing/failure, pending/failed favorite, no favorites, no search results
and unreadable image. Every combination is currently not run. Actual 200% zoom from 1280px,
physical Android/iOS and screen-reader checks remain distinct manual gates.

## Requirement-to-task coverage


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


The mapping identifies planned checks, not passing results. Browser/static discovery evidence
is insufficient for SC-001–006. Keep baseline unfinished tasks in feature 001 unchanged.
