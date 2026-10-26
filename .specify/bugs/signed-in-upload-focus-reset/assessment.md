# Bug Assessment: Signed-in upload cancelled by file-picker focus

- Slug: signed-in-upload-focus-reset
- Assessed: 2026-10-26
- Verdict: valid, reproduced
- Source: User reports signed-in upload fails, image is absent and frontend appears to use IndexedDB.

## Evidence and Reproduction

The running nginx log showed successful authenticated session/collection reads but no image-upload POST.
A Chromium regression holds image validation, dispatches the window focus event emitted when returning
from a file picker, confirms session revalidation, then releases validation. The original implementation
never displays a saved upload. The failed baseline is retained in before.json.

## Root Cause

Account.recheck sets checking=true on focus. Account then returns a loading paragraph, unmounting the
collection, aborting the cloud client's controller and incrementing useCollection's generation. The
pending upload exits before POST. Even preserving the DOM alone is insufficient: assigning the newly
parsed but equivalent User object recreates cloud storage and aborts its old controller. Additionally,
a temporary session-lookup error clears a known user to null, selecting local storage despite not having
confirmed logout.

Existing guest IndexedDB records do not themselves prove a signed-in write; they persist by design.
The regression additionally checks that a signed-in upload reaches the API exactly once, creates no
local collection database, and appears in an independent browser.

## Proposed Remediation

Preserve the User object for an unchanged identity. Keep a known account collection mounted but hidden
while rechecking; reveal it when the same identity is confirmed. Remount/cancel only for an actual
identity change or confirmed unauthenticated result. Retain the last known user after a lookup error,
keep its collection hidden and uploads paused until retry, and never implicitly switch it to guest.
Initial unauthenticated guest behavior remains separate and explicitly labelled.

## Files likely to change

- src/components/Account.tsx
- tests/account/file-picker-upload.spec.ts

## Tests to add or update

- Focus during validation preserves a signed-in upload; exactly one API POST, no guest IndexedDB,
  image visible in another browser.
- Temporary session lookup failure retains account identity and pauses cloud access until successful
  retry; subsequent upload reaches backend rather than local storage.
- Existing account-change, cross-tab, guest preservation and expired-session cases must still pass.

## Risks & Considerations

Retaining a mounted collection must not display private data while identity is unknown; hide it during
rechecks and failures. Preserve request cancellation for real identity changes, and run the complete
account suite in all three installed browser engines. Do not copy or delete existing guest images.
