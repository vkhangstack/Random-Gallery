# Feature Specification: Fixed Favorites Icon Size

**Feature Branch**: None created; current branch is `main`.

**Created**: 2026-10-26

**Updated**: 2026-10-27

**Status**: Draft

**Input**: User description: "update spec 005 giảm size icon to 24px"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Toggle favorites without changing icon size (Priority: P1)

As a user viewing an image in Gallery, Random, or preview, I want the Favorites icon
to remain 24 × 24 pixels whether the image is favorited or not, so the control stays
visually consistent when I add or remove a favorite.

**Why this priority**: This directly addresses the requested fixed size and prevents
the Favorites control from shifting as its state changes.

**Independent Test**: In each of the three views, compare the Favorites icon before
and after adding and removing a favorite. Verify its dimensions and position, its
state indicator, and the resulting favorite status. Measure the icon separately from the clickable
target to verify the 24 × 24 pixel icon and minimum 44 × 44 pixel target.

**Acceptance Scenarios**:

1. **Given** an image that is not a favorite, **When** its Favorites icon is displayed,
   **Then** the icon occupies a 24 × 24 pixel display box and indicates the inactive state.
2. **Given** a favorited image, **When** its Favorites icon is displayed, **Then** the
   icon occupies the same 24 × 24 pixel display box and indicates the active state.
3. **Given** a Favorites icon in either state, **When** the user toggles the state
   successfully, **Then** its display box remains 24 × 24 pixels, its center stays in
   the same position, and neighboring content does not move because of the icon change.
4. **Given** an image remains visible after toggling, **When** the user toggles it back,
   **Then** the prior favorite status is restored with the same icon size and alignment.
5. **Given** the existing favorites-only filter, **When** the user removes a favorite,
   **Then** existing filtering and empty-state behavior continues to apply.

### Edge Cases

- Switching between outlined and filled hearts must not change the icon display box
  even when their visible strokes occupy different portions of that box.
- A pending or failed favorite update must retain the 24 × 24 pixel display box and
  follow the existing pending, failure, and retry behavior.
- Narrow screens and long image names must not shrink or clip the icon or overlap
  neighboring actions.
- Light and dark themes must retain the same dimensions in both favorite states.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every image Favorites icon in Gallery, Random, and preview MUST have a
  fixed display box exactly 24 pixels wide and 24 pixels high in both active and
  inactive states.
- **FR-002**: Changing favorite state MUST preserve the icon display box dimensions,
  center position, and neighboring content positions while the image remains visible.
- **FR-003**: The icon MUST continue to distinguish active and inactive states using
  the existing filled and outlined heart indicators.
- **FR-004**: The fixed icon dimensions MUST apply across supported screen sizes and
  both themes, including while a favorite change is pending or has failed. The icon
  MUST remain fully visible without shrinking or overlapping adjacent actions.
- **FR-005**: Adding and removing favorites, persistence, filtering, keyboard operation,
  accessible action names, and focus behavior MUST retain their existing behavior.
  The clickable target MUST contain and center the entire icon display box and remain
  at least 44 × 44 pixels in both active and inactive states.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In all three image views, 100% of active and inactive Favorites icons
  measure 24 × 24 pixels at screen widths of 320, 375, 768, and 1440 pixels in both themes;
  every clickable target remains at least 44 × 44 pixels.
- **SC-002**: A complete inactive → active → inactive cycle in each view produces
  zero change in icon display box dimensions or center position and zero movement
  of neighboring content caused by the state indicator, where the image remains visible.
- **SC-003**: Users can add and remove a favorite using pointer or keyboard in each
  view, recognize its current state, and retain the saved state after refreshing;
  all checked journeys preserve the existing behavior.
- **SC-004**: Pending and failed updates, and long image names at 320 pixels screen
  width, produce zero clipped, shrunken, or overlapping Favorites icons.

## Assumptions

- **A-001 — Terminology**: “farvories” means Favorites; active means favorited and
  “unactive” means inactive or not favorited.
- **A-002 — Measurement**: The requested 24px means a 24 × 24 pixel icon display box
  at normal page zoom. The visible heart preserves its proportions within this box;
  its individual painted strokes need not fill every pixel. This revision replaces
  the earlier 44 × 44 pixel icon requirement in spec 005. The minimum clickable target
  remains 44 × 44 pixels; reducing the icon does not reduce the minimum target size.
- **A-003 — Scope**: The request applies to image favorite actions in Gallery, Random,
  and preview. Favorites-only filters and unrelated icons are outside this change.
- **A-004 — Dependencies**: Existing favorite state, persistence, and control behavior
  are reused. No new favorite capability or data changes are required.
