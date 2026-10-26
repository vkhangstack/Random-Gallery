# Feature Specification: Responsive Layout and Favorites Controls

**Feature Branch**: None created; feature directory is `specs/002-responsive-favorites`.

**Created**: 2026-10-25

**Status**: Draft — requirements validated; ready for planning

**Input**: User description: “handle responsive and refactor icon farvories”.
Interpreted as improving Random Gallery's responsive layouts and standardizing its favorites
icon and controls across Gallery, Random, and the larger image preview.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Use the collection at any supported screen size (Priority: P1)

As a user, I want the existing collection screens and dialogs to adapt to my available space
so I can use the app on a phone, tablet, or desktop without clipped content or hidden actions.

**Why this priority**: Upload, discovery, and collection management depend on reachable controls.

**Independent Test**: Use empty, populated, processing, and failed-operation states at narrow and
wide screen sizes. Assess all existing screens with long filenames, portrait/landscape images,
and both themes, without requiring any change to the favorite icon design.

**Acceptance Scenarios**:

1. **Given** a screen between 320 and 1440 pixels wide, **When** I use Random, Gallery, upload,
   or a dialog, **Then** content fits the available width without horizontal page scrolling,
   overlapping controls, or clipped action labels.
2. **Given** a narrow screen and long filenames or error messages, **When** they appear,
   **Then** text wraps or shortens within its available space; the full filename remains
   accessible and adjacent controls remain reachable.
3. **Given** a larger image preview or deletion prompt on a short landscape screen, **When**
   its content exceeds the available height, **Then** vertical scrolling allows access to every
   action without moving controls outside a reachable area.
4. **Given** an open image, search query, selected scope, or favorite filter, **When** I resize
   the screen or change orientation, **Then** those selections remain intact and usable.
5. **Given** a desktop view at 200% zoom, **When** I browse or manage images, **Then** content
   reflows without obscuring primary actions or requiring horizontal page scrolling.

---

### User Story 2 - Recognize the same favorites control everywhere (Priority: P1)

As a user, I want a consistent heart icon and clear saved state so I can identify and change
favorites from Gallery, Random, and the larger preview without relearning the control.

**Why this priority**: A consistent state indicator makes the existing favorite action predictable.

**Independent Test**: Use a seeded collection containing favorite and non-favorite images. Compare
and operate the control in all three contexts, independently of responsive layout changes.

**Acceptance Scenarios**:

1. **Given** an image that is not a favorite, **When** I see its favorite control in any view,
   **Then** it uses the same outlined heart shape and visual size.
2. **Given** a saved favorite, **When** I see its control, **Then** it uses the matching filled
   heart; state remains distinguishable without relying on color or hover.
3. **Given** an available favorite control, **When** I activate it, **Then** the requested change
   is pending until saved, duplicate actions for that image are prevented, and every view agrees
   after success. The control's shape/position does not jump during the operation.
4. **Given** a favorite change cannot be saved, **When** the operation fails, **Then** the prior
   saved heart state remains, an actionable message is available in the current view, and I can retry.
5. **Given** favorites-only scope or filtering, **When** I remove a favorite, **Then** existing
   eligibility and empty-state rules still apply; an inspected Gallery image remains open until
   dismissed, while Random shows an eligible image or the favorites empty state.

---

### User Story 3 - Operate favorites with touch, keyboard, and assistive technology (Priority: P2)

As a user, I want a sufficiently large target, a visible focus indicator, and a meaningful action
name so I can operate favorites regardless of input method or visual theme.

**Why this priority**: Visual consistency must also make the existing action usable and understandable.

**Independent Test**: With a populated collection, assess each favorite control's target area,
keyboard behavior, accessible name, pressed state, and focus in both themes and inside dialogs.

**Acceptance Scenarios**:

1. **Given** any favorite control, **When** I use touch, **Then** its target is at least 44 × 44
   pixels and does not overlap an image-opening, deletion, or neighboring favorite target.
2. **Given** keyboard input, **When** I focus a favorite control and use Enter or Space,
   **Then** it supports the same operation as touch and shows a visible focus indicator.
3. **Given** assistive technology, **When** I encounter the control, **Then** it has an
   image-specific action name such as “Favorite beach.jpg” or “Unfavorite beach.jpg”, exposes
   the saved pressed state, and does not announce a second decorative heart label.
4. **Given** the image's thumbnail disappears from filtered results while its preview is open,
   **When** I dismiss the preview, **Then** focus returns to a surviving thumbnail or Gallery's
   main controls, rather than being lost.

### Edge Cases

- Very long, spaced, or non-Latin filenames must not push actions outside their container.
- Zero images, zero favorites, one image, and no search results retain their distinct guidance.
- Portrait, landscape, and square images keep their aspect ratio; whole-image views remain uncropped.
- A short viewport may require vertical scrolling in dialogs; every action and focus indicator
  must remain reachable without trapping content offscreen.
- Pending, failed, and retried favorites must not imply an unsaved favorite was persisted.
- Rapid repeated activation while a favorite change is pending must not cause duplicate requests
  or inconsistent saved states.
- Removing the final favorite must preserve valid viewer/empty states and logical focus.
- Resizing during a pending operation must preserve its status and the selected image.
- Different text fonts or operating-system character rendering must not change the recognizable
  heart silhouette or produce a missing-character box in one view.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Existing navigation, upload controls, Gallery, Random, previews, deletion prompts,
  and their loading/empty/error states MUST fit widths from 320 through 1440 pixels without
  horizontal page scrolling, control overlap, or clipped action labels.
- **FR-002**: Gallery thumbnails MUST adapt to available width, preserve image proportions,
  and leave filenames and favorite actions reachable. Random and larger previews MUST continue
  to display the whole image without cropping or distortion.
- **FR-003**: Long filenames and messages MUST remain within their containers. Full filenames
  MUST be available to assistive technology even when shortened visually.
- **FR-004**: Dialog content exceeding available height MUST support vertical access to every
  action. Opening, dismissal, and focus containment MUST remain usable on short landscape screens.
- **FR-005**: Resizing, orientation changes, and desktop zoom to 200% MUST preserve the current
  destination, selected image, query, filter, scope, and any pending favorite operation.
- **FR-006**: Gallery, Random, and larger previews MUST use a consistent 24 × 24 pixel heart
  silhouette for favorites: outlined for non-favorite and filled for saved favorite. Its shape
  and dimensions MUST remain consistent across supported environments and themes.
- **FR-007**: Every favorite control MUST have a target at least 44 × 44 pixels, with distinct,
  non-overlapping activation areas for adjacent actions.
- **FR-008**: Favorite state MUST be distinguishable by outline versus fill without depending
  on color or hover. The control MUST retain its position and target dimensions while pending.
- **FR-009**: Every favorite control MUST support keyboard activation, visible focus, an
  image-specific action name, and a programmatically exposed saved pressed state. The decorative
  heart MUST NOT add redundant accessible content.
- **FR-010**: A pending favorite change MUST prevent conflicting favorite actions for the same
  image and retain the previous saved state until success. Success MUST appear consistently in
  all views; failure MUST retain the prior state and provide an actionable message and retry.
- **FR-011**: Favoriting from a Gallery thumbnail MUST NOT open the image preview or trigger
  deletion. A preview whose image leaves filtered results MUST stay open until dismissed.
- **FR-012**: Preview dismissal MUST restore focus to its initiating control when present, or
  to a surviving thumbnail or Gallery main controls when that initiator is no longer available.
- **FR-013**: Both themes MUST retain at least 4.5:1 normal-text contrast and 3:1 large-text,
  favorite-icon, relevant control-boundary, and focus-indicator contrast against adjacent surfaces.
- **FR-014**: This change MUST preserve existing collection data, favorite persistence, Random
  eligibility/non-repeat rules, search/filter behavior, deletion confirmation, and device-only
  privacy requirements defined in the baseline specification.

### Key Entities *(include if feature involves data)*

- **Image entry**: Existing stored image identity, filename, and saved favorite state. No new
  image data or collection structure is required by this feature.
- **Favorite control state**: Saved favorite/non-favorite state plus temporary pending or error
  feedback for that image, presented consistently across the three existing contexts.
- **View context**: Existing destination, selected image, search/filter/scope, and focus origin;
  these remain stable through responsive layout changes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At widths 320, 375, 414, 768, and 1440 pixels, with heights 320 and 800 pixels,
  both themes satisfy FR-001–004 across empty/populated views, processing/error states, preview,
  and confirmation: zero horizontal page overflow, overlapping action areas, or unreachable actions.
- **SC-002**: At 200% zoom from a desktop viewport 1280 pixels wide, all primary controls remain
  reachable without horizontal page scrolling; portrait-to-landscape changes preserve all view
  selections and pending-operation state in every assessed case.
- **SC-003**: All favorite controls in Gallery, Random, and preview have a consistent 24 × 24
  pixel outlined/filled heart and a target of at least 44 × 44 pixels in both themes; every control
  meets FR-008/009/013 for state distinction, accessible naming, and focus/contrast.
- **SC-004**: In each of the three favorite contexts, successful, pending, failed, retried, and
  repeated-activation scenarios satisfy FR-010/011 with zero false saved-state indications or
  unintended preview/deletion actions.
- **SC-005**: The full favorite operation and preview-dismissal journey is completable using
  keyboard alone in all three contexts, with correct saved pressed state and logical focus after
  removal from favorites results; there are zero missing or redundant control names.
- **SC-006**: A collection containing favorite/non-favorite images retains every saved entry and
  favorite after the update and refresh in the same browser profile. Existing Random scope,
  immediate-repeat prevention, search/filter, and confirmed-deletion scenarios retain their
  baseline outcomes.

## Assumptions

- **A-001 — Wording**: “farvories” refers to the existing favorites action and its icon.
- **A-002 — Scope**: “Responsive” covers existing Random Gallery screens and states, not a new
  navigation scheme or overall visual redesign. Baseline rules are in
  [001-random-gallery/spec.md](../001-random-gallery/spec.md); this is an incremental enhancement.
- **A-003 — Visual default**: Preserve the current heart metaphor. The initial shared visual
  size is 24 × 24 pixels inside a minimum 44 × 44 pixel target; outline/fill communicates state.
  No new icon family or unrelated icon changes are requested.
- **A-004 — Supported environments**: Use the baseline browser and device scope established
  during planning. Browser viewport emulation and actual touch-device checks are distinct evidence.
- **A-005 — Dependencies**: Existing collection, persistence, and favorite behavior provide the
  baseline. Their known unfinished tasks and external verification blockers remain in the original
  feature; this spec does not assert those earlier tasks are complete or replace their requirements.
- **A-006 — Planning boundary**: Internal refactoring, asset representation, and reuse decisions
  belong to planning. No storage migration, new favorite capability, backend, or external service
  is needed to satisfy these user-visible outcomes.

### Decisions Requiring Clarification

No blocking clarification remains under these assumptions. The heart metaphor and 24/44-pixel
sizes are explicit defaults for product review. Exact layout breakpoints and internal icon reuse
are planning decisions; the observable behavior and acceptance sizes are fixed by this spec.
