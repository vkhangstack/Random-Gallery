export type ImageMime = "image/jpeg" | "image/png" | "image/webp";
export interface ImageMetadata {
  id: string;
  name: string;
  mimeType: ImageMime;
  size: number;
  addedAt: number;
  batchId: string;
  ordinal: number;
  favorite: boolean;
}
export interface ImageBlob {
  id: string;
  blob: Blob | ArrayBuffer;
  mimeType?: ImageMime;
}
export type CollectionStatus = "loading" | "ready" | "error";
export interface UploadOutcome {
  name: string;
  status: "queued" | "validating" | "saving" | "saved" | "failed";
  error?: string;
}
export type Scope = "all" | "favorites";
