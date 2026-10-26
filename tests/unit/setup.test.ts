import { test } from "node:test";
import assert from "node:assert/strict";
test("Node supports blobs", () => assert.equal(new Blob(["hello"]).size, 5));
