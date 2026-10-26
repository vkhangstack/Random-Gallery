# Implementation Plan: User Authentication and Private Image Sync

**Branch**: `004-user-cloud-sync` (logical identifier; no Git repository exists) | **Date**: 2026-10-25 | **Spec**: [spec.md](spec.md)

**Input**: User selected self-hosted option B, then explicitly required a Go backend with hexagonal architecture. This revision supersedes the Node backend design, not the user stories or HTTP contract.

## Summary

Build a Go API behind the existing nginx frontend. Implement account registration, cookie sessions and owner-scoped image collections using hexagonal architecture: domain rules and application use cases depend on application-owned ports; HTTP, SQLite, password hashing and image decoding are adapters wired only by the executable entry point. Keep SQLite metadata and original image bytes in one persistent Docker volume and one atomic commit boundary. Retain the React frontend and local guest IndexedDB collection, with explicit account storage selection and no automatic local uploads.

Existing `server/app.mjs`, its tests, sharp dependency and Node API Dockerfile are superseded drafts. Their previous test results are historical and do not validate Go. Port behavior/tests, preserve useful frontend work, switch deployment, and remove only the superseded draft code/dependency once the Go replacement is verified. The Go replacement has since been implemented; actual results and remaining guest focus failures are tracked in validation.md. No public cloud deployment is claimed.

## Technical Context

**Language/Version**: Go 1.26 backend (host currently 1.26.4); existing TypeScript/React/Vite frontend. Node 24 remains a frontend build/development tool only.

**Primary Dependencies**: Standard `net/http`, `database/sql`, `crypto/rand`, `crypto/sha256`, `crypto/subtle`, `image/jpeg`, `image/png`; `modernc.org/sqlite` as a pure-Go SQL driver; `golang.org/x/crypto/scrypt`; `golang.org/x/image/webp`. Pin compatible versions in `server/go.mod` and `server/go.sum` during implementation. No HTTP framework, ORM or DI framework.

**Storage**: SQLite accounts, hashed session tokens, image JSON metadata plus original BLOBs, and authentication-attempt windows. Enable foreign keys and WAL; initially limit the SQL pool to one connection and one API replica. Persist `/data` in the existing named volume. Preserve the existing guest IndexedDB v1 store names/key paths; new records use durable ArrayBuffer bytes plus MIME type, and the reader accepts legacy Blob records. This narrow compatibility adjustment is required by an actual WebKit persistence failure.

**Testing**: `go test ./...`, `go test -race ./...`, `go vet ./...` from `server/`; application tests with test doubles for ports; real temporary SQLite adapter tests; HTTP contract tests using `httptest`; existing Node frontend units and Playwright browser scenarios; Docker persistence/restore checks. Count only executed results as passes.

**Target Platform**: Linux containers on one operator-managed host, browser frontend, native Go development on macOS/Linux. Build a CGO-disabled Linux binary in `golang:1.26-alpine`, run it as a non-root user in a minimal Alpine runtime. Keep the existing nginx frontend image.

**Project Type**: Web application with a private same-origin API.

**Performance Goals**: Correctness first. Complete the three-fixture upload/refresh journey inside the existing 60-second browser-test budget on the validation host; no public throughput SLA. Limit each image to 10 MiB and 40 million decoded pixels. Bound upload buffering/decoding to two concurrent requests and password derivation to four concurrent requests; reject excess work with retryable 429 before buffering expensive inputs.

**Constraints**: Session-derived owner identity; private image content; no false saved state; no cross-account stale responses or requests; no credentials in frontend artifacts/logs. Use bounded bodies, request contexts/deadlines and graceful shutdown. Public hosting requires externally terminated HTTPS and exact APP_ORIGIN. No live/offline sync, sharing, recovery, automatic guest import, remote provisioning, or multiple API replicas.

**Scale/Scope**: Single-server initial release with host-volume capacity limits. No per-user quota or unbounded-storage claim. Reassess BLOB storage and connection strategy before larger workloads or horizontal scaling.

## Constitution Check

| Principle | Before design revision | After design revision |
| --- | --- | --- |
| Think Before Coding | PASS: user explicitly chose self-hosting and Go/hexagonal architecture | PASS: ports, adapters, transactional auth and deployment decisions recorded; no unresolved product choices |
| Simplicity First | PASS: retain one service and one store | PASS: requested architectural boundaries only; no speculative repositories, framework or extra services |
| Surgical Changes | PASS: preserve frontend behavior and guest schema | PASS: replace only Node backend drafts and related dependency/build wiring; leave unrelated historical focus defects separate |
| Goal-Driven Execution | PASS: six spec outcomes and explicit negative checks | PASS for design: Go-specific test and architecture gates plus real browser/container acceptance required |

No exceptions to the constitution are proposed. Hexagonal boundaries are explicitly requested, so dependency inversion here is required scope rather than speculative abstraction. Implementation acceptance remains incomplete.

## Project Structure

### Documentation (this feature)

```text
specs/004-user-cloud-sync/
├── spec.md
├── checklists/requirements.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/http-api.md
├── contracts/client-state.md
├── quickstart.md
├── tasks.md
└── validation.md
```

### Source Code (repository root)

```text
server/
├── go.mod
├── go.sum
├── cmd/api/main.go
├── internal/
│   ├── domain/
│   │   ├── account.go
│   │   ├── image.go
│   │   └── errors.go
│   ├── application/
│   │   ├── ports.go
│   │   ├── auth.go
│   │   ├── collection.go
│   │   ├── auth_test.go
│   │   └── collection_test.go
│   └── adapters/
│       ├── httpapi/          # Router, bounded parsing, cookies, errors, handlers/tests
│       ├── sqlite/           # Schema, repos, transactional unit of work/tests
│       ├── password/         # scrypt and timing-safe verification/tests
│       └── imagevalidation/  # Bounded JPEG/PNG/WebP decoding/tests
└── Dockerfile
src/
├── components/AuthPage.tsx  # Dedicated sign-in/sign-up pages
├── components/Account.tsx
├── storage/collection.tsx
├── storage/cloud.ts
├── storage/images.ts        # Guest store, schema unchanged
├── hooks/useCollection.ts
├── hooks/useImageUrl.ts
├── App.tsx
├── main.tsx
└── styles.css
tests/
├── account/                 # Dedicated Compose-backed browser scenarios
├── e2e/                     # Existing guest regressions
├── integration/
├── deployment/              # API recreation and backup/restore checks
└── unit/
playwright.accounts.config.ts
playwright.config.ts
compose.yaml
Dockerfile
nginx.conf
vite.config.ts
```

**Structure Decision**: Keep the existing `server/` location and replace its runtime with one Go module. Avoid a monorepo rewrite. Use application-owned interfaces only for actual infrastructure dependencies; adapters can be small packages rather than per-entity layers.

## Authentication Page Routing

The user explicitly requires separate `/sign-in` and `/sign-up` pages, with links from home and no inline auth form. Use normal same-origin links and pathname selection at the React root; no routing dependency is required for these three paths. Render the dedicated AuthPage component without App/gallery on auth routes. Successful auth performs a home redirect; authenticated visitors on auth routes are redirected home after session restoration. Preserve exact-origin cookies, cross-tab signals and pending-error handling. Verify direct URL/reload through nginx entry fallback, Vite, and browser tests.

## Hexagonal Dependency Rules

- `domain`: account/image value types, validation and typed errors; no imports of HTTP, SQL, adapters or application. JSON transport mapping belongs in HTTP adapters.
- `application`: authentication/collection use cases plus inbound service APIs and outbound ports. It may import domain and standard library context/crypto primitives, but never concrete adapters or `net/http`/`database/sql` types.
- Outbound ports: account/session/image/attempt repositories, password verifier, image validator, and a transactional unit of work. Define only methods required by implemented use cases. Transaction callbacks receive transaction-bound repository ports, not `*sql.Tx`.
- `adapters/httpapi`: maps cookies, headers, JSON/multipart requests and domain errors; calls application use cases. It must not issue SQL or contain owner-selection policy.
- `adapters/sqlite`: implements repository and unit-of-work ports with parameterized SQL and context-aware methods. It must not depend on the HTTP adapter.
- `adapters/password` and `adapters/imagevalidation`: implement crypto/decoder ports without leaking library-specific types inward.
- `cmd/api/main.go`: configuration, adapter construction, dependency wiring, HTTP server lifecycle and signal handling only. No hidden globals or service locator.
- Validate imports with `go list -json ./...` and a dependency-direction check. Application tests use port fakes; adapter tests exercise real SQLite, password derivation, decoders and HTTP serialization.

## Transaction and Cancellation Rules

Go handlers execute concurrently. A session lookup followed by an unrelated write is insufficient: the application must revalidate the session and owner and commit the image/favorite write inside the same unit-of-work transaction. Concurrent logout is ordered before or after that commit; it cannot slip between authorization and persistence. Registration and session creation also commit together. Throttle counters increment atomically and their recorded attempt persists even when authentication is refused.

Use request `context.Context` throughout application and repositories. Bound HTTP body sizes/timeouts and resource admission; check cancellation before expensive work and commits. Decoding and scrypt are not inherently interruptible, so concurrency bounds remain necessary. Browser cancellation cannot undo a committed mutation; ambiguous upload responses require a refresh before retry. Avoid calling nontransactional SQL methods from inside a transaction, especially with a single-connection pool.

## Implementation Sequence and Verification Gates

1. **Go foundation**: module, domain types, ports, adapters, composition root and a working test harness; verify dependency direction, race detection, validation boundaries and transactional authorization before integrating the frontend.
2. **US1 — Private account access**: registration/login/logout, salted scrypt, opaque hashed sessions, origin enforcement, throttling and account UI. Verify cookie attributes, invalid/expired sessions, cross-tab notifications, tab-return revalidation and visible lookup errors. Hide private content while identity is being rechecked.
3. **US2 — Save/retrieve images**: owner-scoped upload/list/content; atomic bytes and metadata; cloud client, explicit refresh and pending/error UI. Validate all formats, failed writes, duplicate IDs, original bytes and a second isolated browser. Cancel scoped requests and remaining upload batches on account changes.
4. **US3 — Consistent/private changes**: favorite/delete commits, owner-denial matrix, guest preservation, stale-response/URL cleanup, expired sessions during slow operations, simultaneous requests and injected network failures.
5. **Deployment and evidence**: Go multi-stage API image, non-root runtime, nginx proxy, no public API port, `/data` persistence, recreation and backup/restore. Remove verified superseded Node backend/sharp work. Run Go, frontend and browser regressions, retaining all actual failures/not-run counts.

## Acceptance Mapping

| Spec outcomes | Required evidence |
| --- | --- |
| SC-001 | Go use-case/HTTP tests plus browser registration, invalid/valid login and logout |
| SC-002 | Three formats, isolated second browser, names/favorites, original bytes and decoded images |
| SC-003 | Anonymous/account-B list/content/update/delete/replace probes; no changed owner data |
| SC-004 | Real SQLite rejection and browser network failures preserve confirmed state |
| SC-005 | Delayed request plus logout/account switch/session expiry, cross-tab identity change, URL cleanup and no continuation batch |
| SC-006 | Seeded guest images survive login/logout; zero automatic upload requests |

## Operational Limits

The SQLite volume contains accounts, sessions and private original images; it is not encrypted-at-rest storage. Restrict host/backup access, monitor disk capacity and use consistent backups. A loopback Compose deployment is not a public cloud deployment. Historical Node results remain separate from the executed Go/account/container results in validation.md. The full guest regression suite still has five focus failures; they are not counted as passed.
