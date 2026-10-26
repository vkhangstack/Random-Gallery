import type { Page } from "playwright/test";
declare global {
  interface Window {
    releaseStorageLock: () => Promise<void>;
  }
}
// Hold a genuine native readwrite transaction; later app writes queue behind it.
export async function holdStorageWrites(page: Page) {
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("random-gallery", 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const tx = db.transaction(["images", "blobs"], "readwrite");
    let release = false;
    const finished = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onabort = () => {
        db.close();
        reject(tx.error);
      };
    });
    const pump = () => {
      const request = tx.objectStore("images").get("__lock__");
      request.onsuccess = () => {
        if (!release) pump();
      };
    };
    pump();
    window.releaseStorageLock = () => {
      release = true;
      return finished;
    };
  });
}
