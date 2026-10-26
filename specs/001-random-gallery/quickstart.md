# Quickstart and Validation Guide

## Current status and prerequisites

Application files and npm scripts now exist. Type checking, production build, and Node unit tests
have run successfully. Browser suites are authored but unexecuted because this session sandbox
denies localhost listeners and Chromium launch. See [validation.md](validation.md) for evidence.

Use Node 24 LTS, npm, and a browser with IndexedDB enabled. A
package-lock.json is present. Use the same origin and port for retention checks. See
[data-model.md](data-model.md) and [contracts/storage.md](contracts/storage.md) for persistence
semantics and [contracts/user-interface.md](contracts/user-interface.md) for visible outcomes.

## Setup and commands after implementation

Run from the repository root:

```sh
npm ci
npx playwright install
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open `http://127.0.0.1:5173`. Browser binaries must be installed; supported CI environments may
need `npx playwright install --with-deps`. Do not change ports during a persistence scenario.

The implemented verification scripts are:

```sh
npm run typecheck
npm run build
npm test
npm run test:e2e
```

Expected: strict TypeScript checking and production build succeed; all Node unit tests
pass. test:e2e must run against a built Vite preview at a fixed local origin with
Playwright's webServer setup, covering Chromium, Firefox, and WebKit. A static preview server is
only for app assets; it is not an image backend.

## Automated scenarios and expected results

1. **Uploads and validation (SC-001/002)**: Start clean. Upload 12 genuine images, four per type;
   add favorites. In a second batch mix valid, corrupt, zero-byte, unsupported, misleading-extension,
   and oversized fixtures. Expect correct saved/failed counts, named errors, and retained successes.
   Use valid generated fixtures at exactly 10,485,760 and 10,485,761 bytes to check the boundary.
2. **Local persistence (SC-001/004)**: Refresh the app; close/reopen its page within the same
   context; verify images and favorite states by name and actual decode. Close/relaunch a browser
   using the same persistent user-data directory and origin to verify browser-restart retention.
   Do not reset storage between these steps. Verify deletions remain absent.
3. **Random/filtering (SC-003)**: Test no image, one image, two images, and multiple favorites.
   Perform 100 selections in each populated scope: no immediate repeats with alternatives, no
   non-favorite in favorites scope. Search by mixed-case substring, whitespace, Unicode, and
   combined favorite filter; Gallery results must not change Random scope.
4. **Mutation recovery (SC-004/008)**: Cancel deletion; confirm deletion of current image and
   last favorite. Abort favorite/delete transactions and inject per-file save/open/read failures.
   Expect prior data retained, no false saved messages, correct viewer state, actionable retry,
   and collection-read error rather than empty state. Include abort after request success.
5. **Resource lifecycle**: Instrument createObjectURL/revokeObjectURL in hook/component tests.
   Replace images, navigate, filter grid entries away, open/close dialogs, delete, fail decode,
   resolve stale reads, and unmount under Strict Mode. Every created URL is eventually revoked;
   surviving consumers remain usable. Browser tests verify displayed images still decode.
6. **Privacy (SC-008)**: Observe outgoing requests from app load through every collection action.
   No request URL/body may contain fixture names, image bytes, or collection metadata; no third-party
   service should be contacted. Inspect IndexedDB for blobs/metadata and localStorage for only
   the small theme preference; confirm no base64 images or binaries in localStorage.
7. **Site-data loss**: Clear app-origin data deliberately in an isolated test profile. Reopen and
   expect the upload empty state; the prior retention warning must have explained this outcome.

Use isolated browser contexts for unrelated tests; preserve the same context for persistence
scenarios. Storage integration tests transpile the actual storage module and load it into the
browser through a temporary test-only blob module. This adds no production debug route. Mock
decode only in Node tests; real-browser scenarios use genuine file fixtures. Deterministic quota and
abort injection must remain test-only, not a product debug route or control.

## Manual accessibility and device checks (SC-006)

At 320, 768, and 1440 CSS pixels in both themes and portrait/landscape, complete upload, Random,
Gallery search/filter, larger viewer, favorite, cancel deletion, and confirmed deletion with
keyboard only. Check visible focus, dialog containment/Escape/return focus, long filenames,
readable error messages, and no horizontal page scroll. Verify meaningful names, pressed states,
and status announcements with a screen reader. Measure FR-023 text/control/focus contrast.
Smoke-check current mobile Chrome on Android and Safari on iOS, including the native file picker.

## Performance and usability (SC-005/007)

Use 100 valid images up to 2 MiB each on Pixel 6a/Android Chrome and MacBook Air M1/Safari and
Chrome. Record OS/browser versions, fixture sizes/dimensions, sample count, and production-build
configuration. Measure 100 shuffle and 100 search actions; at least 95% must show the result in
one second, and upload feedback must appear within one second. Report actual results; do not
substitute emulator timing for physical-device evidence.

Ask five first-time users to upload three images, shuffle, favorite one, and find it in Gallery.
At least four must finish within three minutes without help; all five must locate the local-only
storage/site-data-loss explanation. Record anonymized completion times and failed steps.

## Completion record

Record pass/fail and evidence for SC-001 through SC-008, executed browsers/devices, build and test
outputs, manual focus/contrast findings, timing samples, and the walkthrough. A mock-only persistence
check does not satisfy browser persistence. Unexecuted physical-device or human checks remain open;
do not report them as passing. No collection backup or restoration is promised.

## Implemented tooling and focused runs

Vitest, Testing Library, and fake-indexeddb could not be installed from the offline cache.
Pure-function/validation tests use Node 24's built-in test runner; storage and user-flow integration
tests use real IndexedDB in Playwright. This is a recorded tooling deviation from the plan.
The production architecture and product requirements are unchanged.

```sh
npm test
npm run test:e2e -- --list
npm run test:e2e -- --project=chromium
npm run test:e2e -- tests/integration
npm run test:e2e -- --grep "100-image timing"
```

Use `npm test`; the previously planned Vitest-specific `--run` flag is not applicable. Browser results are written to test-results/; privacy
checks run against production assets and do not add app instrumentation to production files.

In an unrestricted environment, use `npm ci` and `npx playwright install` as above. This workspace
was installed from existing cached packages because external DNS was unavailable. package-lock.json
pins the resolved versions; the nanoid override selects a cached compatible 3.x version.

## Current evidence and outstanding gates

The latest audit has 19 passing Node tests and 144 discovered browser cases (the original 99
plus additional coverage). Browser counts are 0 passed, 0 assertion failures, 0 skipped, and
144 not run because the preview server fails before tests start. Native-browser and component
runner tasks remain unchecked; see [task-audit.md](task-audit.md). Localhost/browser escalation
was requested and rejected by this session's sandbox policy. See [manual-checks.md](manual-checks.md)
for the minimum unrestricted-runner and participant actions.
