# Docker and nginx deployment

Prerequisites: Docker CLI, a running Docker engine, and access to the image registry and npm.
No host Node installation is needed to build or run the container.

From the project root:

```sh
docker build -t random-gallery:local .
docker run -d --name random-gallery -p 127.0.0.1:8080:80 random-gallery:local
curl --fail http://127.0.0.1:8080/healthz
docker inspect --format '{{.State.Health.Status}}' random-gallery
docker logs random-gallery
```

Open http://127.0.0.1:8080. If the port is occupied, change the host-side `8080`.
Health status initially reads `starting`; the check runs every 30 seconds.
Validate configuration with `docker exec random-gallery nginx -t`.

Verify the page and its scripts/styles return 200, `/assets/missing.js` returns 404,
and an application URL such as `/gallery` loads the entry page. Check `/index.html`
has `Cache-Control: no-cache`, and built `/assets/` resources have immutable caching.
In the browser upload a fixture, favorite it, and refresh. Restart and replace the service
at the same address, then confirm the image and favorite remain available.

With project dependencies and Playwright Chromium installed, the repeatable smoke check is:

```sh
node specs/003-docker-nginx-deploy/verify.mjs
```

It expects the container above to be running, stops and replaces `random-gallery` using
`random-gallery:local`, and leaves the replacement running. It checks HTTP responses and
browser data retention. Use that name for a disposable local deployment when running it.

Stop and restart:

```sh
docker stop random-gallery
docker start random-gallery
```

After stopping, `curl --fail http://127.0.0.1:8080/healthz` must fail to connect.
To replace with a rebuilt release (brief downtime):

```sh
docker build -t random-gallery:local .
docker stop random-gallery
docker rm random-gallery
docker run -d --name random-gallery -p 127.0.0.1:8080:80 random-gallery:local
```

Images and favorites remain in browser IndexedDB, so no container volume is needed.
Keep the same scheme, hostname, and port to retain access to that collection. Switching
from Vite's port to 8080 is a new origin and does not transfer existing images.
Clearing site data still deletes the collection. The container has no upload backend.

For public hosting, supply HTTPS through the hosting platform or a TLS proxy, forward to
container port 80, and choose a stable public origin. Domain/TLS setup and remote deployment
are outside this local setup. Application assets are built at image creation time;
runtime environment variables do not reconfigure the frontend.

The implementation follows Docker's [multi-stage build guidance](https://docs.docker.com/build/building/multi-stage/)
and nginx's [static-file serving guidance](https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/).
Base tags receive upstream updates; the npm dependency tree uses the existing lockfile.
See [validation.md](validation.md) for executed checks and remaining blockers.
