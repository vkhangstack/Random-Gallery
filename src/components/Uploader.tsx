import type { UploadOutcome } from "../types";
interface Props {
  cloud?: boolean;
  uploading: boolean;
  disabled?: boolean;
  outcomes: UploadOutcome[];
  onUpload: (files: File[]) => Promise<void>;
}
export default function Uploader({
  cloud = false,
  uploading,
  disabled,
  outcomes,
  onUpload,
}: Props) {
  const saved = outcomes.filter((item) => item.status === "saved").length;
  const failed = outcomes.filter((item) => item.status === "failed");
  return (
    <section className="upload-section" aria-label="Add to collection">
      <div className="upload-topline">
        <div>
          <p className="eyebrow">YOUR OWN LITTLE ARCHIVE</p>
          <p className="upload-hint">
            JPEG, PNG & WebP · Up to 10 MiB per image
          </p>
        </div>
        <label
          className={`button primary upload-button ${uploading ? "disabled" : ""}`}
        >
          <span aria-hidden="true">＋</span>{" "}
          {uploading ? "Processing…" : "Upload images"}
          <input
            type="file"
            aria-label="Upload images"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={uploading || disabled}
            onChange={(event) => {
              const files = Array.from(event.currentTarget.files ?? []);
              event.currentTarget.value = "";
              if (files.length) void onUpload(files);
            }}
          />
        </label>
      </div>
      <p className="privacy">
        <span aria-hidden="true">⌁</span>{" "}
        {cloud ? "Images are saved privately to your account on the server. Sign in on another device and refresh to sync. After an interrupted upload, refresh before retrying; it may already be saved." : "Only in this browser, on this device. Images never leave your device and are not synced. Clearing browser site data removes your collection."}
      </p>
      <div aria-live="polite" aria-atomic="true">
        {uploading && (
          <p className="notice">
            Processing{" "}
            {
              outcomes.filter(
                (item) => item.status === "saved" || item.status === "failed",
              ).length
            }{" "}
            of {outcomes.length}…
          </p>
        )}
        {!uploading && outcomes.length > 0 && (
          <p className="notice">
            {saved} saved · {failed.length} failed
          </p>
        )}
      </div>
      {failed.length > 0 && (
        <ul className="upload-errors">
          {failed.map((item, i) => (
            <li key={i}>
              <strong>{item.name}</strong>: {item.error} Use Upload images to
              retry.
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
