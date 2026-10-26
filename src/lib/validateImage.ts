import type { ImageMime } from "../types";
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export async function decodeBlob(blob: Blob): Promise<void> {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    if (typeof image.decode === "function") {
      image.src = url;
      await image.decode();
    } else
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Unreadable image"));
        image.src = url;
      });
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function validateImage(
  file: File,
  decode: (blob: Blob) => Promise<void> = decodeBlob,
): Promise<{ mimeType: ImageMime; blob: Blob }> {
  if (!file.size)
    throw new Error(
      "This file is empty. Choose a readable JPEG, PNG, or WebP image.",
    );
  if (file.size > MAX_IMAGE_SIZE)
    throw new Error("This file exceeds 10 MiB. Choose a smaller image.");
  const h = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  let mimeType: ImageMime;
  if (h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff) mimeType = "image/jpeg";
  else if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => h[i] === v))
    mimeType = "image/png";
  else if (
    String.fromCharCode(...h.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...h.slice(8, 12)) === "WEBP"
  )
    mimeType = "image/webp";
  else
    throw new Error(
      "Unsupported image content. Choose a JPEG, PNG, or WebP image.",
    );
  const blob = file.slice(0, file.size, mimeType);
  try {
    await decode(blob);
  } catch {
    throw new Error(
      "This image could not be read. Choose a working copy and retry.",
    );
  }
  return { mimeType, blob };
}
