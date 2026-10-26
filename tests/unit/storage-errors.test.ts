import { test } from "node:test";
import assert from "node:assert/strict";
import {
  closeDatabase,
  listImages,
  storageMessage,
} from "../../src/storage/images.ts";

test("storage errors provide actionable messages without false success", () => {
  for (const [name, expected] of [
    ["QuotaExceededError", /Free some space/],
    ["SecurityError", /Allow site storage/],
    ["InvalidStateError", /Allow site storage/],
    ["NotFoundError", /Retry or remove/],
    ["AbortError", /previous saved data is unchanged/],
  ] as const)
    assert.match(
      storageMessage(new DOMException("Underlying error", name)),
      expected,
    );
  assert.match(storageMessage(undefined), /retry/i);
});

test("missing IndexedDB rejects loading instead of returning an empty collection", async () => {
  closeDatabase();
  await assert.rejects(listImages(), { name: "SecurityError" });
  closeDatabase();
});

test("synchronous open denial is retryable and does not poison the cached open promise", async () => {
  let calls = 0;
  const previous = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
  Object.defineProperty(globalThis, "indexedDB", {
    configurable: true,
    value: {
      open() {
        calls++;
        throw new DOMException("Denied", "SecurityError");
      },
    },
  });
  try {
    closeDatabase();
    await assert.rejects(listImages(), { name: "SecurityError" });
    await assert.rejects(listImages(), { name: "SecurityError" });
    assert.equal(calls, 2);
  } finally {
    closeDatabase();
    if (previous) Object.defineProperty(globalThis, "indexedDB", previous);
    else Reflect.deleteProperty(globalThis, "indexedDB");
  }
});

test("a blocked open rejects with recovery guidance and closes its late connection", async () => {
  let request: {
    onblocked?: () => void;
    onsuccess?: () => void;
    result?: unknown;
  } = {};
  let closes = 0;
  const previous = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
  Object.defineProperty(globalThis, "indexedDB", {
    configurable: true,
    value: {
      open() {
        request = {};
        queueMicrotask(() => request.onblocked?.());
        return request;
      },
    },
  });
  try {
    closeDatabase();
    await assert.rejects(
      listImages(),
      /Close other Random Gallery tabs and retry/,
    );
    request.result = {
      close() {
        closes++;
      },
    };
    request.onsuccess?.();
    assert.equal(closes, 1);
  } finally {
    closeDatabase();
    if (previous) Object.defineProperty(globalThis, "indexedDB", previous);
    else Reflect.deleteProperty(globalThis, "indexedDB");
  }
});
