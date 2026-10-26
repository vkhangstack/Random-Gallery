# Feature Specification: User Authentication and Private Image Sync

**Feature Branch**: None (workspace has no Git repository)

**Created**: 2026-10-25

**Status**: Implemented and feature-004 acceptance verified; broader guest focus failures recorded in validation.md.

**Input**: User description: "define and implement backend, has feature authentication and save sync image to cloud within user". Follow-up: self-hosted option B; "update plan 004 server build with golang within hexalgonal architucture".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Access a private account (Priority: P1)

As a visitor, I can create an account, sign in, and sign out so my cloud collection belongs to me.

**Why this priority**: Account identity establishes ownership before any image can be saved remotely.

**Independent Test**: Create two accounts, sign in separately, and confirm sign-out removes access to the signed-in collection.

**Acceptance Scenarios**:

1. **Given** valid registration details, **When** a visitor creates an account and signs in, **Then** the application identifies the account and opens its private collection.
2. **Given** invalid credentials or an expired session, **When** access is attempted, **Then** access is refused with an actionable message and no private images are disclosed.
3. **Given** a guest on the home page, **When** they choose Sign in or Create account, **Then** the browser opens the dedicated `/sign-in` or `/sign-up` URL with no gallery or embedded home-page form; direct navigation and reload work, successful authentication returns home, and a signed-in user visiting either auth URL is redirected home.
4. **Given** a signed-in account, **When** the user signs out or switches accounts, **Then** the former account's collection, previews, and pending responses are removed from the visible application.

---

### User Story 2 - Save and retrieve a cloud collection (Priority: P1)

As a signed-in user, I can upload images and see my saved collection from another browser after signing in to the same account.

**Why this priority**: Cross-device access is the reason to introduce cloud persistence.

**Independent Test**: Upload in one isolated browser, then sign in to the same account in another and retrieve the original image and metadata.

**Acceptance Scenarios**:

1. **Given** a signed-in user and a supported image, **When** upload completes, **Then** saved state appears only after the remote image and metadata are durably stored.
2. **Given** an existing cloud collection, **When** the same account signs in from another browser or refreshes the collection, **Then** it can read the saved images, names, ordering metadata, and favorite flags.
3. **Given** a disconnected or failed upload, **When** the request fails, **Then** the application reports failure without claiming the image was saved and allows retry.

---

### User Story 3 - Keep account changes consistent and private (Priority: P2)

As a user, I can favorite or delete my images and retrieve the resulting collection elsewhere without affecting another user's data.

**Why this priority**: Ownership and confirmed changes must apply to all collection operations.

**Independent Test**: Change favorites and delete an image, refresh a second browser, and attempt the same resource operations using another account and no account.

**Acceptance Scenarios**:

1. **Given** a saved image, **When** its favorite flag changes or deletion completes, **Then** refreshing another signed-in browser reflects the confirmed change.
2. **Given** another account's image identifier, **When** a user attempts to list, read, update, replace, or delete that image, **Then** the service refuses access and the owner's data is unchanged.
3. **Given** an existing browser-local guest collection, **When** a user signs in, **Then** guest images are not automatically uploaded or attributed to that account; signing out restores access to the guest collection.

### Edge Cases

- Expired sessions and account switches during an upload or image read cannot expose stale account data.
- Corrupt, unsupported, empty, or oversized images are rejected by the service even if client checks are bypassed.
- Duplicate requests cannot overwrite a different user's image or create falsely confirmed saved entries.
- Partial remote writes must not appear as successfully saved images; cleanup failures must remain recoverable.
- Unavailable remote storage produces a visible failure and retry path rather than an empty-collection success.
- Concurrent updates use the last successfully committed write; another browser retrieves updates when refreshing the collection.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Visitors MUST be able to register, sign in, and sign out using an individual account.
- **FR-002**: The service MUST authenticate every private collection operation and derive its owner from the authenticated session, never from a caller-selected owner identifier.
- **FR-003**: Images and their metadata MUST be readable and mutable only by their owner; image content MUST NOT be publicly accessible by guessing an identifier or URL.
- **FR-004**: Signed-in users MUST be able to upload, list, view, favorite, and delete their own images through the existing gallery interface.
- **FR-005**: Confirmed images, names, favorite flags, and collection ordering MUST survive browser refresh and be retrievable by the same user in another browser.
- **FR-006**: The application MUST distinguish pending, confirmed, and failed remote operations and allow failed operations to be retried without claiming success prematurely.
- **FR-007**: The service MUST enforce supported JPEG, PNG, and WebP image content, valid metadata, and the existing 10 MiB per-image limit independently of the client.
- **FR-008**: Sign-out, session expiry, and account changes MUST prevent old account responses or image URLs from appearing in a new account's interface.
- **FR-009**: Existing guest collections MUST remain available locally and MUST NOT be uploaded automatically; the interface MUST clearly identify local versus account-backed storage.
- **FR-010**: Remote updates MUST become available on sign-in, page reload, and an explicit collection refresh. Offline mutation queues and live collaboration are outside the first release.
- **FR-011**: Credentials and private server secrets MUST NOT be included in frontend assets, logs, or versioned configuration. Public operation MUST use an encrypted connection.
- **FR-012**: Operators MUST have documented setup, persistent storage, configuration, startup, and validation instructions compatible with the existing container deployment.

- **FR-013**: Sign-in and sign-up MUST be separate pages at `/sign-in` and `/sign-up`; home MUST contain navigation links rather than embedded authentication forms. Each auth page MUST link to the other auth page and home, and direct navigation/reload MUST work through nginx and development hosting.
- **FR-014**: Successful registration/login MUST redirect to home; signed-in visitors opening an auth page MUST be redirected home. Failed submissions MUST remain on the dedicated auth page with actionable errors and without exposing private images.

### Key Entities

- **User account**: Authenticated identity that owns a private collection.
- **Session**: Revocable or expiring proof of authentication, scoped to an individual user.
- **Cloud image**: Owner-associated image content and metadata, including identifier, original name, media type, byte size, added time, ordering, and favorite flag.
- **Guest collection**: Existing browser-local image collection, separate from any authenticated account.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can register, sign in, and sign out successfully using the documented flow; invalid credentials never reveal a private collection.
- **SC-002**: Three supported image formats uploaded by one account are readable with matching names and favorite flags in a second isolated browser after refresh, with zero lost confirmed entries.
- **SC-003**: All unauthenticated and cross-account list/read/update/delete checks deny access and leave the owner's images unchanged.
- **SC-004**: Injected upload, favorite, deletion, and connectivity failures produce zero false saved confirmations and preserve the last confirmed collection state.
- **SC-005**: Signing out and switching accounts during pending requests produces zero visible images or metadata belonging to the previous account.
- **SC-006**: Existing guest images remain unchanged after one sign-in/sign-out cycle, with zero automatic remote uploads.

- **SC-007**: Direct navigation, home-link navigation and reload of both auth URLs succeed; home renders zero email/password fields, neither auth page renders the gallery, and successful/signed-in redirects land at home in every executed browser case.

## Assumptions

- Email and password registration/sign-in are the default; social sign-in, sharing, administration, billing, and account recovery are outside the initial implementation unless the selected identity provider supplies them.
- Synchronization means an account's remotely confirmed collection is retrieved on sign-in, reload, or explicit refresh. Background offline synchronization is outside scope.
- Remote writes are authoritative while signed in. Guest mode retains the existing local behavior; existing images can be manually re-uploaded to an account.
- The user selected option B: a self-hosted backend and private storage within the Docker deployment. Operator-managed server storage constitutes the cloud collection when deployed to a reachable host.
- The user requires the backend to be written in Go using hexagonal architecture. This is an explicit delivery constraint; package layout and adapter choices belong in the plan. It supersedes the earlier Node backend draft without changing account or sync behavior.
- No cloud project, credentials, deployment destination, or paid service provisioning has been supplied. A configured implementation and actual local validation do not constitute a completed public cloud deployment.
