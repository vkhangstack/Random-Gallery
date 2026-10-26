// Creates only disposable test projects/volumes; preserves the normal deployment.
import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFileSync, readFileSync } from "node:fs";
const engines = process.argv.slice(2);
if (!engines.length) engines.push("chromium", "firefox", "webkit");
if (engines.some(engine => !["chromium", "firefox", "webkit"].includes(engine))) throw new Error("Unknown browser engine");
const evidence = "specs/004-user-cloud-sync/evidence";
const docker = (...args) => execFileSync("docker", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 32 * 1024 * 1024 });
const restoreWeb = docker("compose", "ps", "--status", "running", "-q", "web").trim() !== "";
const summaries = [];
try {
  if (restoreWeb) docker("compose", "stop", "web");
  for (const engine of engines) {
    const project = `gallery-check-${engine}-${randomUUID().slice(0, 8)}`;
    try {
      const started = spawnSync("docker", ["compose", "-p", project, "up", "--build", "-d", "--wait"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
      writeFileSync(`${evidence}/accounts-${engine}-compose.log`, started.stdout + started.stderr);
      if (started.status !== 0) throw new Error(`Disposable ${engine} Compose startup failed; see saved log`);
      const result = spawnSync(process.execPath, ["node_modules/playwright/cli.js", "test", "--config=playwright.accounts.config.ts", `--project=${engine}`, "--reporter=json", ...(process.env.GALLERY_TEST_GREP ? ["--grep", process.env.GALLERY_TEST_GREP] : [])], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
      const path = `${evidence}/accounts-${engine}.json`;
      writeFileSync(path, result.stdout);
      writeFileSync(`${evidence}/accounts-${engine}.stderr.log`, result.stderr);
      const report = JSON.parse(readFileSync(path, "utf8"));
      let browserVersion = null;
      try { const types = await import("playwright"); const browser = await types[engine].launch(); browserVersion = browser.version(); await browser.close(); } catch { /* Failed launches remain failures in the report. */ }
      const summary = { engine, browserVersion, exitCode: result.status, ...report.stats };
      summaries.push(summary);
      console.log(JSON.stringify(summary));
    } finally {
      // This randomly named project was created by this process; never delete the normal gallery-data volume.
      docker("compose", "-p", project, "down", "--volumes");
    }
  }
} finally {
  if (restoreWeb) docker("compose", "start", "web");
  writeFileSync(`${evidence}/accounts-summary.json`, JSON.stringify(summaries, null, 2) + "\n");
}
if (summaries.some(result => result.exitCode !== 0)) process.exitCode = 1;
