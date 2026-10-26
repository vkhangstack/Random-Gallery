# Performance verification

Status: not executed. The sandbox denies binding the preview server and launching Chromium.
No physical-device timing results are claimed.

Run `npm run test:e2e -- --grep "100-image timing"` after installing browser binaries. The
scenario generates 100 valid 2 MiB PNG entries in memory, performs 100 shuffle and 100 search
actions, and attaches samples and p95 results as timings.json to the Playwright result.
Automated host timing includes automation overhead and does not replace physical-device checks.

For SC-005, use the production build on Pixel 6a/Android Chrome and MacBook Air M1/Safari/Chrome.
Record OS/browser versions, fixture pixel dimensions and byte sizes, all 100 samples per action,
percentage at or below one second (must be at least 95%), and upload feedback latency (at most
one second from file selection). The committed fixtures are small solid-color images, so also
use representative personal-image dimensions when establishing real device decoding performance.
Do not claim this acceptance criterion passed until actual device measurements are available.

The browser timing scenario now measures processing feedback from the input's actual change
event to the first Processing DOM update and asserts it is at most 1000 ms. This avoids counting
Playwright's transfer of the generated 200 MiB fixture as application feedback latency. The result
assertion and timings remain unexecuted under the documented browser/server restrictions.
