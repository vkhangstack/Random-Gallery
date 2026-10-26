import type { ImageMetadata } from "../types";
import type { CollectionStorage } from "./collection";
export interface User { id: string; email: string }
export async function api(path: string, init: RequestInit = {}) {
  const response = await fetch(`/api${path}`, { ...init, credentials: "same-origin" });
  if (!response.ok) {
    let message = "The server is unavailable. Check your connection and retry.";
    try { message = (await response.json()).error || message; } catch { /* Proxy may return HTML. */ }
    throw new Error(message);
  }
  return response;
}
export function cloudStorage(user: User): CollectionStorage & { activate(): void; dispose(): void } {
  let controller = new AbortController();
  async function request(path: string, init: RequestInit = {}) {
    const response = await fetch(`/api/images${path}`, {
      ...init, credentials: "same-origin", signal: controller.signal,
      headers: { ...init.headers, "X-Gallery-Account": user.id },
    });
    if (response.status === 401) window.dispatchEvent(new CustomEvent("gallery-session-expired", { detail: user.id }));
    if (!response.ok) {
      let message = "Cloud storage is unavailable. Check your connection and retry.";
      try { message = (await response.json()).error || message; } catch { /* Proxy may return HTML. */ }
      throw new Error(message);
    }
    return response;
  }
  return {
    activate: () => { if (controller.signal.aborted) controller = new AbortController(); },
    dispose: () => controller.abort(),
    listImages: async () => (await request("")).json() as Promise<ImageMetadata[]>,
    getImageBlob: async (id) => (await request(`/${id}/content`)).blob(),
    addImage: async (metadata, blob) => {
      const body = new FormData();
      body.append("metadata", JSON.stringify(metadata));
      body.append("file", blob, metadata.name);
      return (await request("", { method: "POST", body })).json();
    },
    setFavorite: async (id, favorite) => (await request(`/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ favorite }),
    })).json(),
    deleteImage: async (id) => { await request(`/${id}`, { method: "DELETE" }); },
  };
}
