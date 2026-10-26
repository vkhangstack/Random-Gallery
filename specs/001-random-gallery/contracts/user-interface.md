# User Interface Contract

## Navigation and state

Random and Gallery are the only primary destinations. Random opens by default in all-images
scope. Both expose upload. Destination changes preserve in-session query/scope independently;
reopening resets them. Shared ImageViewer presents the image, full accessible name, favorite
state, favorite control, and deletion action. Larger presentation is a keyboard-dismissable dialog.

| Situation | Required UI |
| --- | --- |
| Loading initial collection | Loading status; do not flash an empty-collection claim |
| Collection load failure | Actionable error and Retry; do not offer a false successful load |
| Empty collection | Clear upload action and privacy/retention explanation |
| Empty favorites scope | Favorites-specific message; switch-to-all and Gallery actions |
| Gallery filter has no matches | No-results message and clear-filter action |
| Image unreadable | Named error, retry and removal actions; skip failed ID for Random |
| All scoped images unreadable | Read-error state with retry; no claim that collection is empty |
| Upload active | Current-file or completed/total feedback, accessible status; no second concurrent batch |
| Upload completed | Saved/failed counts and failed filenames with reasons/recovery actions |
| Single eligible image | Image remains; shuffle gives one-image explanation |

## Upload and privacy

Before file selection display accepted JPEG/PNG/WebP types and 10 MiB per-file limit. Explain
that collection data stays in this browser on this device, does not sync, and disappears when
site data is cleared. File picker accepts multiple files; actual validation follows storage/domain
contract. Successful files remain despite other failures. Reset the picker after a batch so the
same file can be retried. Failures must not expose unsaved files as saved Gallery entries.

## Mutations and viewer reconciliation

- Favorite controls have image-specific names and expose pressed state. While saving, indicate
  pending status and prevent conflicting mutations for that ID. Show new saved state after commit;
  failures retain prior state with retry. Removing a favorite updates both scopes and Gallery.
- Deletion identifies the image and permanent app-only removal. Default focus goes to Cancel;
  explicit Delete confirms, Escape/Cancel preserves data. Disable duplicate confirmation while
  pending. Errors keep the image and offer retry; success removes it from all views.
- On deletion of the Random image choose another eligible image or show the scope's empty state.
  Deletion in Gallery closes that image's dialog and focuses the next result or main controls.
  Filter/favorite changes alone do not close the Gallery image being inspected.
- Dialog opening moves focus inside, Tab stays within the active dialog, and closing restores the
  initiating control if present. A deletion prompt opened over a Gallery viewer returns focus to
  that viewer on cancel/failure, or to Gallery after successful deletion.

## Presentation and accessibility

Whole images in Random/larger viewers use contained aspect ratio without cropping. Thumbnail
images preserve aspect ratio. Long names cannot expand page width and remain fully accessible.
Use native buttons, labeled search/file inputs, visible focus, state announcements, and meaningful
image labels derived from names. Announce batch outcomes and failures without relying on color.
Both themes meet FR-023 contrast. No horizontal page overflow at 320/768/1440 pixels, including
long names and errors. Theme defaults to system preference; explicit preference uses guarded
localStorage access, with a clear session-only notice if saving it fails.

No external image, font, telemetry, or social service is used. Controls never initiate image or
metadata transmission. App-asset loading is distinct from collection data handling.
