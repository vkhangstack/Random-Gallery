# Research: Random Gallery

**Date**: 2026-10-25
**Status**: Complete; no unresolved design clarifications.

## Repository and runtime

- **Decision**: Use React, TypeScript strict mode, Vite, Tailwind with its Vite plugin, npm,
  and Node 24 LTS. Resolve compatible stable package versions at implementation and lock them.
- **Rationale**: The repository contains only Spec Kit documents/scripts; no application stack
  or tests exist to reuse. This follows the user's explicit empty-repository fallback. Node 24
  meets the documented current Vite/Vitest runtime constraints; validate tooling engines at install.
- **Alternatives considered**: A backend framework, routing, global state, or UI framework adds
  no required capability. Tailwind's Vite plugin avoids unnecessary configuration layers.
- **Sources**: [Vite](https://vite.dev/guide/),
  [Tailwind Vite setup](https://tailwindcss.com/docs/installation/using-vite),
  [Vitest](https://vitest.dev/guide/).

## IndexedDB persistence and failure boundary

- **Decision**: Native IndexedDB with two stores, metadata and blobs, joined by UUID; write/delete
  both in one transaction. Resolve writes only after transaction complete, reject on abort/error.
  Decode and other asynchronous validation happen before opening the transaction.
- **Rationale**: Metadata listing avoids cloning every full image at startup. Separate stores
  still share atomic transactions and keep a favorite update from rewriting an image blob.
  A request success alone does not establish transaction commit.
- **Alternatives considered**: One combined store is simpler structurally but makes metadata-only
  listing and updates less direct. A wrapper library is unnecessary for this small fixed interface.
  localStorage image/base64 storage violates the user instruction and is excluded.
- **Sources**: [Using IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB),
  [transaction completion](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/complete_event).

## Image validation and URL lifetime

- **Decision**: Enforce 1–10,485,760 bytes, recognize JPEG/PNG/WebP header signatures, derive
  MIME from content, then require actual browser decode. Validate sequentially with temporary
  object URLs; finally revoke each validation URL. Display consumers own separate URLs with
  cleanup on replacement, failure, and unmount; suppress stale asynchronous reads.
- **Rationale**: Extension/MIME declarations do not prove readable content. Explicit ownership
  prevents retained blob references and cross-component premature revocation. React Strict Mode
  is useful for verifying setup/cleanup symmetry.
- **Alternatives considered**: Base64 decoding/persistence wastes memory and violates the storage
  constraint; a shared global URL cache adds ownership complexity without a proven need.
- **Sources**: [URL revocation](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static),
  [React effect lifecycle](https://react.dev/reference/react/useEffect).

## Random selection and state

- **Decision**: One pure function selects a candidate after excluding the current ID when an
  alternative exists; an injected random source supplies deterministic tests. Another pure
  function combines trimmed, case-insensitive filename substring search with favorite filtering.
  Confirm mutations before changing saved UI state, with per-image pending controls.
- **Rationale**: One sample from a filtered array avoids retries and immediate-repeat bugs.
  React local state and a collection hook cover two destinations without a state framework.
- **Alternatives considered**: Retry-until-different sampling can loop and is harder to verify;
  shuffle decks change the approved history behavior. Optimistic updates introduce rollback
  complexity; confirmed updates satisfy failure semantics directly.

## Testing and environment support

- **Decision**: Vitest plus Testing Library/user-event/jsdom/fake-indexeddb for fast logic,
  storage, and user-facing integration; Playwright Chromium/Firefox/WebKit for browser integration.
  Use current/previous stable desktop engines and current mobile Chrome/Safari as release targets.
- **Rationale**: An IndexedDB emulator cannot establish browser decoding, quota, eviction, focus,
  or actual reload behavior. Real browser tests complement deterministic injected failures.
  Use fresh IDBFactory instances for isolation and keep the same database for persistence tests.
- **Alternatives considered**: Browser-only tests slow pure logic checks; mock-only tests can
  pass while native transactions, decode, and resource lifetimes remain broken.
- **Sources**: [Testing Library](https://testing-library.com/docs/react-testing-library/intro/),
  [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB),
  [Playwright](https://playwright.dev/docs/intro),
  [Tailwind compatibility](https://tailwindcss.com/docs/compatibility).

## Assumptions resolved for planning

Use a Pixel 6a and MacBook Air M1 as representative performance devices; record concrete software
versions in implementation validation. Real devices are needed for the performance claim; browser
emulation provides layout checks only. No tooling is installed or tests run by this planning phase.
Browser-controlled site-data deletion/eviction remains a documented retention limitation, not a
promise of backup. No requirement justifies new product capabilities or governance exceptions.
