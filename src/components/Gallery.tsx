import type { ImageMetadata } from "../types";
import { ImageAsset } from "./ImageViewer";
interface Props {
  images: ImageMetadata[];
  onOpen: (image: ImageMetadata) => void;
  retryKey: number;
  onUnreadable: (id: string) => void;
  onRetry: () => void;
  onFavorite?: (image: ImageMetadata) => void;
  pending: Set<string>;
}
export default function Gallery({
  images,
  onOpen,
  onFavorite,
  pending,
  ...asset
}: Props) {
  return (
    <div className="gallery-grid">
      {images.map((image) => (
        <article className="gallery-card" key={image.id}>
          <button
            className="thumbnail"
            aria-label={`Open ${image.name}`}
            onClick={() => onOpen(image)}
          >
            <ImageAsset image={image} {...asset} lazy />
          </button>
          <div className="card-caption">
            <span title={image.name}>{image.name}</span>
            {onFavorite && (
              <button
                className="favorite-button"
                aria-label={`${image.favorite ? "Unfavorite" : "Favorite"} ${image.name}`}
                aria-pressed={image.favorite}
                disabled={pending.has(image.id)}
                onClick={() => onFavorite(image)}
              >
                <span className="favorite-icon" aria-hidden="true">{image.favorite ? "♥" : "♡"}</span>
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
