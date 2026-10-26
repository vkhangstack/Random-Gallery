# Data Model: Random Gallery

## Persistence boundary

IndexedDB database `random-gallery`, version 1. All IDs are generated UUID strings. Blob content
and all collection metadata stay in IndexedDB. No image bytes, base64, filenames, or image IDs
are persisted in localStorage. Each accepted upload is independent, even for identical content.

## ImageMetadata — store `images`, key path `id`

| Field | Type | Rules |
| --- | --- | --- |
| id | string | UUID, unique, immutable |
| name | string | Original filename, preserved and rendered as text |
| mimeType | string | Canonical image/jpeg, image/png, or image/webp from validation |
| size | integer | 1 through 10,485,760 bytes inclusive; equals blob size |
| addedAt | integer | Batch selection time in milliseconds since epoch |
| batchId | string | UUID shared by one batch, used to order simultaneous batches |
| ordinal | integer | Zero-based position in selected batch; preserves tie ordering |
| favorite | boolean | Initially false; changed only after committed update |

Default order: addedAt descending; batchId for deterministic tied batch times; ordinal ascending
within the batch; ID as final deterministic tie breaker. A single active batch avoids concurrent
batch ordering ambiguity. No search/favorites index is needed for the stated 100-image workload.

## ImageBlob — store `blobs`, key path `id`

| Field | Type | Rules |
| --- | --- | --- |
| id | string | Same ID as metadata entry |
| blob | Blob | Original validated content, canonical MIME; never base64 or an object URL |

One-to-one relationship with ImageMetadata. Add/delete operate on both stores in one readwrite
transaction. Favorite updates touch metadata only. If a missing/corrupt blob is encountered, retain
its metadata to support explicit removal/retry; exclude it from selection for this session.

## Theme preference — localStorage

`random-gallery.theme`: `light` or `dark`; absent/invalid means follow device preference.
No other durable localStorage state is required. Catch both read and write exceptions. A failed
write retains the chosen session theme and announces that the preference was not saved.

## Session-only entities

- Collection status: loading, ready, or error with retry; ready with zero entries is distinct
  from inability to read storage.
- Upload batch: batch ID/time, selected file list, current file position, and per-file status
  queued → validating → saving → saved or failed. A saved outcome requires transaction complete.
  Counts derive from per-file outcomes. Files and error details are released when no longer needed.
- Random state: all/favorites scope and current image ID or null; eligibility derives from saved
  metadata minus unreadable IDs. Changing scope never changes Gallery query/filter.
- Gallery state: filename query, favorites filter, and open image ID or null. Opening an image is
  by ID, not result position, so filtering does not unexpectedly replace the inspected image.
- Mutation state: pending IDs and operation/error status. Disable conflicting mutations per ID.
- Unreadable IDs: session set with associated read/decode error; retry removes the exclusion and
  attempts the read again. Distinguish all-unreadable from genuinely empty scope.
- Object URL state: consumer-local URL and image ID; never serialized. Created after successful
  blob read, revoked on replacement/unmount/error; stale read results do not create a URL.

## Validation and transitions

1. File selection → size check → signature/type check → decode → persistence transaction.
   Any failure produces a named per-file result; the next file is still attempted.
2. Metadata+blob committed → publish entry to collection. Abort/error → no new saved entry.
3. Favorite pending → transaction complete → publish new favorite and reconcile scope. Failure →
   retain previous favorite and expose retry. No optimistic saved state is required.
4. Delete requested → confirmation → cancelled (unchanged) or pending → transaction complete →
   remove entry, close its Gallery viewer, and reconcile Random. Failure leaves entry unchanged.
5. Current image becomes deleted/ineligible → choose from remaining eligible IDs, or use the
   appropriate empty/read-error state. One eligible ID remains stable; two or more exclude current.
6. App reopened → load metadata from IndexedDB. Do not restore transient object URLs, queries,
   failures, or current image ID. Data survives only while this origin/profile retains site data.

No schema migrations beyond initial version 1 are required. Future schema changes increment the
IndexedDB version and require migration tests rather than deleting existing collection data.
