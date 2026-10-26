import { test } from "node:test";
import assert from "node:assert/strict";
import { validateImage } from "../../src/lib/validateImage.ts";
import { png, jpeg, webp, paddedPng } from "../fixtures/images.ts";
for (const [data, mime] of [
  [png, "image/png"],
  [jpeg, "image/jpeg"],
  [webp, "image/webp"],
] as const) {
  test(`validates ${mime} from content even with misleading name/type`, async () => {
    let decoded = false;
    const result = await validateImage(
      new File([data], "wrong.txt", { type: "text/plain" }),
      async () => {
        decoded = true;
      },
    );
    assert.equal(result.mimeType, mime);
    assert.equal(result.blob.type, mime);
    assert.ok(decoded);
  });
}
test("rejects empty, unsupported, oversized, and undecodable files", async () => {
  for (const content of [
    Buffer.alloc(0),
    Buffer.from("not an image"),
    paddedPng(10485761),
  ]) {
    await assert.rejects(
      validateImage(new File([content], "bad.png"), async () => {}),
    );
  }
  await assert.rejects(
    validateImage(new File([png], "corrupt.png"), async () => {
      throw Error("decode");
    }),
    /read/,
  );
});
test("accepts exact size boundary", async () => {
  const result = await validateImage(
    new File([paddedPng(10485760)], "large.png"),
    async () => {},
  );
  assert.equal(result.blob.size, 10485760);
});
test("temporary decode URLs are released on success and failure", async () => {
  const { decodeBlob } = await import("../../src/lib/validateImage.ts");
  const previous = globalThis.Image;
  const create = URL.createObjectURL;
  const revoke = URL.revokeObjectURL;
  const released: string[] = [];
  let fails = false;
  globalThis.Image = class {
    src = "";
    decode() {
      return fails ? Promise.reject(Error("decode")) : Promise.resolve();
    }
  } as unknown as typeof Image;
  URL.createObjectURL = () => "blob:owned";
  URL.revokeObjectURL = (url) => released.push(url);
  try {
    await decodeBlob(new Blob(["x"]));
    fails = true;
    await assert.rejects(decodeBlob(new Blob(["x"])));
    assert.deepEqual(released, ["blob:owned", "blob:owned"]);
  } finally {
    globalThis.Image = previous;
    URL.createObjectURL = create;
    URL.revokeObjectURL = revoke;
  }
});

test("fallback load/error decoding retains its URL until completion and releases it afterward", async () => {
  const { decodeBlob } = await import("../../src/lib/validateImage.ts");
  const previous = globalThis.Image,
    create = URL.createObjectURL,
    revoke = URL.revokeObjectURL;
  let current: { onload?: () => void; onerror?: () => void } | undefined;
  const released: string[] = [];
  globalThis.Image = class {
    src = "";
    onload?: () => void;
    onerror?: () => void;
    constructor() {
      current = this;
    }
  } as unknown as typeof Image;
  URL.createObjectURL = () => "blob:fallback";
  URL.revokeObjectURL = (url) => released.push(url);
  try {
    const success = decodeBlob(new Blob(["x"]));
    assert.deepEqual(released, []);
    current!.onload!();
    await success;
    assert.deepEqual(released, ["blob:fallback"]);
    const failure = decodeBlob(new Blob(["x"]));
    assert.equal(released.length, 1);
    current!.onerror!();
    await assert.rejects(failure);
    assert.equal(released.length, 2);
  } finally {
    globalThis.Image = previous;
    URL.createObjectURL = create;
    URL.revokeObjectURL = revoke;
  }
});
