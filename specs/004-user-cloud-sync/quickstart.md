# Account Backend: Setup and Validation

This guide validates the Go implementation; the superseded Node API draft has been removed. Actual command results belong in [validation.md](validation.md). See [API contract](contracts/http-api.md), [client-state contract](contracts/client-state.md), and [data model](data-model.md).

## Prerequisites

- Go 1.26 for backend development/tests; Node 24 for frontend tooling and installed project dependencies (`npm ci`), and a running Docker engine for deployment checks.
- Playwright browser binaries for browser validation; use `npx playwright install chromium firefox webkit` when needed.
- Network access to obtain locked dependencies and container images.
- Free local port 8081 for Compose. The older standalone nginx deployment on 8080 can remain separate.

## Compose deployment

From the repository root:

```sh
docker compose up --build -d
docker compose ps
curl --fail http://127.0.0.1:8081/api/health
docker compose logs api web
```

Open http://127.0.0.1:8081. Register an email/password account, upload fixtures and verify account-specific storage labels. No cloud credentials are needed for self-hosted storage. The API image must compile Go in a builder stage and run only the resulting binary; Node remains frontend tooling. The private API listens on port 3000 only inside the Compose network.

APP_ORIGIN defaults to `http://127.0.0.1:8081`. The browser address must match it exactly, including hostname and port. To use a different local port, set both values consistently:

```sh
GALLERY_PORT=8091 APP_ORIGIN=http://127.0.0.1:8091 docker compose up --build -d
```

For public hosting, provide a stable HTTPS endpoint and TLS proxy, set APP_ORIGIN to that exact HTTPS origin, and forward traffic to nginx. HTTP loopback is a development configuration; this guide does not deploy a public domain or TLS service.

## Host development

In one terminal, start the API with the Vite page origin:

```sh
cd server
APP_ORIGIN=http://127.0.0.1:5173 go run ./cmd/api
```

In another:

```sh
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open http://127.0.0.1:5173. Vite forwards `/api` to port 3000. When launched from `server/`, local API data defaults to `server/data/gallery.sqlite`; this directory must remain ignored by Git and Docker build context. nginx's standalone image still serves guest mode; account mode requires the API.

## Automated baseline and API checks

From the repository root:

```sh
npm run typecheck
npm test
npm run build
```

From `server/`:

```sh
go mod download
go test ./...
go test -race ./...
go vet ./...
CGO_ENABLED=0 go build -o /tmp/random-gallery-api ./cmd/api
```

Pin module versions in `go.mod`/`go.sum`. The host race detector may require a C toolchain even though the production binary uses CGO_ENABLED=0. Also verify imports with `go list -json ./...`: domain/application must not import concrete adapters, net/http, database/sql, or driver types.

The API tests bind temporary localhost ports. If sandbox policy denies binding, request approval for that exact Go command before retry. Record infrastructure failures as failures/not-run, not passing assertions.

Run account browser scenarios against the Compose-served page using playwright.accounts.config.ts, without the guest Vite-preview webServer. Use the implemented isolated browser command below. The existing `npm run test:e2e` still tests the guest production-preview application, not the Compose backend. Run it as regression evidence and record known focus failures or missing browser binaries separately.

## End-to-end acceptance

Use the scenarios in [client-state.md](contracts/client-state.md). At minimum use two isolated browser contexts, two accounts, all three fixture formats, direct anonymous/cross-account content probes, guest preservation, delayed requests across identity changes, and injected failures. Record actual browser versions and passed/failed/skipped/not-run counts. API tests do not replace these browser journeys.

## Persistent volume and replacement

Upload an image and favorite it. Recreate the services, then sign in and check the name, favorite flag, original image bytes and decoded image in another browser:

```sh
docker compose up -d --build --force-recreate
```

Verify API health, cookie authentication, cloud collection and guest collection separately. Stop/start also must preserve account data:

```sh
docker compose stop
docker compose start
```

Normal `docker compose down` preserves the named volume. **Do not add `--volumes`** unless intentionally deleting all accounts, sessions and cloud images. All these records reside in `gallery-data` at `/data`; there is no external object store copy.

## Backup and restore

Before copying a volume backup, stop the API and archive the entire volume, including any SQLite WAL files, using an operator-controlled Docker volume backup procedure. Protect archives as private data. Restore into the same stopped service's volume, retain the correct ownership for the image's `node` user, then restart and verify registration/login plus original image retrieval. Do not copy only a live `gallery.sqlite` file while WAL writes are active. Online backups require SQLite's [backup API](https://www.sqlite.org/backup.html).

Test restore using a disposable copy before relying on a backup. Backup/restore is a validation requirement until an actual restore result is recorded.

## Implemented commands and dedicated auth routes

The Go implementation is now present; the historical Node API files are removed. From the root,
`npm run api`, `npm run test:backend`, `npm run check:backend` and `npm run verify` provide the
host commands above. Run `go mod download` from `server/` after checkout. Open `/sign-in` or
`/sign-up` directly, reload each, verify no gallery appears on those pages, and verify home has
only account navigation links. Successful registration/login and signed-in auth-page visits return home.

The account browser command is now executable:

```sh
npm run test:accounts
```

It runs all three browser projects against separate disposable Compose stacks at 8081, avoiding
shared throttle counters/cookies. The normal web service is stopped temporarily and restored; its
API/data volume is never removed. Reports are saved under this feature's `evidence/`. To run one
engine use `node tests/deployment/run-account-tests.mjs chromium` (or firefox/webkit). `GALLERY_TEST_GREP`
can select a diagnostic subset; never describe subset results as a full-suite pass.

The persistence/restore integration check is:

```sh
node tests/deployment/cloud-persistence.mjs
```

It uses ports 8082 and 8083, creates randomly named test-owned projects/volumes and a private
local temporary archive, verifies restart/recreation plus a separate restored volume and original
image bytes/credentials/favorites, then removes only those test resources and temporary archive.
The normal deployment and its volume remain intact.

## Concrete stopped-volume backup procedure

Choose a private existing host directory (replace the example path). Keep the API stopped during
both backup and restore. Discover the actual mounted volume rather than assuming a project prefix:

```sh
docker compose stop api
docker compose ps -a -q api
```

Using the printed container ID, run `docker inspect <container-id>` and identify the named volume
mounted at `/data`. Back it up using a temporary helper (replace both example paths/names):

```sh
docker run --rm -v <data-volume>:/source:ro -v /absolute/private/backup:/backup alpine:3.23 tar czf /backup/gallery.tar.gz -C /source .
docker compose start api
```

Before restore, stop the target API, preserve its current volume separately, and restore into an
empty target volume with the same service ownership. Restore all archived files, not only the main
SQLite file. First validate a separate disposable target as the integration script does:

```sh
docker run --rm -v <empty-target-volume>:/target -v /absolute/private/backup:/backup:ro alpine:3.23 tar xzf /backup/gallery.tar.gz -C /target
```

Start the target API and verify health, credentials, image bytes and favorites before switching a
production deployment. Protect archives as private account data; they contain original images and
password/session verifiers. No public TLS/restore result is claimed unless validation.md records it.
