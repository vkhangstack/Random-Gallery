# Bug Fix: Signed-in uploads interrupted by session checks

- **Slug**: signed-in-upload-focus-reset
- **Fixed**: 2026-10-26
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Returning from the native file picker focused the window and triggered session revalidation. The
loading branch unmounted the gallery, cancelling upload work before its backend POST. Equivalent
session responses also recreated the cloud client. The gallery and client now survive same-account
checks, while a lookup failure retains a known account instead of silently selecting IndexedDB.

## Changes

| File | Change | Notes |
| --- | --- | --- |
| `src/components/Account.tsx` | modified | Preserve equivalent user identity/client; keep the collection mounted but hidden while identity is rechecked; pause access on known-account lookup errors; remount/cancel on real identity changes |
| `tests/account/file-picker-upload.spec.ts` | added test | Reproduce focus during validation and temporary lookup failure; require backend storage, no guest database and visibility from a separate browser |

## Tests Added or Updated

- `tests/account/file-picker-upload.spec.ts` — returning from the file picker preserves a signed-in upload and never writes IndexedDB.
- `tests/account/file-picker-upload.spec.ts` — session lookup failure never switches a known account upload to IndexedDB.

## Local Verification

- Before fix: new Chromium focus regression failed; no saved image after revalidation. See `before.json`.
- Focused Chromium rerun: 2 passed, 0 failed/skipped.
- `node tests/deployment/run-account-tests.mjs`: 45 passed — 15 each in Chromium 153.0.8010.12, Firefox 155.0, WebKit 26.6; 0 failed/skipped/flaky. Includes prior logout, identity-change, session-expiry, guest-preservation and private-cloud cases. See `results.json` and `after-*.json`.
- Signed-in upload regression confirms exactly one backend POST, no `random-gallery` IndexedDB database, and a decoded image in a separate authenticated browser.
- `npm run typecheck`: exit 0.
- `npm test`: 19 passed, 0 failed/skipped.
- `npm run build`: exit 0.
- `docker compose up --build -d web`: rebuilt/recreated the normal frontend; existing Go API and account volume retained. See `deploy.log`.
- Final live read-only check: nginx and API healthy; `/api/health` returns 200; entry HTML serves the new `/assets/index-DUlL47Gm.js` bundle at `http://127.0.0.1:8081`.
- No manual OS file-picker test or personal user images were used; reproduction dispatches the same focus event while controlled validation is pending.

## Deviations from Assessment

None.

## Follow-ups

- Reload the browser page to load the fixed frontend, then retry affected uploads.
- Existing guest IndexedDB images are preserved and are not automatically attributed/uploaded to an account.
- The five earlier guest focus failures and explicit legacy WebKit seed skip were not re-run or changed by this frontend fix; do not interpret this account-suite pass as a new passing full guest suite.
- Optional workflow verification: `$speckit-bug-test slug=signed-in-upload-focus-reset`.

No before/after bug-fix hooks are registered in `.specify/extensions.yml`.
