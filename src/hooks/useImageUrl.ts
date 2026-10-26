import { useEffect, useState } from "react";
import { storageMessage } from "../storage/images";
import { useStorage } from "../storage/collection";
export function useImageUrl(id: string, retryKey = 0) {
  const storage = useStorage();
  const [state, setState] = useState<{
    id: string;
    retryKey: number;
    url?: string;
    error?: string;
  }>({ id, retryKey });
  useEffect(() => {
    let active = true;
    let ownedUrl: string | undefined;
    setState({ id, retryKey });
    storage.getImageBlob(id)
      .then((blob) => {
        if (!active) return;
        ownedUrl = URL.createObjectURL(blob);
        setState({ id, retryKey, url: ownedUrl });
      })
      .catch((error) => {
        if (active) setState({ id, retryKey, error: storageMessage(error) });
      });
    return () => {
      active = false;
      if (ownedUrl) URL.revokeObjectURL(ownedUrl);
    };
  }, [id, retryKey, storage]);
  const current =
    state.id === id && state.retryKey === retryKey ? state : { id, retryKey };
  function fail() {
    if (current.url) URL.revokeObjectURL(current.url);
    setState({
      id,
      retryKey,
      error: "This image could not be decoded. Retry or remove it.",
    });
  }
  return { ...current, fail };
}
