import { test, expect } from "playwright/test";
import { loadStorage } from "./storage";
test("favorite changes persist and aborted changes preserve old state and blob", async ({
  page,
}) => {
  await loadStorage(page);
  const result = await page.evaluate(async () => {
    const s = window.testStorage;
    await s.addImage(
      {
        id: "one",
        name: "one.png",
        mimeType: "image/png",
        size: 1,
        addedAt: 0,
        batchId: "b",
        ordinal: 0,
        favorite: false,
      },
      new Blob(["x"]),
    );
    await s.setFavorite("one", true);
    s.closeDatabase();
    const persisted = (await s.listImages())[0].favorite;
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (v: unknown, k?: IDBValidKey) {
      const r = put.call(this, v, k);
      r.addEventListener("success", () => this.transaction.abort());
      return r;
    };
    let failed = false;
    try {
      await s.setFavorite("one", false);
    } catch {
      failed = true;
    } finally {
      IDBObjectStore.prototype.put = put;
    }
    let missing = false;
    try {
      await s.setFavorite("missing", true);
    } catch {
      missing = true;
    }
    return {
      persisted,
      failed,
      missing,
      favorite: (await s.listImages())[0].favorite,
      blob: await (await s.getImageBlob("one")).text(),
    };
  });
  expect(result).toEqual({
    persisted: true,
    failed: true,
    missing: true,
    favorite: true,
    blob: "x",
  });
});
