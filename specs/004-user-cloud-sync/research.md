# Research: Go Backend with Hexagonal Architecture

Date: 2026-10-25. This revision supersedes the Node backend research after the user's explicit Go/hexagonal requirement. Account behavior, guest separation and self-hosted storage scope are unchanged.

## 1. Runtime and architecture

**Decision**: Use Go 1.26 with standard HTTP routing, domain types, application use cases/ports and concrete infrastructure adapters wired in `cmd/api/main.go`.

**Rationale**: The user explicitly requires Go and hexagonal architecture. Package boundaries make HTTP and SQLite replaceable without pushing framework types into business rules. The installed toolchain is Go 1.26.4. Keep one module under the existing `server/` directory and avoid a framework/ORM/DI container.

**Alternatives considered**: Retaining the earlier Node implementation conflicts with the new instruction. A layered HTTP handler with direct SQL would not satisfy the requested dependency inversion. Separate microservices add infrastructure outside scope.

## 2. SQLite persistence

**Decision**: `database/sql` with `modernc.org/sqlite`, a pure-Go driver; persist image JSON metadata and original BLOB content in one row. Use WAL, foreign keys, one SQL connection and one API replica initially. Pin compatible module versions during implementation.

**Rationale**: The driver allows a CGO-disabled binary and retains the single persistent volume design. SQL context APIs propagate request cancellation. Node draft column encodings can be retained rather than silently dropping data. The synchronous transaction boundary of the old draft must be re-established explicitly for concurrent Go requests. See [Go SQL overview](https://go.dev/doc/database/), [driver documentation](https://pkg.go.dev/modernc.org/sqlite) and [SQLite WAL](https://www.sqlite.org/wal.html).

**Alternatives considered**: A CGO SQLite driver introduces compiler/runtime linking requirements; PostgreSQL plus an object store adds services and partial-write handling without a scale requirement. Filesystem blobs add atomicity/cleanup work.

## 3. Authorization and concurrency

**Decision**: Application use cases own authorization and depend on a transaction port exposing transaction-bound repository interfaces. Revalidate session/owner and perform each protected write inside the same transaction. Register the account and initial session atomically. Record throttle counters atomically even when denying an attempt.

**Rationale**: Go's HTTP handlers run concurrently. Without a transactional final check, logout could revoke a session between the authorization query and image commit. Serialize that decision with the write. Never mix `sql.DB` methods with transaction-bound calls inside the callback, particularly when the pool has one connection. See [Go transactions](https://go.dev/doc/database/execute-transactions) and [SQL cancellation](https://go.dev/doc/database/cancel-operations).

**Alternatives considered**: A separate session check leaves a race. A global application mutex couples correctness to one process and does not establish database atomicity. Exposing `*sql.Tx` in application interfaces breaks the requested architecture.

## 4. Passwords and cookie sessions

**Decision**: Use `golang.org/x/crypto/scrypt` with N=32768, r=8, p=3; random 16-byte salts; 64-byte keys and `crypto/subtle` verification. Use `crypto/rand` for 32-byte opaque tokens and store only their SHA-256 digest. Expire sessions after seven days and revoke the current token on logout. Cookies are HttpOnly, SameSite=Strict, host-scoped and Secure for HTTPS origins. Enforce exact Origin on mutations and fixed-window throttling. Bound concurrent password derivations to four; return retryable 429 before expensive work when saturated.

**Rationale**: Preserve the documented account contract while replacing Node crypto calls. The scrypt setting is a documented OWASP tradeoff. No reusable token is stored in localStorage or frontend configuration. SameSite supplements, rather than replaces, the origin check. See [Go scrypt](https://pkg.go.dev/golang.org/x/crypto/scrypt), [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), and [OWASP sessions](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

**Alternatives considered**: JWTs add revocation concerns; browser-readable token storage increases exposure; social sign-in and recovery introduce unrequested flows/provider dependencies.

## 5. Server image validation

**Decision**: Replace sharp with an image-validator adapter using standard JPEG/PNG decoding plus `golang.org/x/image/webp`. Bound actual bytes, inspect dimensions with DecodeConfig, reject over 40 million pixels before full decoding, then fully decode accepted content. Derive MIME/size from verified bytes, and persist original bytes. Limit to two concurrent upload buffering/decode requests, rejecting overload before reading the expensive body.

**Rationale**: The Go API must validate content independently of the browser without a Node/native-image runtime. Bound dimension multiplication safely and reject malformed/truncated images. Decoding is not inherently context-cancellable, so resource admission is needed even with HTTP deadlines. See [Go image package](https://pkg.go.dev/image) and [WebP decoder](https://pkg.go.dev/golang.org/x/image/webp).

**Alternatives considered**: Extension or caller MIME checks are bypassable. Header-only decoding cannot establish valid image content. Keeping sharp requires a second backend runtime and defeats the replacement.

## 6. Client identity and sync

**Decision**: Keep the existing storage interface, remote confirmation semantics, guest IndexedDB schema and explicit refresh. Key account content by identity; cancel account-scoped requests and remaining upload batches, revoke image URLs and suppress stale responses on identity changes. Cloud calls carry an expected-account guard in addition to session authentication. Notify other tabs of auth changes without broadcasting data or credentials; recheck on tab return and hide private content while rechecking. Distinguish session lookup errors from confirmed guest state.

**Rationale**: The earlier read-only review identified concrete gaps in the React draft: unmounting does not stop the old upload loop, and a shared cookie can change without the other tab clearing its preview. These findings remain valid with a Go API and are carried into the plan/tasks.

**Alternatives considered**: A shared browser account cache risks data bleed; automatic local imports transfer images without an explicit choice; realtime/offline queues add product behavior outside the requested sync semantics.

## 7. Build, deployment and evidence

**Decision**: Multi-stage Go API image, CGO-disabled binary, non-root runtime, internal API port 3000, nginx gateway on local 8081 and named `/data` volume. Keep Node only for frontend tooling. Remove superseded Node backend sources/tests and sharp dependency after the replacement is verified; preserve any private volume data and the earlier validation record.

**Rationale**: Retains Docker/nginx and makes the runtime change explicit. Public hosting requires external TLS and exact HTTPS APP_ORIGIN. SQLite backups must include a consistent snapshot: stop the API before archiving the full volume, or use a supported backup facility. See [SQLite backup guidance](https://www.sqlite.org/backup.html).

**Alternatives considered**: Exposing the API separately complicates same-origin cookies and trusts caller proxy headers. Renaming the database volume could orphan existing account data. Historical Node tests cannot validate the replacement.

## Resolved review actions

Require dependency-direction checks, application tests via ports, real SQL and HTTP tests, concurrent logout/write tests under the race detector, actual browser identity/sync/failure journeys, and real Docker recreation/restore validation. These design gates have now been implemented and executed; validation.md records actual results, including unresolved guest focus failures. No unresolved product clarification remains.
