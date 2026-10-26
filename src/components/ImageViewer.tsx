import { useEffect, useRef } from "react";
import type { ImageMetadata } from "../types";
import { useImageUrl } from "../hooks/useImageUrl";
interface AssetProps {
  image: ImageMetadata;
  retryKey: number;
  onUnreadable: (id: string) => void;
  onRetry: () => void;
  lazy?: boolean;
}
export function ImageAsset({
  image,
  retryKey,
  onUnreadable,
  onRetry,
  lazy = false,
}: AssetProps) {
  const state = useImageUrl(image.id, retryKey);
  useEffect(() => {
    if (state.error) onUnreadable(image.id);
  }, [state.error, image.id, onUnreadable]);
  if (state.error)
    return (
      <div className="image-error">
        <p>Could not read {image.name}.</p>
        {!lazy && <button onClick={onRetry}>Retry image</button>}
      </div>
    );
  if (!state.url)
    return (
      <span className="image-loading" role="status">
        Loading image…
      </span>
    );
  return (
    <img
      src={state.url}
      alt={image.name}
      loading={lazy ? "lazy" : "eager"}
      onError={() => {
        state.fail();
        onUnreadable(image.id);
      }}
    />
  );
}
export interface ViewerProps extends AssetProps {
  pending: boolean;
  error?: string;
  onFavorite: () => void;
  onDelete: () => void;
  onClose?: () => void;
}
export default function ImageViewer({
  image,
  pending,
  error,
  onFavorite,
  onDelete,
  onClose,
  ...asset
}: ViewerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!onClose) return;
    const origin = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      const target = origin?.isConnected
        ? origin
        : (document.querySelector<HTMLElement>(".thumbnail") ??
          document.querySelector<HTMLElement>("#main h1"));
      target?.focus();
    };
  }, [image.id, Boolean(onClose)]);
  const content = (
    <>
      {onClose && (
        <div className="dialog-top">
          <span>Image preview</span>
          <button autoFocus aria-label="Close image preview" onClick={onClose}>
            Close <span aria-hidden="true">×</span>
          </button>
        </div>
      )}
      <div className="image-stage">
        <ImageAsset image={image} {...asset} />
      </div>
      <div className="image-caption">
        <div className="image-info">
          <p className="eyebrow">
            {image.favorite ? "A FAVORITE" : "FROM YOUR COLLECTION"}
          </p>
          <h2>{image.name}</h2>
        </div>
        <div className="image-actions">
          <button
            className="icon-button favorite-button"
            aria-label={`${image.favorite ? "Unfavorite" : "Favorite"} ${image.name}`}
            aria-pressed={image.favorite}
            disabled={pending}
            onClick={onFavorite}
          >
            <span className="favorite-icon" aria-hidden="true">{image.favorite ? "♥" : "♡"}</span>
            <span className="sr-only">Favorite</span>
          </button>
          <button
            className="text-button danger"
            disabled={pending}
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="notice error">
          {error} Use the favorite control to retry.
        </p>
      )}
    </>
  );
  return onClose ? (
    <dialog
      className="preview-dialog viewer"
      ref={dialog}
      aria-label={`Preview ${image.name}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {content}
    </dialog>
  ) : (
    <article className="viewer">{content}</article>
  );
}
