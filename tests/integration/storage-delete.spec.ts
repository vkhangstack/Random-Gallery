import { test, expect } from "playwright/test";
import { loadStorage } from "./storage";
test("delete rollback and committed removal are atomic and preserve duplicates", async ({
  page,
}) => {
  await loadStorage(page);
  const result = await page.evaluate(async () => {
    const s = window.testStorage;
    for (const id of ["one", "two"])
      await s.addImage(
        {
          id,
          name: "same.png",
          mimeType: "image/png",
          size: 1,
          addedAt: 0,
          batchId: "b",
          ordinal: 0,
          favorite: false,
        },
        new Blob(["x"]),
      );
    const remove = IDBObjectStore.prototype.delete;
    IDBObjectStore.prototype.delete = function (k: IDBValidKey | IDBKeyRange) {
      const r = remove.call(this, k);
      if (this.name === "blobs")
        r.addEventListener("success", () => this.transaction.abort());
      return r;
    };
    let failed = false;
    try {
      await s.deleteImage("one");
    } catch {
      failed = true;
    } finally {
      IDBObjectStore.prototype.delete = remove;
    }
    const retained =
      (await s.listImages()).length === 2 &&
      (await (await s.getImageBlob("one")).text()) === "x";
    await s.deleteImage("one");
    s.closeDatabase();
    return {
      failed,
      retained,
      ids: (await s.listImages()).map((i) => i.id),
      other: await (await s.getImageBlob("two")).text(),
    };
  });
  expect(result).toEqual({
    failed: true,
    retained: true,
    ids: ["two"],
    other: "x",
  });
});
