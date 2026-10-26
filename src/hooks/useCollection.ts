import { useCallback, useEffect, useRef, useState } from "react";
import type { CollectionStatus, ImageMetadata, UploadOutcome } from "../types";
import { storageMessage } from "../storage/images";
import { useStorage } from "../storage/collection";
import { validateImage } from "../lib/validateImage";
export function useCollection() {
  const storage = useStorage();
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [status, setStatus] = useState<CollectionStatus>("loading");
  const [error, setError] = useState("");
  const [uploads, setUploads] = useState<UploadOutcome[]>([]);
  const [uploading, setUploading] = useState(false);
  const uploadingRef = useRef(false);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const pendingRef = useRef(new Set<string>());
  const [unreadable, setUnreadable] = useState<Set<string>>(new Set());
  const [retryKey, setRetryKey] = useState(0);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current;
    setStatus("loading");
    setError("");
    try {
      const data = await storage.listImages();
      if (current === generation.current) {
        setImages(data);
        setStatus("ready");
      }
    } catch (e) {
      if (current === generation.current) {
        setError(storageMessage(e));
        setStatus("error");
      }
    }
  }, [storage]);
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  async function upload(files: File[]) {
    if (uploadingRef.current) return;
    const epoch = generation.current;
    uploadingRef.current = true;
    setUploading(true);
    const batchId = crypto.randomUUID(),
      addedAt = Date.now();
    const results: UploadOutcome[] = files.map((file) => ({
      name: file.name,
      status: "queued",
    }));
    const update = (i: number, patch: Partial<UploadOutcome>) => {
      if (generation.current !== epoch) return;
      results[i] = { ...results[i], ...patch };
      setUploads([...results]);
    };
    setUploads([...results]);
    try {
      for (let i = 0; i < files.length; i++) {
        if (generation.current !== epoch) return;
        try {
          update(i, { status: "validating" });
          const { blob, mimeType } = await validateImage(files[i]);
          if (generation.current !== epoch) return;
          update(i, { status: "saving" });
          const metadata = await storage.addImage(
            {
              id: crypto.randomUUID(),
              name: files[i].name,
              mimeType,
              size: blob.size,
              addedAt,
              batchId,
              ordinal: i,
              favorite: false,
            },
            blob,
          );
          if (generation.current !== epoch) return;
          setImages((previous) =>
            [...previous, metadata].sort(
              (a, b) =>
                b.addedAt - a.addedAt ||
                a.batchId.localeCompare(b.batchId) ||
                a.ordinal - b.ordinal,
            ),
          );
          update(i, { status: "saved" });
        } catch (e) {
          update(i, { status: "failed", error: storageMessage(e) });
        }
      }
    } finally {
      if (generation.current === epoch) {
        uploadingRef.current = false;
        setUploading(false);
      }
    }
  }
  async function mutate(
    id: string,
    operation: () => Promise<void>,
  ): Promise<boolean> {
    if (pendingRef.current.has(id)) return false;
    const epoch = generation.current;
    pendingRef.current.add(id);
    setPending(new Set(pendingRef.current));
    setError("");
    try {
      await operation();
      return generation.current === epoch;
    } catch (e) {
      if (generation.current === epoch) setError(storageMessage(e));
      return false;
    } finally {
      pendingRef.current.delete(id);
      setPending(new Set(pendingRef.current));
    }
  }
  const favorite = (image: ImageMetadata) => {
    const epoch = generation.current;
    return mutate(image.id, async () => {
      const saved = await storage.setFavorite(image.id, !image.favorite);
      if (generation.current !== epoch) return;
      setImages((previous) =>
        previous.map((entry) => (entry.id === saved.id ? saved : entry)),
      );
    });
  };
  const remove = (id: string) => {
    const epoch = generation.current;
    return mutate(id, async () => {
      await storage.deleteImage(id);
      if (generation.current !== epoch) return;
      setImages((previous) => previous.filter((image) => image.id !== id));
      setUnreadable((previous) => {
        const next = new Set(previous);
        next.delete(id);
        return next;
      });
    });
  };
  const markUnreadable = useCallback(
    (id: string) =>
      setUnreadable((previous) =>
        previous.has(id) ? previous : new Set([...previous, id]),
      ),
    [],
  );
  const retryImages = () => {
    setUnreadable(new Set());
    setRetryKey((key) => key + 1);
  };
  return {
    images,
    status,
    error,
    clearError: () => setError(""),
    load,
    uploads,
    uploading,
    upload,
    pending,
    favorite,
    remove,
    unreadable,
    markUnreadable,
    retryImages,
    retryKey,
  };
}
