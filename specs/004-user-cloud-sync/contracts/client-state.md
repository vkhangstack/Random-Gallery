# Client State Contract

## Session and collection boundaries

- Initial state is checking-session, with private account content hidden.
- A confirmed session selects that account's cloud storage. A confirmed null session selects guest IndexedDB.
- A session lookup transport/server failure is not proof of an empty account. Show that account access is unavailable; guest data may still be used with clear labeling.
- Registration and login replace the current gallery instance with one keyed to the returned account ID. Sign-out replaces it with the guest instance only after session revocation succeeds.
- A cloud 401 clears the matching account view and prompts sign-in. A late 401 from an older account must not sign out a newer one.
- On identity changes, discard collection/query/preview state, revoke owned image object URLs, suppress late reads, and cancel remaining upload batch work. Old operations must never be replayed against a new account's cookie.
- Broadcast only an auth-changed notification across tabs on register/login/logout. Other tabs hide account content and recheck the session. Revalidate when returning to a tab as well. Never broadcast image data, passwords, or session tokens.
- Enforce expected-account headers on cloud operations even with client cancellation: cancellation alone cannot guarantee the server did not receive a request.

## Mutations and synchronization

- Guest writes retain current IndexedDB commit behavior.
- Account upload states are queued, validating, saving, saved or failed. Only remote confirmation yields saved.
- Favorite buttons display the last confirmed state while their write is pending; reject duplicate same-image mutations and keep prior state after failure.
- A failed delete leaves the image and collection unchanged. A successful delete removes it from the account; another browser observes removal after refresh.
- Manual refresh is available while signed in and disabled during local pending mutations. A failed refresh shows an error rather than claiming an empty saved collection.
- Session change during pending work is an identity transition, not a successful mutation.
- No automatic guest uploads, remote image caching in the guest database, background sync queue, or implicit merge occurs.

## Required browser scenarios

1. Register, sign out, invalid login, valid login and reload session restoration.
2. Upload JPEG, PNG and WebP in browser context A; same account in isolated context B reads names, favorites and decoded original images after refresh.
3. Favorite/delete in A; refresh B and verify current confirmed state.
4. Account B and anonymous requests cannot list or retrieve account A's image content or mutate its entries.
5. Seed guest images before login; sign in and confirm zero guest upload requests; sign out and verify original local images remain readable.
6. Hold an upload/read response, sign out, sign in as another account and release the response. Verify no prior image, saved outcome, preview URL or continuation request enters the new collection.
7. Change authentication in one tab; the other tab clears/rechecks private content before displaying the new identity.
8. Expire/revoke a session during a mutation; verify prompt, cleared account view and no false saved state.
9. Inject actual HTTP/network failures for upload/favorite/delete; verify errors, previous confirmed state, and explicit retry behavior.
10. Return from a hidden tab after session revocation; verify identity recheck.

These scenarios are acceptance requirements, not assertions that existing test sources already cover them or have executed.

## Dedicated authentication pages

Home contains Sign in and Create account links, never email/password fields or inline auth forms. `/sign-in` and `/sign-up` each render their own form and links to the other page/home, without gallery content. Requests and errors remain scoped to that page. On successful login/registration redirect to `/`; after session restoration, signed-in visits to either auth URL also redirect to `/`. Direct loads and reloads must work through nginx's entry fallback and Vite. Preserve the existing HTTP authentication contract.
