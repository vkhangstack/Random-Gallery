import { test, expect } from "playwright/test";
import { loadStorage } from "./storage";
test.beforeEach(async ({ page }) => loadStorage(page));
test("storage commits metadata/blobs, duplicates and ordering, reopens without loss", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const s = window.testStorage;
    const blob = new Blob(["original bytes"], { type: "image/png" });
    for (const ordinal of [1, 0])
      await s.addImage(
        {
          id: String(ordinal),
          name: "same.png",
          mimeType: "image/png",
          size: blob.size,
          addedAt: 0,
          batchId: "batch",
          ordinal,
          favorite: false,
        },
        blob,
      );
    s.closeDatabase();
    const images = await s.listImages();
    return {
      ids: images.map((i) => i.id),
      bytes: await (await s.getImageBlob("0")).text(),
    };
  });
  expect(result).toEqual({ ids: ["0", "1"], bytes: "original bytes" });
});
test("request success followed by abort rolls back both stores and rejects", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const original = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (
      value: unknown,
      key?: IDBValidKey,
    ) {
      const request = original.call(this, value, key);
      if (this.name === "blobs")
        request.addEventListener("success", () => this.transaction.abort());
      return request;
    };
    let failed = false;
    try {
      await window.testStorage.addImage(
        {
          id: "abort",
          name: "bad.png",
          mimeType: "image/png",
          size: 1,
          addedAt: 0,
          batchId: "b",
          ordinal: 0,
          favorite: false,
        },
        new Blob(["a"]),
      );
    } catch {
      failed = true;
    } finally {
      IDBObjectStore.prototype.add = original;
    }
    return { failed, count: (await window.testStorage.listImages()).length };
  });
  expect(result).toEqual({ failed: true, count: 0 });
});
test("denied storage, collection read failure and missing blob reject", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const s = window.testStorage;
    s.closeDatabase();
    const original = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function () {
      throw new DOMException("Denied", "SecurityError");
    };
    let denied = false;
    try {
      await s.listImages();
    } catch {
      denied = true;
    } finally {
      IDBFactory.prototype.open = original;
    }
    const getAll = IDBObjectStore.prototype.getAll;
    IDBObjectStore.prototype.getAll = function () {
      throw new DOMException("Read failed", "UnknownError");
    };
    let read = false;
    try {
      await s.listImages();
    } catch {
      read = true;
    } finally {
      IDBObjectStore.prototype.getAll = getAll;
    }
    let missing = false;
    try {
      await s.getImageBlob("missing");
    } catch {
      missing = true;
    }
    return { denied, read, missing };
  });
  expect(result).toEqual({ denied: true, read: true, missing: true });
});

test("quota abort leaves no orphan blob, and versionchange closes the old connection", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const s = window.testStorage;
    const add = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (
      value: unknown,
      key?: IDBValidKey,
    ) {
      if (this.name === "blobs")
        throw new DOMException("Full", "QuotaExceededError");
      return add.call(this, value, key);
    };
    let failed = false;
    try {
      await s.addImage(
        {
          id: "quota",
          name: "quota.png",
          mimeType: "image/png",
          size: 1,
          addedAt: 0,
          batchId: "b",
          ordinal: 0,
          favorite: false,
        },
        new Blob(["x"]),
      );
    } catch {
      failed = true;
    } finally {
      IDBObjectStore.prototype.add = add;
    }
    const count = (await s.listImages()).length;
    let missing = false;
    try {
      await s.getImageBlob("quota");
    } catch {
      missing = true;
    }
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("random-gallery", 2);
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
    let versionError = false;
    try {
      await s.listImages();
    } catch {
      versionError = true;
    }
    return { failed, count, missing, versionError };
  });
  expect(result).toEqual({
    failed: true,
    count: 0,
    missing: true,
    versionError: true,
  });
});

test("legacy Blob records remain readable without migration", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "This runner cannot seed legacy Blob records; ArrayBuffer persistence is covered separately.");
  const result = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open("random-gallery", 1);
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("blobs", "readwrite");
      tx.objectStore("blobs").add({ id: "legacy", blob: new Blob(["legacy original bytes"], { type: "image/png" }) });
      tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error);
    });
    db.close();
    const image = await window.testStorage.getImageBlob("legacy");
    return { bytes: await image.text(), type: image.type };
  });
  expect(result).toEqual({ bytes: "legacy original bytes", type: "image/png" });
});
