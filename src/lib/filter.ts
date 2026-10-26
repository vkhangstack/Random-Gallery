import type { ImageMetadata } from "../types";
export function filterImages(
  images: ImageMetadata[],
  query: string,
  favoritesOnly: boolean,
): ImageMetadata[] {
  const normalized = query.trim().toLowerCase();
  return images.filter(
    (image) =>
      (!favoritesOnly || image.favorite) &&
      image.name.toLowerCase().includes(normalized),
  );
}
