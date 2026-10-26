# Random Gallery

Upload JPEG, PNG and WebP images, discover a random image, favorite it, and browse or search your collection.

Guest images stay in IndexedDB on this browser/device. Clearing site data removes the guest collection.
With the Go backend running, create an account to store a private collection on your server and retrieve
it from another signed-in browser. Guest images are never uploaded automatically. Sign-in and sign-up
have dedicated pages at `/sign-in` and `/sign-up`; successful authentication returns to the gallery.

## Run locally

Requires Node 24+, Go 1.26 and project dependencies:

```sh
npm ci
```

Start the API in one terminal:

```sh
APP_ORIGIN=http://127.0.0.1:5173 npm run api
```

Start the frontend in another:

```sh
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open http://127.0.0.1:5173. The API persists to `server/data/gallery.sqlite` and Vite proxies
`/api` to port 3000. Guest mode remains available if account access is unavailable.

## Deploy with Docker and nginx

Requires Docker with a running engine:

```sh
docker compose up --build -d
```

Open http://127.0.0.1:8081. The frontend is served by nginx; the Go API runs as a non-root user
on the private Compose network. Accounts, sessions, image metadata and original bytes are stored
in the `gallery-data` named volume. Normal service recreation preserves it. `docker compose down
--volumes` deletes that account data; do not use it for routine updates.

For a different local port, set both settings consistently:

```sh
GALLERY_PORT=8091 APP_ORIGIN=http://127.0.0.1:8091 docker compose up --build -d
```

Public hosting requires a stable HTTPS endpoint and matching APP_ORIGIN. This local setup does
not provision a public host or TLS certificate. The [backend guide](specs/004-user-cloud-sync/quickstart.md)
covers operation, checks and backup/restore. Keep the same browser origin to retain access to guest data.

For a frontend-only guest deployment, the standalone nginx image is still available:

```sh
docker build -t random-gallery:local .
docker run -d --name random-gallery -p 127.0.0.1:8080:80 random-gallery:local
```

## Verify

```sh
npm run verify
npx playwright install chromium firefox webkit
npm run test:accounts
npm run test:e2e
```

`verify` runs frontend type checking/units/build and Go vet, race tests and binary build.
`test:accounts` briefly stops the normal Compose web service, runs each browser against a disposable
Compose project at port 8081, deletes only its test-created volumes, and restores the normal web service.
For an already running backend, use `npx playwright test -c playwright.accounts.config.ts` instead;
unique test accounts are created and authentication throttling applies.

`test:e2e` runs the existing guest production-preview suite on port 4173. These suites have distinct
storage and deployment assumptions.
