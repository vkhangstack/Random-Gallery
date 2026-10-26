import { test } from "node:test";
import assert from "node:assert/strict";
import { filterImages } from "../../src/lib/filter.ts";
import type { ImageMetadata } from "../../src/types.ts";
const entries: ImageMetadata[] = ["Café.PNG", "landscape.jpg", "Café.PNG"].map(
  (name, i) => ({
    id: String(i),
    name,
    favorite: i === 0,
    mimeType: "image/png",
    size: 10,
    addedAt: 0,
    batchId: "batch",
    ordinal: i,
  }),
);
test("trimmed case-insensitive substring search intersects favorites", () => {
  assert.deepEqual(filterImages(entries, " CAFÉ ", false), [
    entries[0],
    entries[2],
  ]);
  assert.deepEqual(filterImages(entries, "png", true), [entries[0]]);
  assert.deepEqual(filterImages(entries, "missing", false), []);
});
test("filter preserves records, order and input", () => {
  const copy = structuredClone(entries);
  assert.deepEqual(filterImages(entries, "", false), entries);
  assert.equal(filterImages(entries, "", true)[0], entries[0]);
  assert.deepEqual(entries, copy);
});
