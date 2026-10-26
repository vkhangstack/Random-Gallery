# Data Model: Account Collections

## User account (`users`)

- `id`: server-generated UUID, primary key; immutable ownership identity.
- `email`: trimmed/lowercased, valid address syntax, maximum 254 characters, unique.
- `salt`: random 16-byte salt represented as hex.
- `password`: 64-byte scrypt-derived key; never returned to clients.
- Submitted passwords are 12–128 characters. Original passwords are never stored or logged.
- An account owns many sessions and images. No account deletion/recovery lifecycle is introduced.

## Session (`sessions`)

- `token`: SHA-256 digest of a random 32-byte bearer token, primary key.
- `user_id`: foreign key to `users.id`.
- `expires`: absolute server timestamp in milliseconds; seven days after creation.
- Browser receives the token only as an HttpOnly, SameSite=Strict, host-scoped cookie, Secure under HTTPS.
- Transitions: absent → active on register/login; active → revoked on logout; active → expired by time.
- Every private API request must resolve a nonexpired session. Writes that await request/decode work recheck it before commit.
- Authentication starts a fresh session token. Expired records can be pruned on session creation.

## Image (`images`)

- `id`: client-generated UUID; composite primary key with `user_id`.
- `user_id`: foreign key to the owner; always supplied by authenticated server logic.
- `metadata`: serialized, validated image metadata:
  - `id`: same image UUID.
  - `name`: nonempty original display name, at most 1024 characters; never a filesystem path.
  - `mimeType`: derived from decoded bytes; JPEG, PNG, or WebP only.
  - `size`: actual content bytes; 1 byte–10 MiB.
  - `addedAt`: nonnegative safe-integer timestamp.
  - `batchId`: UUID for stable upload ordering.
  - `ordinal`: nonnegative safe integer within a batch.
  - `favorite`: boolean; updated only on successful commit.
- `content`: original image bytes in a BLOB, private to the owner. Decode must succeed within the 40-million-pixel bound before storage.
- Ordering: descending addedAt, then batchId, ordinal and ID to make ties deterministic.
- Atomicity: content and metadata are inserted/deleted together. Duplicate `(user_id,id)` is a conflict; no upsert replaces existing bytes.
- Transitions: client queued → validating → remote pending → committed or failed. Favorite changes preserve the previous confirmed value until success. Delete removes metadata and content in a single commit.
- Concurrent favorites use last committed write. Refresh reads current server state; no merge log or tombstones are needed without offline writes.

## Authentication attempts (`attempts`)

- `key`: server-generated email or client-IP throttle key, primary key.
- `count`: number of accepted attempts to process within the fixed window.
- `expires`: window expiration time; expired entries are removed.
- Refuse more than 30 attempts per key per 15-minute window before expensive password derivation.
- nginx overwrites X-Real-IP and the API is internal-only; do not trust arbitrary external forwarded headers in another deployment topology.

## Guest collection

Existing `random-gallery` IndexedDB version 1 retains `images` metadata and `blobs` content stores. The store names, key paths and version remain unchanged. New content records serialize bytes as an ArrayBuffer plus MIME type because this WebKit runner cannot commit Blob values; reads continue to accept legacy Blob records. There is no ownership migration, automatic upload, or account data cached in these stores. Signing in changes the active collection source; signing out restores the same guest database.

## Persistence and exposure

Use local filesystem storage through the Compose `gallery-data` volume. Keep WAL and main database together during backups; restore only while the API is stopped. Database and backups contain private original images, account emails, password verifiers and session digests, so protect access at the host level. API responses expose only account ID/email or validated image metadata/content; never raw account/session rows.

## Go adapter mapping

Domain/application values must not contain HTTP or SQL types. SQLite column names and BLOB/hex encodings remain compatible with the superseded draft: do not drop/recreate a populated database. Go JSON integer parsing must reject fractions, negatives and values above JavaScript's maximum safe integer for addedAt and ordinal. A transaction-bound repository set keeps final session validation and image writes atomic under concurrent handlers. Adapter tests must cover schema reopening, ownership, BLOB bytes and rollback before any compatibility claim.
