# Feature Specification: Random Gallery

**Feature Branch**: None created; feature directory is `specs/001-random-gallery`.

**Created**: 2026-10-25

**Status**: Draft — requirements validated; ready for planning

**Input**: User description: Build a responsive, minimal Random Gallery web app for uploading,
locally retaining, browsing, favoriting, deleting, and randomly discovering personal images.
Keep images on the device, require no account or backend, support accessible mobile and desktop
use with light and dark themes, and leave implementation technology choices to planning.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build and retain a private collection (Priority: P1)

As a user, I want to upload several images and retain them on this device so I can revisit my
collection without sending it to an external service.

**Why this priority**: A reliable local collection is the foundation of every discovery flow.

**Independent Test**: Start with no collection, upload a mixed batch, inspect saved entries,
then refresh and reopen the app in the same browser profile.

**Acceptance Scenarios**:

1. **Given** an empty collection, **When** I open the app, **Then** Random shows an empty state
   with a clear upload action and explains device-only storage and site-data removal.
2. **Given** sufficient storage, **When** I upload several valid JPEG, PNG, and WebP images,
   **Then** processing feedback appears and each saved image becomes available in Gallery.
3. **Given** a batch with valid, unsupported, oversized, and corrupt files, **When** processing
   finishes, **Then** valid files remain saved and each failed file has a named reason and
   recovery action; the result states saved and failed counts.
4. **Given** saved images and favorites, **When** I refresh or close and reopen the app in the
   same browser profile without clearing site data, **Then** the images and favorites remain.
5. **Given** a storage write failure, **When** an image cannot be saved, **Then** it is reported
   as unsaved, previously saved files remain available, and I am told to free space or retry.

---

### User Story 2 - Discover an image at random (Priority: P1)

As a user, I want to shuffle my collection one image at a time so I can rediscover my images.

**Why this priority**: Random discovery is the product's primary purpose.

**Independent Test**: Use a collection of known images, select each scope, and shuffle repeatedly
while checking the displayed image, name, favorite status, and eligible set.

**Acceptance Scenarios**:

1. **Given** saved images, **When** I enter Random, **Then** one eligible image is displayed
   with its name, favorite status, a favorite control, and a prominent “Random image” button.
2. **Given** two or more eligible images, **When** I select “Random image” repeatedly, **Then**
   each selection is from the active scope and differs from the immediately preceding image.
3. **Given** one eligible image, **When** I shuffle, **Then** it stays visible and a message
   explains that there is only one image available in this scope.
4. **Given** favorites-only scope, **When** I shuffle, **Then** no non-favorite is selected;
   if there are no favorites, a favorites-specific empty state offers switching to all images.
5. **Given** a portrait, landscape, or square image, **When** it is displayed, **Then** the
   entire image fits without cropping or distortion.
6. **Given** favorites-only scope and its displayed image, **When** I remove that favorite,
   **Then** another eligible image appears, or the favorites empty state appears if none remain.

---

### User Story 3 - Browse and manage the collection (Priority: P2)

As a user, I want to find, inspect, favorite, and delete images so the collection stays useful.

**Why this priority**: Browsing and organization support ongoing use after the first upload.

**Independent Test**: With a seeded collection, combine search and favorites filtering, open an
image, change its favorite status, and cancel and confirm individual deletions.

**Acceptance Scenarios**:

1. **Given** saved images, **When** I open Gallery, **Then** a responsive thumbnail grid appears
   and I can open any result in a larger, uncropped viewer showing its name and favorite status.
2. **Given** images with known names, **When** I search by a partial name and enable favorites,
   **Then** only images matching both the name and favorite filter appear.
3. **Given** no matching results, **When** filters are active, **Then** a no-results message
   offers clearing them rather than suggesting the saved collection has been lost.
4. **Given** an image in either view, **When** I toggle its favorite, **Then** both views agree
   and the change persists after refresh; a failed save reports failure and restores saved state.
5. **Given** an image selected for deletion, **When** I cancel confirmation, **Then** it remains;
   **When** I confirm and deletion succeeds, **Then** it disappears and stays absent after refresh.
6. **Given** a displayed image, **When** I delete it successfully, **Then** Random selects from
   the remaining eligible images or shows the correct empty state. An open gallery viewer closes
   and returns focus to the next available result or Gallery's main controls if no result remains.
7. **Given** deletion cannot be saved, **When** I confirm, **Then** the image remains available
   and a message explains that deletion failed and can be retried.

---

### User Story 4 - Use the app comfortably across devices (Priority: P2)

As a user, I want readable themes, simple navigation, and accessible controls so I can manage
and discover images on a phone or desktop, including using only a keyboard.

**Why this priority**: The core flows must remain usable regardless of screen size or input.

**Independent Test**: Complete upload, shuffle, favorite, search, open, cancel deletion, and
confirm deletion at narrow and wide widths, in both themes, with keyboard-only input.

**Acceptance Scenarios**:

1. **Given** a 320-pixel-wide screen or a desktop screen, **When** I use Random and Gallery,
   **Then** controls, messages, and image names remain usable without page-level horizontal scroll.
2. **Given** keyboard-only input, **When** I navigate and activate controls, **Then** focus is
   visible, order is logical, and no interactive operation requires a pointer.
3. **Given** a larger viewer or deletion prompt, **When** I open and dismiss it, **Then** focus
   moves into it and returns to its trigger, or a logical surviving control if that trigger is gone.
4. **Given** either theme, **When** I change theme and reopen the app, **Then** my explicit
   preference remains and controls and text stay readable.
5. **Given** loading, upload results, or an error, **When** the state changes, **Then** feedback
   is visible and available to assistive technology without depending on color alone.

### Edge Cases

- Empty collection: show upload guidance; never show a broken image or active shuffle action.
- Empty favorites: explain that no favorites exist and offer switching scope or opening Gallery.
- Single eligible image: keep it visible, explain the limit, and never imply a different result.
- Exactly two eligible images: consecutive shuffle actions alternate between them.
- Unsupported content disguised with an accepted extension, zero-byte files, or unreadable image
  content: reject that file and keep processing the rest of the batch.
- Size boundary: a valid file of exactly 10 MiB is accepted; a file one byte larger is rejected.
- Duplicate names or identical uploads: retain independent entries; favoriting or deleting one
  does not change the others.
- Long or non-Latin filenames: preserve the full name and expose it accessibly even if the grid
  visually shortens it; do not let names push controls outside the screen.
- Storage full, unavailable, or denied: report affected operations as unsuccessful and preserve
  confirmed saved data; initial collection-read failure is an error with retry, not an empty state.
- A previously saved image becomes unreadable: identify the affected entry, offer removal and
  retry, and allow using other readable images without endless reselection of the broken entry.
- Changing random scope makes the current image ineligible: immediately show an eligible image
  or that scope's empty state. If it remains eligible it may stay until the next shuffle.
- Search or favorite changes remove an open gallery image from results: keep the viewer open
  unless the image is deleted; reflect the new results when it closes.
- Clearing site data: the next visit starts empty; there is no promised restore or cross-device copy.
- Refresh during processing: retain files whose saves completed; do not promise recovery of
  unfinished uploads. There must be no partially saved, unusable entry reported as successful.
- Rapid shuffle or favorite actions: the final display and saved status remain consistent with
  completed actions; processing controls must not produce stale or contradictory state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST provide two primary destinations, Random and Gallery; open Random
  initially; and provide an upload action from either destination, including empty states.
- **FR-002**: Users MUST be able to select one or multiple JPEG, PNG, and WebP images per upload.
- **FR-003**: Before selection, the upload interface MUST communicate supported types and a
  maximum of 10 MiB (10,485,760 bytes) per file. It MUST validate actual readable image content
  and type, rejecting unsupported, corrupt, empty, or oversized files individually.
- **FR-004**: Each batch MUST show processing feedback until every file has a saved or failed
  outcome, then show saved/failed counts and each failed filename, reason, and recovery action.
  An individual failure MUST NOT discard successful saves or prevent other files being attempted.
- **FR-005**: Saved images, original filenames, and favorite states MUST persist across refresh
  and app reopening in the same browser profile while site data remains available.
- **FR-006**: The app MUST report an image or favorite as saved only after successful persistence.
  Failed image saves MUST NOT enter the saved collection; failed favorite changes MUST restore
  the saved status. Errors MUST offer retry or a relevant action such as freeing device space.
- **FR-007**: The app MUST explain at the upload entry point that images stay in the current
  device's browser profile, are not synced, and are removed when browser site data is cleared.
- **FR-008**: Uploaded images and their metadata MUST NOT be transmitted to external services.
  Core collection operations MUST require no accounts, authentication, payments, or backend.
- **FR-009**: Random MUST display one eligible image at a time with its filename, current
  favorite status, favorite toggle, scope selector, and prominent “Random image” button.
- **FR-010**: Random MUST offer all-images and favorites-only scopes. Each shuffle MUST select
  only a saved, readable image in the active scope and MUST exclude the currently displayed
  image when at least two eligible images exist. Each remaining candidate MUST have equal
  selection probability; repeat history beyond the immediately current image is not required.
- **FR-011**: With no eligible images, Random MUST show a scope-specific empty state and no
  enabled shuffle action. With one eligible image, shuffling MUST retain it with an explanation.
- **FR-012**: Entering Random with eligible images and no valid current image MUST select one.
  Scope changes, deletion, and favorite removal MUST leave the viewer showing an eligible image
  or the appropriate empty/error state, never a deleted or out-of-scope image.
- **FR-013**: Random and larger Gallery views MUST preserve aspect ratio and display the whole
  image without cropping by default. Thumbnails MUST preserve aspect ratio without distortion.
- **FR-014**: Gallery MUST show a responsive thumbnail grid, defaulting to most recently added
  first, and MUST allow opening each image in a larger viewer and returning to the grid.
- **FR-015**: Gallery MUST support case-insensitive substring search of original filenames and
  favorites-only filtering. Applied together they MUST return their intersection. No matches
  MUST show a distinct no-results state with a way to clear the search and filter.
- **FR-016**: Users MUST be able to toggle favorites from Gallery, its larger viewer, and Random.
  Saved changes MUST be reflected consistently in all views and eligibility calculations.
- **FR-017**: Users MUST be able to delete individual images from Gallery and Random. Before
  every deletion the app MUST identify the image, explain permanent removal from the app, and
  offer explicit confirmation and cancellation. Original source files MUST remain untouched.
- **FR-018**: Successful deletion MUST remove the image and favorite association persistently
  and update all views. Failed deletion MUST retain the image and report failure with retry.
- **FR-019**: The interface MUST remain usable from 320 to 1440 CSS pixels wide without page-level
  horizontal scrolling, with readable feedback and reachable controls in portrait and landscape.
- **FR-020**: Users MUST be able to select light or dark theme. The initial theme MUST follow
  the device preference; an explicit selection MUST persist when storage is available. Failure
  to persist the preference MUST be reported without preventing a session-only theme change.
- **FR-021**: All interactive controls MUST support keyboard operation, visible focus, accessible
  names, and logical focus order. Images MUST have meaningful labels derived from filenames;
  favorite and navigation controls MUST expose their current state to assistive technology.
- **FR-022**: Larger viewers and confirmation prompts MUST support dismissal by keyboard,
  manage focus on opening and closing, and prevent focus from becoming lost or inaccessible.
- **FR-023**: Both themes MUST provide text contrast of at least 4.5:1 for normal text and 3:1
  for large text, with at least 3:1 contrast for control boundaries and focus indicators.
- **FR-024**: Collection loading, image processing, empty results, image-read failures, and
  storage failures MUST have distinct user-visible feedback. Status and error updates MUST be
  available to assistive technology; read failure MUST NOT be misrepresented as an empty collection.
- **FR-025**: Gallery search and filtering MUST NOT silently alter Random's selected scope.
  Duplicate uploads MUST remain separate entries with independent favorite and deletion actions.

### Key Entities *(include if feature involves data)*

- **Image entry**: One successfully saved upload, with an independent identity, original filename,
  supported type, byte size, image content, addition order, and favorite status. Identical files
  or names may represent different entries.
- **Collection scope**: All saved readable images or the favorite subset; determines Random's
  eligible set independently of Gallery search and filters.
- **Upload batch**: Selected files with per-file processing outcome, failure details, and total
  saved and failed counts. Historical upload reports need not persist after the session.
- **User preferences**: Explicit light/dark theme preference. Search, random scope, and currently
  displayed image are session state and need not survive reopening.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With sufficient storage, a batch of 12 readable files (four of each supported type,
  each within the limit) saves all 12; every entry and its favorite status survives refresh and
  reopening. Zero entries are incorrectly reported as saved.
- **SC-002**: A mixed batch containing valid, unsupported, corrupt, empty, and oversized files
  produces the correct outcome for every file and retains every successful save. Boundary tests
  accept exactly 10,485,760 bytes and reject 10,485,761 bytes of otherwise valid image content.
- **SC-003**: Across 100 consecutive shuffle actions in each scope with at least two eligible
  images, there are zero immediate repeats and zero out-of-scope selections. A two-image set
  alternates; zero- and one-image sets satisfy their stated behaviors on every action.
- **SC-004**: Cancelled, successful, and failed deletions and favorite changes satisfy all
  corresponding scenarios, including removing the final favorite and deleting the displayed
  image; the viewer never retains a deleted or ineligible image.
- **SC-005**: With 100 saved images of up to 2 MiB each on the representative phone and desktop
  selected during planning, 95% of shuffle and search actions show their result within one
  second. Upload processing feedback appears within one second of file selection; no total
  upload-time guarantee is assumed across device capabilities.
- **SC-006**: All primary flows in User Story 4 are completable at 320, 768, and 1440 CSS pixels,
  in both themes, using keyboard alone, with visible focus, meaningful labels, accessible status
  feedback, required contrast, and no page-level horizontal scroll.
- **SC-007**: In a task walkthrough, at least four of five first-time users can upload three
  images, shuffle, favorite an image, and find it in Gallery within three minutes without help.
  All five can locate the device-only and site-data-loss explanation from the upload entry point.
- **SC-008**: During upload, browsing, search, shuffle, favorite, deletion, and reopening checks,
  zero uploaded image contents or collection metadata leave the device. Simulated storage and
  collection-read failures yield actionable feedback and zero false save or empty-state claims.

## Assumptions

- **A-001 — Size limit**: 10 MiB per file is the initial product default; there is no separate
  fixed collection-count or batch-count cap. Available device/browser storage remains a limit.
- **A-002 — Local boundary**: “Current device” means the current browser profile and site data;
  other browsers, profiles, and devices do not share the collection. Browser/device removal of
  site data cannot be prevented, and private browsing may offer only temporary retention.
- **A-003 — Organization**: Favorites, filename search, and deletion fulfill organization needs
  for this release. Albums, tags, renaming, editing, sorting controls, and bulk deletion are excluded.
- **A-004 — Selection**: Random selection is uniform over eligible alternatives and may revisit
  earlier images after an intervening selection. There is no shuffle-deck or history requirement.
- **A-005 — Duplicates and names**: Reuploads are separate entries; filenames are retained
  rather than editable. Search includes the filename extension and ignores surrounding query spaces.
- **A-006 — Initial state**: Random opens with all images selected as its scope. New uploads are
  not favorited. Gallery starts with no query/filter, newest entries first; tied addition order
  follows selection order. Gallery state and Random scope remain independent during navigation.
- **A-007 — Deletion**: Deletion is per image, permanent within the app after confirmation,
  and has no undo or recovery feature. Source files outside the app are never deleted.
- **A-008 — Environment dependency**: The browser must permit persistent local storage for the
  retention requirement. Restricted storage must be handled as an explicit failure. Supported
  browsers, representative test devices, and storage feasibility are to be established in planning.
- **A-009 — Scope boundary**: No accounts, authentication, payments, backend, AI generation,
  social sharing, external stock-image services, backup/export, or cross-device sync are included.
  Full offline app launch and multi-tab synchronization are not promised for this release.

### Decisions Requiring Clarification

No blocking product clarification is required: each unspecified behavior has a concrete default
above. The size limit, duplicate handling, and selection behavior are explicit assumptions the
product owner may revise before planning. Browser support and representative performance-test
devices must be recorded during planning; technology and storage choices remain planning decisions.
