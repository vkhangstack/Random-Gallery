import type { ImageMetadata } from "../types";
let connection: IDBDatabase | undefined;
let opening: Promise<IDBDatabase> | undefined;
export function storageMessage(error: unknown): string {
  const name =
    error instanceof DOMException || error instanceof Error ? error.name : "";
  if (name === "QuotaExceededError")
    return "Device storage is full. Free some space, then retry.";
  if (name === "NotFoundError")
    return "This image could not be read. Retry or remove it from your collection.";
  if (name === "SecurityError" || name === "InvalidStateError")
    return "Local storage is unavailable. Allow site storage in your browser and retry.";
  if (name === "AbortError")
    return "The storage operation was interrupted. Your previous saved data is unchanged. Retry.";
  return error instanceof Error
    ? error.message
    : "Local storage failed. Check browser storage permissions and retry.";
}
function openDatabase(): Promise<IDBDatabase> {
  if (connection) return Promise.resolve(connection);
  if (opening) return opening;
  opening = new Promise<IDBDatabase>((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      if (typeof indexedDB === "undefined")
        throw new DOMException("Local storage unavailable", "SecurityError");
      request = indexedDB.open("random-gallery", 1);
    } catch (error) {
      reject(error);
      return;
    }
    let blocked = false;
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("images"))
        db.createObjectStore("images", { keyPath: "id" });
      if (!db.objectStoreNames.contains("blobs"))
        db.createObjectStore("blobs", { keyPath: "id" });
    };
    request.onblocked = () => {
      blocked = true;
      reject(
        new Error(
          "Storage is waiting for another app tab. Close other Random Gallery tabs and retry.",
        ),
      );
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      if (blocked) {
        db.close();
        return;
      }
      connection = db;
      db.onversionchange = () => closeDatabase();
      db.onclose = () => {
        if (connection === db) {
          connection = undefined;
          opening = undefined;
        }
      };
      resolve(db);
    };
  }).catch((error) => {
    opening = undefined;
    throw error;
  });
  return opening;
}
export function closeDatabase() {
  connection?.close();
  connection = undefined;
  opening = undefined;
}
async function transaction<T>(
  stores: string[],
  mode: IDBTransactionMode,
  work: (
    tx: IDBTransaction,
    result: (value: T) => void,
    fail: (error: unknown) => void,
  ) => void,
): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    let result: T;
    let failure: unknown;
    const tx = db.transaction(stores, mode);
    tx.oncomplete = () => resolve(result);
    tx.onabort = () =>
      reject(
        failure ??
          tx.error ??
          new DOMException("Storage operation aborted", "AbortError"),
      );
    tx.onerror = () => {
      /* The transaction abort event is the failure boundary. */
    };
    const fail = (error: unknown) => {
      failure = error;
      tx.abort();
    };
    try {
      work(
        tx,
        (value) => {
          result = value;
        },
        fail,
      );
    } catch (error) {
      fail(error);
    }
  });
}
export async function listImages(): Promise<ImageMetadata[]> {
  const entries = await transaction<ImageMetadata[]>(
    ["images"],
    "readonly",
    (tx, done) => {
      const request = tx.objectStore("images").getAll();
      request.onsuccess = () => done(request.result);
    },
  );
  return entries.sort(
    (a, b) =>
      b.addedAt - a.addedAt ||
      a.batchId.localeCompare(b.batchId) ||
      a.ordinal - b.ordinal ||
      a.id.localeCompare(b.id),
  );
}
export async function getImageBlob(id: string): Promise<Blob> {
  const record = await transaction<{ blob: Blob | ArrayBuffer; mimeType?: string } | undefined>(
    ["blobs"],
    "readonly",
    (tx, done) => {
      const request = tx.objectStore("blobs").get(id);
      request.onsuccess = () => done(request.result);
    },
  );
  if (!record)
    throw new DOMException("Image content is missing", "NotFoundError");
  return record.blob instanceof Blob
    ? record.blob
    : new Blob([record.blob], { type: record.mimeType });
}
export async function addImage(
  metadata: ImageMetadata,
  blob: Blob,
 ): Promise<ImageMetadata> {
  const bytes = await blob.arrayBuffer();
  return transaction(["images", "blobs"], "readwrite", (tx, done) => {
    tx.objectStore("images").add(metadata);
    tx.objectStore("blobs").add({ id: metadata.id, blob: bytes, mimeType: blob.type });
    done(metadata);
  });
}
export function setFavorite(
  id: string,
  favorite: boolean,
): Promise<ImageMetadata> {
  return transaction(["images"], "readwrite", (tx, done, fail) => {
    const store = tx.objectStore("images");
    const request = store.get(id);
    request.onsuccess = () => {
      if (!request.result) {
        fail(new DOMException("Image was not found", "NotFoundError"));
        return;
      }
      try {
        const metadata = { ...request.result, favorite };
        store.put(metadata);
        done(metadata);
      } catch (error) {
        fail(error);
      }
    };
  });
}
export function deleteImage(id: string): Promise<void> {
  return transaction(["images", "blobs"], "readwrite", (tx, done) => {
    tx.objectStore("images").delete(id);
    tx.objectStore("blobs").delete(id);
    done(undefined);
  });
}
