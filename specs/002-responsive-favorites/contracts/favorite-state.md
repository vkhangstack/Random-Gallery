# Favorite State and Persistence Contract

Extends [baseline storage contract](../../001-random-gallery/contracts/storage.md).
Owner: src/hooks/useCollection.ts; storage: src/storage/images.ts. No new API or schema.

## Existing persistence boundary

`setFavorite(id: string, favorite: boolean): Promise<ImageMetadata>` updates only the existing
image metadata. It resolves after the IndexedDB transaction completes, with the saved entry.
A rejected or aborted transaction must not publish the requested favorite state or alter its blob.
Database name/version, stores, IDs, filenames, ordering and all other metadata remain intact.

## Observable operation

| Event | Heart / aria-pressed | Availability | Feedback |
| --- | --- | --- | --- |
| Idle | Confirmed saved value | Enabled | Action name describes changing that value. |
| Activate | Prior saved value | Same-ID mutations disabled | Fixed geometry; aria-busy true. |
| Repeated/conflicting activation while pending | Prior saved value | No duplicate favorite/delete request for that ID | Pending continues; unrelated IDs remain usable. |
| Commit | Returned saved value | Re-enabled | Every mounted context derives the same result. |
| Failure/abort | Prior saved value | Re-enabled | Active view shows actionable error and allows retry. |
| Retry | Saved value until commit | Same lock rules | Retry intended change from current saved metadata. |
| Resize/orientation/navigation while pending | Prior saved value | Lock belongs to collection, not button instance | No duplicate request or premature success on remount. |

Use existing synchronous per-ID guard plus rendered pending Set; a disabled button alone is not
the concurrency boundary. No optimistic state or separately cached per-view favorite boolean.
Errors are transient and must not be persisted. A modal error must be available inside the
active dialog; a background alert alone is insufficient. Retry may use the now-enabled favorite
control; existing Retry last action must not act on stale image metadata.

## Derived view outcomes after commit

- Gallery favorite action never opens a preview or triggers deletion.
- Gallery results immediately reflect saved filters. A selected preview remains open even if its
  thumbnail leaves results. On dismissal use the focus fallback in the UI contract.
- Random favorites scope excludes a removed favorite, picks a valid eligible image or displays
  its favorites empty state. Preserve immediate-repeat prevention when alternatives exist.
- Failed changes do not remove an entry from saved favorite eligibility.
- Refresh in the same browser profile retains entries and their saved favorite values. No
  migration, localStorage image metadata, external request or cross-device feature is introduced.

## Verification seams

Use genuine IndexedDB write locks from tests/integration/locks.ts to suspend writes. Assert
pending state before releasing the lock, then await actual commit. Inject controlled aborts at
existing native-storage test seams (storage-favorites.spec.ts pattern), restore patched APIs,
and prove the old state/blob survives. Run these UI journeys in Gallery, Random and preview;
a storage-only test cannot establish all three contexts' feedback and retry behavior. Do not
add production debug globals/endpoints to support testing.
