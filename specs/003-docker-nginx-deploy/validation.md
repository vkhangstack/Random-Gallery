# Deployment validation

Date: 2026-10-25. Deployment implementation and local smoke validation complete.

## Specification

- Feature directory: `specs/003-docker-nginx-deploy`.
- Specification: [spec.md](spec.md), resolved from the active spec template using `.specify/scripts/bash/resolve-template.sh`.
- All 16 specification quality checklist items pass. These are document review results, not runtime test counts.
- `.specify/feature.json` selects this feature. No Git repository exists; no branch created.
- `.specify/extensions.yml` was absent on pre/post checks; no specification hooks registered.
- Specification is ready for `$speckit-plan`; the user's explicit implementation request was also carried out.

## Implementation

- Root `Dockerfile`: Node 24 Alpine builder, `npm ci`, existing production build, then nginx stable Alpine runtime.
- Root `nginx.conf`: static files, application entry fallback, real 404s under `/assets/`, entry revalidation, immutable built assets, `/healthz`.
- Root `.dockerignore`: excludes local dependencies, generated artifacts, agent metadata, credentials and spec documentation. Existing tests remain build inputs because the existing production command typechecks them.
- README and [quickstart](quickstart.md): build, run, health, logs, stop/start, replacement, stable-origin storage and HTTPS requirements.
- No application source, existing tests, dependency manifest or lockfile changed.

## Actual execution

| Check | Actual result |
| --- | --- |
| `npm run typecheck` | Exit 0 |
| `npm test` | Exit 0; 19 passed, 0 failed, 0 skipped |
| `npm run build` | Exit 0 |
| `docker build -t random-gallery:local .` | Exit 0 after command-specific approval; clean context installed locked dependencies and built production assets |
| `docker run -d --name random-gallery -p 127.0.0.1:8080:80 random-gallery:local` | Exit 0 after command-specific approval |
| `node specs/003-docker-nginx-deploy/verify.mjs` | Exit 0 after command-specific approval; all three smoke groups below passed |
| `node --check specs/003-docker-nginx-deploy/verify.mjs` | Exit 0 |
| Final Docker inspection | `running healthy`; nginx 1.30.6; image size 26,051,702 bytes |

The sandboxed Docker build failed with socket permission denied; the approved retry succeeded.
The initial sandboxed smoke attempt failed at Chromium launch with Mach-port permission denied,
before assertions. It is not counted as a pass. The approved smoke attempt actually executed:

1. **HTTP/runtime group passed**: entry 200 and no-cache; both referenced JS/CSS resources 200 with correct MIME types and immutable cache policy; missing asset 404; `/gallery` returns the entry HTML; `/healthz` returns `ok`; `nginx -t` succeeds; runtime has neither `/app` nor a Node executable.
2. **Browser group passed**: Chromium 153.0.8010.12 uploads `landscape.png`, waits for saved state, commits a favorite and confirms it after refresh.
3. **Replacement group passed**: stopping the service causes the health request to reject; removing and recreating the container at the same origin restores availability; the same browser context retains the filename, favorite flag and decoded image blob.

The smoke script has three sequential groups, all executed, with zero failing groups and no
skipped groups. These are deployment checks, not a rerun of the complete existing browser suite.
Image: `sha256:08e394a1a921c601480eb9e9027731f61254acebf9a61f182f8291db7c95341a`.
The replacement container remains running on `http://127.0.0.1:8080`.

Build output reported two high-severity dependency advisories in the existing locked build
dependencies; no dependency upgrade was attempted as part of deployment configuration.

## Coverage and limits

- SC-001: passed build, HTTP assets and browser startup checks.
- SC-002: passed refresh and actual container replacement with the same live browser context.
- SC-003: passed running/stopped availability checks and missing resource response.
- SC-004: instructions reviewed in the deployment guide; no timed usability study claimed.
- Remote hosting, TLS/domain provisioning, physical devices, Firefox and WebKit were not tested.
- The preceding feature's full targeted run still has two Chromium focus-containment failures and missing Firefox/WebKit binaries; see [its validation](../002-responsive-favorites/validation.md). This deployment smoke does not resolve those issues or complete its T002.
