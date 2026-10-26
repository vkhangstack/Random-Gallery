# Implementation verification and external blockers

Date: 2026-10-25. **9/46 tasks verified; 37 unchecked.** The prior 30/46 count included
unexecuted test sources and unverified runtime behavior. Those checks have been reopened under
the user's stricter evidence requirement. Implementation is present; complete acceptance is not.
See [task-audit.md](task-audit.md) for every task's acceptance criteria and evidence.

## Changes in this continuation

- Fixed preview focus recovery when favoriting/filtering removes its original thumbnail:
  focus returns to a surviving thumbnail or the Gallery heading. Added a regression case.
- Added seven Node tests covering storage error guidance, missing storage, denied-open retries,
  blocked-open late-connection cleanup, larger eligible/favorite sets, uniform candidate buckets,
  and fallback decoder URL lifetime.
- Added native-browser pending-write, interrupted-upload, picker-retry, loading-state, theme
  read/invalid/system-change, full keyboard journey, visible focus and landscape checks.
  Pending writes are controlled with actual IndexedDB transaction locks, not a fake save-success event.
- Fixed the timing scenario's missing <=1-second feedback assertion; measure from the real file
  input change event rather than the automation fixture transfer.
- Expanded existing persistent-profile restart checks to all three browser engines, removing
  the prior intentional non-Chromium skips. No original test or assertion was removed/weakened.
- Audited all tasks and reopened entries without executed acceptance evidence. Added manual
  participation steps and raw command/error records.

## Commands and results

| Command | Result/evidence |
| --- | --- |
| npm run typecheck | PASS; [typecheck.log](evidence/typecheck.log) |
| npm test | PASS: 19 passed, 0 failed, 0 skipped; [unit-tests.log](evidence/unit-tests.log) |
| npm run build | PASS: strict check and Vite production build; [build.log](evidence/build.log) |
| Lint | Not configured: no lint script or ESLint configuration exists |
| node node_modules/playwright/cli.js test --list --reporter=json | 144 discovered project cases, 12 files; [browser-discovery.json](evidence/browser-discovery.json) |
| npm run test:e2e -- --reporter=json | Exit 1, preview startup error before test execution; [browser-run.json](evidence/browser-run.json) |
| npm run preview -- --host 127.0.0.1 --port 4173 --strictPort | Exit 1, listen EPERM; [preview-startup.log](evidence/preview-startup.log) |
| node --input-type=module -e 'import { chromium } from "playwright"; const browser = await chromium.launch(); await browser.close();' | Exit 1, Chromium Mach-port bootstrap denied; [chromium-startup.log](evidence/chromium-startup.log) |
| Escalated npm run test:e2e request | Rejected before execution: sandbox_approval false; [approval-rejection.txt](evidence/approval-rejection.txt) |
| npm install -D vitest jsdom @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom fake-indexeddb --cache /private/tmp/random-gallery-npm --fetch-retries=0 --fetch-timeout=10000 --no-audit --no-fund | Exit 1, getaddrinfo ENOTFOUND registry.npmjs.org; tool output and npm log recorded below |
| npm install -D jsdom@20.0.3 --offline --cache /private/tmp/random-gallery-npm --no-audit --no-fund | Exit 1, ENOTCACHED @tootallnate/once; local cache cannot supply a DOM runner |
| PLAYWRIGHT_BROWSERS_PATH=/private/tmp/random-gallery-browser-cache PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT=5000 npx playwright install firefox webkit | Exit 1 downloading Firefox, ENOTFOUND cdn.playwright.dev / playwright.download.prss.microsoft.com; [browser-install.log](evidence/browser-install.log) |

The dependency installation log is
`/private/tmp/random-gallery-npm/_logs/2026-10-25T04_20_51_846Z-debug-0.log`.
No lint tooling was introduced solely for this verification turn. No deployment, publishing,
remote image service, or external execution environment was used.

## Browser execution counts

| Run scope | Passed | Failed assertions/test cases | Skipped | Not run | Infrastructure errors |
| --- | ---: | ---: | ---: | ---: | ---: |
| Initial retry of all original 99 cases | 0 | 0 | 0 | 99 | 1 preview-startup error |
| Final full suite: original cases plus added coverage | 0 | 0 | 0 | 144 | 1 preview-startup error |

144 cases = 48 tests per engine across Chromium, Firefox, and WebKit. The report's zero
expected/unexpected/skipped counts do **not** mean a passing suite: the server fails before
collection/execution. Not-run counts come from matching discovery with the startup failure.
All native-storage integration tests are in that blocked suite; none is represented as a pass.
No browser page was reached, so there is no screenshot, viewport success, native persistence,
request-privacy, physical timing, or screen-reader result to report.

## Exact external failures and minimum actions

1. **Local server**: `Error: listen EPERM: operation not permitted 127.0.0.1:4173`.
   This happens when Vite attempts to bind the listener, after the production build succeeds.
2. **Browser process**: Chromium fails in `base/apple/mach_port_rendezvous_mac.cc:159`:
   `bootstrap_check_in ... Permission denied (1100)`. This occurs in a direct launch command
   without loading the app, independently establishing an execution-environment failure.
3. **Approval**: The requested require_escalated command was rejected because the session has
   `sandbox_approval: false`. No available tool can present that escalation prompt under this
   policy. The user must enable localhost/process permissions in a new run, or execute the
   documented commands in a normal local terminal and supply the JSON report/traces.
4. **Missing tooling/binaries**: npm and browser-CDN DNS return ENOTFOUND. Allow those downloads
   or provide a local package/browser cache; then finish the specific T002 setup and component
   tests, including stale-read and Strict Mode ownership coverage. Node/browser test authoring
   does not silently replace that approved requirement.
5. **Manual gates**: Physical device/screen-reader access and five actual first-time users are
   unavailable. Follow [manual-checks.md](manual-checks.md); no outcomes are fabricated.

## Required-flow evidence

| Flow | Available evidence | Remaining verification |
| --- | --- | --- |
| Upload/validation | Signature/MIME, zero/unsupported/corrupt, boundary/+1, decoder cleanup tests pass | Genuine decoding, mixed batch, native write boundary/interruption and picker retry blocked |
| Refresh persistence | Native reload/reopen/profile tests authored for each engine | All native-browser runs blocked |
| Random no-repeat | Empty/single/two/many and eligible-subset Node tests pass | Actual UI/scope rapid actions blocked |
| Favorites/filtering | Filename/favorite intersection, stable records/order Node tests pass | Native favorite commit/rollback/retention and UI states blocked |
| Deletion | Atomic storage, pending/error/cancel/final-image/browser cases authored | Native transactions/dialogs/focus blocked |
| Empty/loading/errors | Storage open failure branches pass Node tests; native loading/error scenarios added | Rendered states and announcements blocked |
| Responsive layouts | Portrait/landscape cases at specified widths/themes authored | Browser viewport cases not run; physical mobile not available |
| Keyboard/accessibility | Full keyboard journey, nested dialogs, focus fallback and visible-focus assertions authored | Browser execution plus screen-reader/physical audit required |

## Remaining unchecked task IDs

T002–T003, T006, T008–T017, T019–T021, T023–T025, T027–T029, T031–T044, T046.
The detailed per-task distinction between source present, partial Node evidence, browser blocker,
missing component tooling, and physical/user gates is in task-audit.md.

The approved product criteria are unchanged. Prior CSS token contrast calculations remain
source-level evidence only; they are not a rendered accessibility audit. No physical-device,
user-study, browser, or component-emulator results are claimed without execution.

## Hooks and checklists

No .specify/extensions.yml exists; there are no hooks to execute. Requirements-quality checklist
markers remain read-only and unchanged (16/16 checked). They are not implementation completion evidence.
