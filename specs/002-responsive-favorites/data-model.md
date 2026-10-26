# Data Model: Responsive Layout and Favorites Controls

This feature changes presentation and transient control state. It adds no persistent fields,
stores, indexes, migrations, image transformations or collection structure. Baseline schema:
[001 data model](../001-random-gallery/data-model.md).

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

## Favorite control state — derived/transient

| Value | Source/type | Constraint |
| --- | --- | --- |
| saved favorite | ImageMetadata.favorite, boolean | Outline for false; fill for true; aria-pressed equals this saved value. |
| pending | collection.pending.has(id), boolean | One mutation per image ID; block duplicate/conflicting same-ID actions until settlement; preserve saved state. |
| error | existing collection error, string | Empty means no current error; failure guidance and retry must be available in the active context; never persisted. |

The shared FavoriteButton receives image metadata, pending and onToggle callback. It does not
own these values, call storage, or infer a saved state from pending. No new status enum or per-view
favorite cache is required. SVG geometry and target dimensions are presentation constraints in
[UI contract](contracts/user-interface.md), not database fields.

### State transitions

1. Idle(saved=false/true) + activation: acquire existing per-ID lock; pending=true; saved unchanged.
2. Further same-ID activation while pending: no additional mutation; saved unchanged.
3. Transaction completes: publish returned saved metadata; pending=false; all views derive new state.
4. Transaction fails/aborts: saved unchanged; pending=false; active view provides error and retry.
5. Retry: resolve current saved entry, request the intended change and follow the same boundaries.
6. Resize/orientation/theme change: no transition of mutation or saved state.

Unrelated image IDs remain usable. Existing delete mutation shares the per-ID guard. Error
feedback must not assert successful persistence or discard a record. See
[favorite state contract](contracts/favorite-state.md).

## View context — existing App state

| Value | Type | Constraint |
| --- | --- | --- |
| destination | `random` or `gallery` | Preserve during reflow/zoom/orientation changes. |
| scope | `all` or `favorites` | Existing Random eligibility semantics; independent of Gallery filters. |
| current | string or null | Random image ID; reconcile against eligible IDs on saved data changes only, not viewport width. |
| query | string | Preserve exact current search input on reflow; existing matching rules unchanged. |
| favoritesOnly | boolean | Gallery filter; must not determine preview lifetime. |
| selected | string or null | Preview ID resolves against the complete collection; keep open when filtered out until dismissed or deleted. |
| deleting | ImageMetadata or null | Existing confirmation context; preserve during resize and pending operation. |
| focus origin | HTMLElement or null, transient | Return to connected opener, else surviving thumbnail, else focusable Gallery main controls/heading. |

Image removal still reconciles current/selected/deleting through existing rules. Favorite removal
from Random favorites scope chooses an eligible image or its specific empty state. Removing a
Gallery preview's image from filtered results does not close the preview. Theme persistence stays
at localStorage random-gallery.theme; no image metadata enters localStorage.
