# HTTP API Contract

## Transport and authentication

Same-origin base path: `/api`. JSON errors have `{ "error": "Actionable message" }` and must not expose SQL, password data, session tokens or another account's existence through image responses. JSON and private image responses use `Cache-Control: no-store` (images additionally `private`) and `X-Content-Type-Options: nosniff`.

Public operation requires HTTPS. Mutation requests must include an Origin equal to configured APP_ORIGIN; otherwise 403. No cross-origin API access is enabled. Browser authentication uses a host-scoped `gallery_session` cookie with HttpOnly, SameSite=Strict, Path=/, Max-Age=604800; Secure is enabled for HTTPS origins. Never accept a caller-selected owner ID as authority.

Cloud clients send `X-Gallery-Account` containing the account ID they expect. If present and different from the session owner, return 401. This is an additional stale-request guard, not authentication. Server sessions remain authoritative. For the Go backend, revalidate the session and expected owner inside the same transaction as the protected write after parsing/decoding. Concurrent logout must be ordered before or after this commit, never between authorization and persistence.

## Endpoints

| Method and path | Request | Successful response | Specific failures |
| --- | --- | --- | --- |
| GET `/health` | None | 200 `{ "ok": true }` after database check | 500 on storage failure |
| GET `/auth/session` | Optional session cookie | 200 `{ "user": { "id", "email" } }` or `{ "user": null }` | 500 if session lookup fails; do not describe a failure as a successful empty account |
| POST `/auth/register` | JSON `{ "email", "password" }` | 200 `{ "user": { "id", "email" } }` and fresh session cookie | 400 invalid details; 409 unavailable account registration; 429 throttled |
| POST `/auth/login` | JSON `{ "email", "password" }` | 200 user and fresh session cookie | 400 invalid shape/length; 401 incorrect credentials; 429 throttled |
| POST `/auth/logout` | Session cookie if present | 200 `{ "ok": true }`, revoke current token and expire cookie | 403 invalid Origin; server failure must not claim successful revocation |
| GET `/images` | Valid session | 200 metadata array in deterministic order | 401 absent/expired/stale-account session |
| POST `/images` | Multipart `metadata` JSON and `file` image bytes | 201 committed metadata | 400 invalid image/metadata; 409 duplicate owner/image ID; 413 oversized request |
| GET `/images/:id/content` | Valid owner session | 200 original bytes with verified media type | 401 session invalid; 404 missing or belongs to another account |
| PATCH `/images/:id` | JSON `{ "favorite": boolean }` and valid owner session | 200 committed metadata | 400 invalid favorite; 401 session invalid; 404 missing/not owned |
| DELETE `/images/:id` | Valid owner session | 200 `{ "ok": true }` after atomic deletion | 401 session invalid; 404 missing/not owned |

Unknown endpoints return 404 to authenticated callers. Unauthenticated private calls return 401 before resource lookup. Do not implement image replacement or expose account/owner query parameters.

## Validation and limits

- Auth JSON bodies: maximum 8192 bytes. Email syntax and maximum 254 characters; password length 12–128 characters.
- Registration and login share fixed 15-minute counters per normalized email and client IP; more than 30 attempts per key returns 429 before password derivation.
- Upload body: at most 10 MiB plus 64 KiB multipart overhead, with nginx allowing an 11 MiB outer request bound. Image bytes themselves must be nonempty and at most 10 MiB.
- Required metadata: UUID `id` and `batchId`, nonempty `name` of at most 1024 characters, nonnegative safe integer `addedAt` and `ordinal`, boolean `favorite`.
- Service derives `size` and `mimeType` from actual bytes and validates JPEG/PNG/WebP decoding with a 40-million-pixel limit. Additional owner or size fields from the caller do not grant privileges or change these values.
- Upload and delete commit content and metadata together. A failed write returns an error and preserves the previous committed collection.
- Go adapters bound concurrent upload buffering/decoding to two requests and password derivations to four; saturation returns retryable 429 before expensive processing. Request cancellation propagates through use cases and SQL.
- Last committed favorite write wins. A second browser must refresh to observe changes.

## Retry semantics

Known failed mutations can be retried explicitly. After a network failure the client cannot assume whether a write committed: refresh the collection before retrying an uncertain upload. Duplicate image IDs return 409; they never replace prior content. This version does not promise exactly-once delivery or automatic offline replay.

## Deployment trust boundary

nginx overwrites X-Real-IP; only nginx is published. The API's throttle may use this header because its network endpoint is internal. If exposing the API directly, revise the trusted-proxy policy before deployment. Never mount the private `/data` volume into nginx's document root.
