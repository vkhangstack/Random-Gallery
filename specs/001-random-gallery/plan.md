# Implementation Plan: Random Gallery

**Branch**: `001-random-gallery` (Spec Kit identifier; no Git repository/branch exists)
| **Date**: 2026-10-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-random-gallery/spec.md` and the user's planning constraints.

## Summary

Build a client-only image collection with uploads, random discovery, favorites, search, deletion,
responsive layouts, accessible controls, and light/dark themes. Repository inspection found only
Spec Kit artifacts: no application, package manifest, lockfile, dependencies, or test tooling to
reuse. Use the requested React/TypeScript/Vite/Tailwind fallback. Store original image blobs and
metadata in IndexedDB; localStorage holds only the explicit theme preference.

This phase produces design and verification documents only. No application scaffolding,
dependency installation, test implementation, or deployment is part of this command.

## Technical Context

**Language/Version**: TypeScript with strict checking; React stable; Node.js 24 LTS. Resolve mutually compatible stable package versions and commit the npm lockfile when
implementation begins; exact package versions are not assumed installed today.

**Primary Dependencies**: React, React DOM, Vite and its React plugin, Tailwind CSS and its Vite
plugin. Native IndexedDB, native file/image APIs, and native dialog. No router, global state
package, IndexedDB wrapper, component library, or backend is needed.

**Storage**: IndexedDB database `random-gallery`, schema version 1, with metadata and blob stores
joined by image ID. Atomic per-image writes and deletes. localStorage key
`random-gallery.theme` stores only `light` or `dark`.

**Testing**: Vitest for pure functions and storage tests; React Testing Library, user-event,
jsdom, and fake-indexeddb for component integration; Playwright for actual decoding, IndexedDB
persistence, keyboard behavior, responsive views, and network privacy checks.

**Target Platform**: Current and previous stable Chrome, Edge, Firefox, and Safari at release;
current mobile Chrome/Android and Safari/iOS. Automated Chromium/Firefox/WebKit coverage plus
physical Safari/iOS and Android smoke checks. HTTPS or localhost; storage-denied environments
receive actionable failures rather than a volatile substitute presented as persistent storage.

**Project Type**: One static client web application, two in-app destinations, no service endpoints.

**Performance Goals**: SC-005: 95% of shuffle and search actions within one second for 100
images of up to 2 MiB; processing feedback within one second. Representative devices: Pixel 6a
(Android Chrome) and MacBook Air M1 (Safari and Chrome); record actual OS/browser versions and
fixture details in validation results. Emulation alone cannot establish physical-device timing.

**Constraints**: 10 MiB per image; JPEG/PNG/WebP signatures plus successful decode; no image or
metadata transmission; no binary/base64 persistence in localStorage. No full offline-launch,
backup, cross-device sync, or multi-tab synchronization promise. Browser eviction remains possible.

**Scale/Scope**: Single user's local collection; no artificial image-count cap. Load metadata
at startup, retrieve blobs for rendered images, lazy-load grid images, process one upload at a
time. No thumbnail generation, worker, virtualization, or paging until measured needs justify it.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Before research | After design |
| --- | --- | --- |
| Think Before Coding | PASS: spec defaults and user storage constraints explicit | PASS: research resolves storage, decoding, testing, and supported environments |
| Simplicity First | PASS: one app, no speculative product capabilities | PASS: native APIs, one collection owner, no routing/state framework or service layer hierarchy |
| Surgical Changes | PASS: planning artifacts only | PASS: constitution, spec, and application files untouched |
| Goal-Driven Execution | PASS: spec has measurable acceptance criteria | PASS: verification matrix and quickstart link implementation steps to checks |

No exceptions or governance amendments are required. No unresolved clarification blocks design.

## Project Structure

### Documentation (this feature)

```text
specs/001-random-gallery/
├── spec.md
├── checklists/requirements.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   ├── storage.md
│   └── user-interface.md
└── quickstart.md
```

`tasks.md` is produced later by speckit-tasks; it is not generated during planning.

### Source Code (repository root)

Proposed layout; these application/test files do not exist yet:

```text
index.html
package.json
package-lock.json
vite.config.ts
tsconfig.json
playwright.config.ts
src/
├── main.tsx
├── App.tsx
├── styles.css
├── types.ts
├── storage/images.ts
├── lib/
│   ├── random.ts
│   ├── filter.ts
│   └── validateImage.ts
├── hooks/
│   ├── useCollection.ts
│   └── useImageUrl.ts
└── components/
    ├── Uploader.tsx
    ├── Gallery.tsx
    ├── ImageViewer.tsx
    └── DeleteConfirmation.tsx
tests/
├── unit/
├── integration/
├── e2e/
├── fixtures/
└── setup.ts
```

**Structure Decision**: A single root Vite app. App owns destination, Random scope/current ID,
Gallery query/filter, dialog selection, and theme. useCollection owns confirmed metadata,
loading/error state and pending mutations; it calls the storage module directly. Pure functions
receive data and return results without storage or React dependencies. Avoid duplicate derived
state: gallery results and random eligibility are computed from confirmed metadata and session
unreadable IDs. ImageViewer supports inline Random and larger Gallery presentation.

## Complexity Tracking

No constitution violations; no complexity exceptions are requested.

## Implementation Sequence

1. Scaffold the requested stack and test commands; establish accessible two-destination shell,
   theme preference, and explicit loading/empty/error components. Verify build and keyboard shell.
2. Implement storage and per-file validation against failing tests. Verify atomic persistence,
   rollback on abort, reopen/read failures, and independent duplicate entries.
3. Implement pure filtering and random selection. Verify deterministic candidate coverage,
   empty/single sets, exclusions, scope independence, and 100 consecutive non-repeats.
4. Connect uploader and collection owner. Verify real mixed batches, feedback, failures,
   transaction completion before success, and refresh/reopen persistence.
5. Add Gallery, ImageViewer, favorites, confirmation, and URL lifecycle. Verify successful and
   failed mutations, selected-image reconciliation, unreadable images, focus, and URL cleanup.
6. Complete responsive/theme treatment and browser verification. Verify the acceptance matrix,
   timing fixture, no external image/metadata traffic, and first-time-user walkthrough.

## Behavior and Resource Design

- Validate size and signatures before decoding; derive canonical MIME from content, not extension
  or browser-provided type alone. Decode via a temporary object URL and Image.decode (load/error
  fallback if needed), then revoke in finally on success or failure. No decode awaits inside an
  active IndexedDB write transaction.
- Process files sequentially in selection order; give each a UUID, captured batch time, and
  selection ordinal. Save blob and metadata in one transaction. Publish an entry only after
  transaction complete. Continue after each file failure; disable another batch until completion.
- On startup list metadata only; loading failure stays an error with Retry. Missing/unreadable
  blobs retain removable metadata but enter a session unreadable-ID set excluded from Random.
  Retry clears the relevant exclusion and attempts reading/decoding again. If every scoped image
  is unreadable, show a read-error state with Retry rather than an empty-collection claim.
- A useImageUrl consumer reads a blob, creates one URL per active image, and revokes it when
  replaced, unmounted, or failed. Cleanup marks pending reads stale; late results must not create
  URLs or overwrite a newer image. Do not revoke on successful load while the image is still in
  use. Gallery and viewer own separate URLs so closing one cannot break the other. Test Strict
  Mode setup/cleanup, rapid switching, failed decode, and deletion. Never persist blob URL strings.
- Confirm favorite and deletion state after commit; keep previous saved state on failure.
  Disable mutation controls for the affected ID while pending, allowing unrelated navigation.
  Delete metadata/blob atomically, then reconcile current Random ID and open Gallery dialog.
- Random derives eligible IDs from scope, confirmed favorites, and readable status. A pure
  function excludes the current ID only when there is an alternative, samples once, and returns
  null for an empty set. Inject a random source for deterministic tests; default Math.random.
  Use functional state updates so rapid shuffle clicks see the previous committed selection.
- Native dialogs provide focus containment; explicitly choose initial focus, Escape dismissal,
  and return target. Successful deletion closes the Gallery viewer and focuses the next surviving
  result or Gallery controls. Cancel, failure, and favorite removal follow the UI contract.
- Theme reads/writes are guarded; failure to save keeps the session theme and announces the
  limitation. Image content and metadata never pass through localStorage. No remote assets,
  analytics, fonts, image fetches, or collection telemetry are introduced.

## Verification Strategy

| Layer | Required checks | Acceptance coverage |
| --- | --- | --- |
| Unit: random/filter | Empty/single/two/many, absent current ID, favorites/readable exclusions, injected random bucket boundaries, 100 selections; trimmed case-insensitive substring, combined filters, duplicate names, input immutability | FR-010/011/015/025; SC-003/005 |
| Unit: validation | Accepted signatures; misleading extensions/MIME; zero/corrupt/unsupported; 10 MiB boundary and +1 byte; decode rejection; temporary URL cleanup | FR-002/003; SC-002 |
| Storage integration | Real storage module with fake-indexeddb: blob+metadata commit, reopen, favorite update, atomic delete, abort after request success, quota/open/read/write failure, orphan prevention, versionchange close | FR-005/006/018; SC-001/004/008 |
| UI integration | Testing Library with real module + fake IndexedDB; mixed upload outcomes, saved counts, no early success, refresh by remount without database reset, favorites/filtering, confirmation cancel/commit/failure, current-image reconciliation, status announcements, URL lifecycle | Stories 1–4; SC-001–004/006/008 |
| Browser integration | Playwright against built preview: genuine fixtures and decoding, native IndexedDB, same-origin reload/new page in same context, favorites/deletion retention, theme, keyboard dialog flow, scope independence, read failures | SC-001–004/006/008 |
| Responsive/accessibility | 320/768/1440 widths, portrait/landscape, both themes; accessible names/states, Tab/Enter/Space/Escape, no lost focus/overflow, contrast checks and screen-reader smoke | FR-019–024; SC-006 |
| Privacy/failure | Inspect all outgoing requests after app assets load; exercise every collection operation and ensure no upload payload or metadata query/body leaves device; isolated denied storage/aborted transactions, no false saves/empty state | FR-006/008/024; SC-008 |
| Timing/usability | 100-image fixture, 100 shuffle/search samples per representative device; 95th percentile ≤1 second, upload feedback ≤1 second; five-person timed walkthrough | SC-005/007 |

Use genuine JPEG/PNG/WebP fixtures, corrupt content, unsupported files, duplicate/Unicode names,
and exact-size boundary fixtures. Unit tests can inject decode behavior; browser tests must decode
real files. fake-indexeddb does not prove browser quota, image decoding, eviction, or physical-device
performance. Inject deterministic quota/abort failures at the storage seam and separately verify
native browser transaction behavior; avoid brittle tests depending on device disk exhaustion.

Completion gates: type checking, production build, unit/integration suites, browser suites, manual
accessibility/device smoke, performance results, and five-person walkthrough must pass before claiming
all spec criteria complete. Record any unexecuted manual gate explicitly. Follow the concrete commands
and expected results in [quickstart.md](quickstart.md).

## Implementation Tooling Update — 2026-10-25

The implemented app uses the planned stack and native IndexedDB architecture. The restricted
environment could install build dependencies only from the existing npm cache; Vitest, Testing
Library, and fake-indexeddb were not available. Actual unit tests use Node 24's built-in runner,
and Playwright contains real-browser storage and UI integration tests. This reduces dependency
requirements but leaves the specified fast component/emulator coverage incomplete. The test
runner imports the actual storage module through a transient browser-only test harness; no
production debug endpoint or global is added. See validation.md and tasks.md for open gates.
