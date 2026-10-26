# Checks requiring an unrestricted runner or user participation

## Unblock automated checks

Run in a normal local terminal, or rerun the agent with network, localhost-listener, and browser
launch permissions enabled. The current approval policy cannot grant an exception.

```sh
npm ci
npm install -D vitest jsdom @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom fake-indexeddb
npx playwright install chromium firefox webkit
npm run typecheck
npm test
npm run build
npm run test:e2e -- --reporter=json > browser-results.json
```

Supply the browser-results.json report and any failed traces, or allow the agent to continue in
that environment. Installing T002's packages is necessary but does not by itself finish its
setup or the remaining Strict Mode/stale-read component coverage. Complete those tasks and rerun
all relevant checks; do not mark their tasks complete based on installation or source authoring.
No lint command/configuration currently exists.

## Physical mobile and assistive technology

- On an actual Android phone/Chrome and iPhone/Safari, record device/OS/browser versions and
  complete upload through the native picker, shuffle, favorite, search, preview, and deletion.
- With a screen reader and keyboard, check named controls, favorite/navigation state, processing
  and error announcements, dialog containment, Escape/Cancel, and focus return including when
  the original thumbnail has disappeared from the filtered grid.
- In both themes, inspect text/control/focus contrast and long filenames/errors at narrow widths.
  Viewport/browser emulation is useful automated coverage but is not physical-device verification.

## Physical performance

Use Pixel 6a/Android Chrome and MacBook Air M1/Safari/Chrome. With 100 images up to 2 MiB each,
record fixture pixel dimensions/bytes, production-build version, OS/browser, 100 shuffle samples,
100 search samples, and upload feedback latency. At least 95% of visible shuffle/search results
must arrive within one second; processing feedback must appear within one second. Save results
in performance.md. Generated small solid-color fixtures do not establish realistic photo decoding.

## Five first-time users

Time five real participants without giving navigation help: upload three images, shuffle,
favorite one, and find it in Gallery. At least four must finish in three minutes; all five must
locate the device-only/site-data-loss explanation. Record anonymized times and failed steps in
usability.md. No results are assumed in advance.
