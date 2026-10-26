# Local Storage and Domain Contracts

These are internal application boundaries, not network endpoints. Types refer to
[data-model.md](../data-model.md). No HTTP API or backend is introduced.

## Storage operations

| Operation | Input | Successful result | Failure behavior |
| --- | --- | --- | --- |
| listImages | None | Metadata array, ordered by the documented default | Reject; caller shows collection error with Retry, never empty collection |
| getImageBlob | Image ID | Original Blob | Reject on missing/unreadable entry; retain metadata, allow removal/retry |
| addImage | Validated metadata and Blob with matching ID/size/type | Committed metadata | Roll back both stores; caller reports that file unsaved |
| setFavorite | Image ID and explicit target boolean | Committed updated metadata | Preserve prior saved state; missing ID is an error, not an upsert |
| deleteImage | Image ID | Completion after both records are deleted | Atomic rollback; keep displayed saved state and offer retry |
| closeDatabase | None | Connection released | Used on versionchange and test teardown; reopen lazily on next operation |

- Read/write promises settle once. Write promises resolve only on transaction complete; request
  success followed by transaction abort must reject. Transaction error/abort listeners must be
  installed before requests. Do not await decoding or unrelated asynchronous work in transactions.
- Upgrade to version 1 creates the two stores. A blocked open produces a retryable explanation
  to close other app tabs; existing connections close on versionchange. Do not erase the database.
- Surface operation context and actionable category: unavailable/denied storage, quota, aborted
  operation, missing image, or other read/write failure. Preserve the underlying error for tests
  without exposing implementation details in ordinary user messages.
- There is no fallback storing images in localStorage or presenting volatile memory as saved data.
- Data boundary is the same browser profile and origin, including port during local development.

## Pure selection and filtering

| Function | Contract |
| --- | --- |
| selectRandomImage(eligibleIds, currentId, randomSource?) | Unique eligible IDs in; returns ID or null. Empty → null, single → that ID, otherwise exclude current when present and select floor(randomSource() × candidateCount). Source defaults to Math.random and must return a number in [0,1). No mutation or retry loop. |
| filterImages(metadata, query, favoritesOnly) | Trim query, compare case-insensitive filename substrings, intersect favorite filter, preserve input order and original records, do not mutate input. |
| validateImage(file) | Resolve canonical MIME and original Blob only for nonempty, supported, decodable content ≤10 MiB; otherwise reject with per-file reason and recovery text. Release temporary decode URL on every path. |

Eligibility (scope and session unreadable exclusions) is derived before selection. Gallery query
never participates in Random eligibility. Tests inject random samples for every candidate bucket;
statistical/flaky randomness tests are not required to prove the indexing rule.

## Resource ownership

Each useImageUrl instance owns exactly its created URL, never another consumer's URL. A stale
blob read after image replacement/unmount cannot publish state or create a new URL. Cleanup is
safe under Strict Mode. A URL stays valid while its consumer displays the image; final cleanup
revokes all owned URLs. Validation-created URLs have a separate temporary lifetime.
