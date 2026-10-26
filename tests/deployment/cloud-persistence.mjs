// Integration check using only randomly named test projects, test accounts and disposable volumes.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, expect } from "playwright/test";
const project = `gallery-persist-${randomUUID().slice(0, 8)}`;
const restored = `${project}-restore`;
const scratch = mkdtempSync(join(tmpdir(), "gallery-backup-"));
const origin = "http://127.0.0.1:8082";
const restoreOrigin = "http://127.0.0.1:8083";
const email = `${randomUUID()}@example.test`;
const password = "test owned backup verification password";
const checks = [];
const docker = (...args) => execFileSync("docker", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 32 * 1024 * 1024 });
function compose(name, port, ...args) {
  return execFileSync("docker", ["compose", "-p", name, ...args], {
    encoding: "utf8", env: { ...process.env, GALLERY_PORT: String(port), APP_ORIGIN: `http://127.0.0.1:${port}` },
    stdio: ["ignore", "pipe", "pipe"], maxBuffer: 32 * 1024 * 1024,
  });
}
async function ready(base) {
  await expect.poll(async () => { try { return (await fetch(`${base}/api/health`)).status; } catch { return 0; } }, { timeout: 45000 }).toBe(200);
}
async function call(base, path, cookie, init = {}) {
  const response = await fetch(base + "/api" + path, { ...init, headers: { Origin: base, ...(cookie ? { Cookie: cookie } : {}), ...init.headers } });
  assert.ok(response.ok, `API ${path}: ${response.status}`);
  return response;
}
const credentials = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) };
let browser;
try {
  compose(project, 8082, "up", "--build", "-d", "--wait"); await ready(origin);
  assert.notEqual(compose(project, 8082, "exec", "-T", "api", "id", "-u").trim(), "0");
  compose(project, 8082, "exec", "-T", "api", "sh", "-c", "! command -v node && ! command -v go");
  compose(project, 8082, "exec", "-T", "web", "nginx", "-t");
  const apiID = compose(project, 8082, "ps", "-q", "api").trim();
  const inspection = JSON.parse(docker("inspect", apiID))[0];
  assert.ok(Object.values(inspection.NetworkSettings.Ports || {}).every(value => value === null));
  assert.equal((await fetch(origin + "/api/auth/logout", { method: "POST", headers: { Origin: "https://invalid.example" } })).status, 403);
  checks.push("non-root Go-only runtime, private API port, nginx configuration, origin denial, proxied health");
  browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(origin);
  await page.getByLabel("Upload images").setInputFiles("tests/fixtures/landscape.png");
  await expect(page.getByText("1 saved · 0 failed")).toBeVisible();
  const guestHash = () => page.evaluate(async () => {
    const db = await new Promise(resolve => { const r = indexedDB.open("random-gallery", 1); r.onsuccess = () => resolve(r.result); });
    const blobs = await new Promise(resolve => { const r = db.transaction("blobs").objectStore("blobs").getAll(); r.onsuccess = () => resolve(r.result); });
    db.close();
    const hash = await crypto.subtle.digest("SHA-256", (blobs[0].blob instanceof Blob ? await blobs[0].blob.arrayBuffer() : blobs[0].blob));
    return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
  });
  const guestBefore = await guestHash();
  const registered = await call(origin, "/auth/register", "", credentials);
  const cookie = registered.headers.get("set-cookie").split(";")[0];
  for (const name of ["landscape.png", "portrait.jpg", "square.webp"]) {
    const bytes = readFileSync(`tests/fixtures/${name}`), id = randomUUID();
    const body = new FormData();
    body.append("metadata", JSON.stringify({ id, batchId: randomUUID(), name, favorite: false, addedAt: Date.now(), ordinal: 0 }));
    body.append("file", new Blob([bytes]), name);
    await call(origin, "/images", cookie, { method: "POST", body });
  }
  const initial = await call(origin, "/images", cookie).then(r => r.json());
  const favoriteID = initial[0].id;
  await call(origin, `/images/${favoriteID}`, cookie, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: '{"favorite":true}' });
  async function verify(base, session) {
    const images = await call(base, "/images", session).then(r => r.json());
    assert.equal(images.length, 3); assert.equal(images.find(image => image.id === favoriteID).favorite, true);
    for (const image of images) {
      const bytes = Buffer.from(await call(base, `/images/${image.id}/content`, session).then(r => r.arrayBuffer()));
      assert.deepEqual(bytes, readFileSync(`tests/fixtures/${image.name}`));
    }
  }
  compose(project, 8082, "restart", "api"); await ready(origin); await verify(origin, cookie);
  checks.push("API restart preserves all image bytes and favorite state");
  compose(project, 8082, "up", "-d", "--force-recreate", "--wait", "api"); await ready(origin); await verify(origin, cookie);
  checks.push("API container replacement preserves accounts, sessions and all image bytes");
  compose(project, 8082, "stop", "api");
  assert.notEqual((await fetch(origin + "/api/health")).status, 200);
  const sourceID = compose(project, 8082, "ps", "-a", "-q", "api").trim();
  const sourceVolume = JSON.parse(docker("inspect", sourceID))[0].Mounts.find(m => m.Destination === "/data").Name;
  assert.ok(sourceVolume.startsWith(project));
  docker("run", "--rm", "-v", `${sourceVolume}:/source:ro`, "-v", `${scratch}:/backup`, "alpine:3.23", "tar", "czf", "/backup/gallery.tar.gz", "-C", "/source", ".");
  compose(restored, 8083, "create", "--build", "api");
  const restoreID = compose(restored, 8083, "ps", "-a", "-q", "api").trim();
  const restoreVolume = JSON.parse(docker("inspect", restoreID))[0].Mounts.find(m => m.Destination === "/data").Name;
  assert.ok(restoreVolume.startsWith(restored));
  docker("run", "--rm", "-v", `${restoreVolume}:/target`, "-v", `${scratch}:/backup:ro`, "alpine:3.23", "tar", "xzf", "/backup/gallery.tar.gz", "-C", "/target");
  compose(restored, 8083, "up", "-d", "--wait"); await ready(restoreOrigin);
  const login = await call(restoreOrigin, "/auth/login", "", credentials);
  const restoredCookie = login.headers.get("set-cookie").split(";")[0];
  await verify(restoreOrigin, restoredCookie);
  checks.push("stopped-volume backup restores working credentials, exact image bytes and favorites into a separate volume");
  compose(project, 8082, "start", "api"); await ready(origin); await page.reload();
  await expect(page.locator(".viewer h2")).toHaveText("landscape.png");
  assert.equal(await guestHash(), guestBefore);
  assert.equal(guestBefore, createHash("sha256").update(readFileSync("tests/fixtures/landscape.png")).digest("hex"));
  checks.push("guest IndexedDB original bytes remain unchanged across API recreation and restore verification");
  console.log(JSON.stringify({ passed: checks.length, failed: 0, browserVersion: browser.version(), checks }, null, 2));
  writeFileSync("specs/004-user-cloud-sync/evidence/persistence.json", JSON.stringify({ passed: checks.length, failed: 0, checks }, null, 2) + "\n");
} finally {
  await browser?.close();
  for (const [name, port] of [[restored, 8083], [project, 8082]]) { compose(name, port, "down", "--volumes"); }
  rmSync(scratch, { recursive: true });
}
