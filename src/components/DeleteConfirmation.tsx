import { useEffect, useRef } from "react";
import type { ImageMetadata } from "../types";
interface Props {
  image: ImageMetadata;
  pending: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}
export default function DeleteConfirmation({
  image,
  pending,
  error,
  onCancel,
  onConfirm,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const origin = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => {
      ref.current?.close();
      if (origin?.isConnected) origin.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="delete-dialog"
      aria-labelledby="delete-heading"
      onCancel={(e) => {
        e.preventDefault();
        if (!pending) onCancel();
      }}
    >
      <p className="eyebrow">REMOVE FROM YOUR COLLECTION</p>
      <h2 id="delete-heading">Delete this image?</h2>
      <p className="delete-name">{image.name}</p>
      <p>
        This permanently removes the image from Random Gallery. Your original
        source file is untouched.
      </p>
      {error && (
        <p role="alert" className="error">
          {error} You can retry Delete.
        </p>
      )}
      <div className="dialog-actions">
        <button autoFocus disabled={pending} onClick={onCancel}>
          Cancel
        </button>
        <button
          className="button destructive"
          disabled={pending}
          onClick={onConfirm}
        >
          {pending ? "Deleting…" : "Delete image"}
        </button>
      </div>
    </dialog>
  );
}
