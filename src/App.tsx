import { useEffect, useMemo, useRef, useState } from "react";
import type { ImageMetadata, Scope } from "./types";
import { useCollection } from "./hooks/useCollection";
import { selectRandomImage } from "./lib/random";
import { filterImages } from "./lib/filter";
import Uploader from "./components/Uploader";
import Gallery from "./components/Gallery";
import ImageViewer from "./components/ImageViewer";
import DeleteConfirmation from "./components/DeleteConfirmation";
function initialTheme() {
  let preference: string | null = null;
  let failed = false;
  try {
    preference = localStorage.getItem("random-gallery.theme");
  } catch {
    failed = true;
  }
  return {
    theme:
      preference === "light" || preference === "dark"
        ? preference
        : matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light",
    explicit: preference === "light" || preference === "dark",
    failed,
  };
}
export default function App({ cloud = false }: { cloud?: boolean }) {
  const collection = useCollection();
  const [destination, setDestination] = useState<"random" | "gallery">(
    "random",
  );
  const [scope, setScope] = useState<Scope>("all");
  const [current, setCurrent] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ImageMetadata | null>(null);
  const [singleNotice, setSingleNotice] = useState(false);
  const [themeState, setThemeState] = useState(initialTheme);
  const lastAction = useRef<(() => void) | null>(null);
  const controls = useRef<HTMLHeadingElement>(null);
  const scoped = useMemo(
    () =>
      collection.images.filter((image) => scope === "all" || image.favorite),
    [collection.images, scope],
  );
  const eligible = useMemo(
    () => scoped.filter((image) => !collection.unreadable.has(image.id)),
    [scoped, collection.unreadable],
  );
  const ids = useMemo(() => eligible.map((image) => image.id), [eligible]);
  const results = useMemo(
    () => filterImages(collection.images, query, favoritesOnly),
    [collection.images, query, favoritesOnly],
  );
  useEffect(() => {
    setCurrent((previous) =>
      previous && ids.includes(previous)
        ? previous
        : selectRandomImage(ids, previous),
    );
    setSingleNotice(false);
  }, [ids]);
  useEffect(() => {
    document.documentElement.dataset.theme = themeState.theme;
  }, [themeState.theme]);
  useEffect(() => {
    if (themeState.explicit) return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const change = () =>
      setThemeState((previous) => ({
        ...previous,
        theme: media.matches ? "dark" : "light",
      }));
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, [themeState.explicit]);
  function toggleTheme() {
    const theme = themeState.theme === "light" ? "dark" : "light";
    let failed = false;
    try {
      localStorage.setItem("random-gallery.theme", theme);
    } catch {
      failed = true;
    }
    setThemeState({ theme, explicit: true, failed });
  }
  function favorite(image: ImageMetadata) {
    const action = () => {
      void collection.favorite(image);
    };
    lastAction.current = action;
    action();
  }
  function requestDelete(image: ImageMetadata) {
    lastAction.current = null;
    collection.clearError();
    setDeleting(image);
  }
  async function confirmDelete() {
    if (!deleting) return;
    const id = deleting.id;
    const index = results.findIndex((image) => image.id === id);
    if (await collection.remove(id)) {
      setDeleting(null);
      if (selected === id) setSelected(null);
      requestAnimationFrame(() => {
        const cards =
          document.querySelectorAll<HTMLButtonElement>(".thumbnail");
        if (destination === "gallery" && cards.length)
          cards[Math.min(Math.max(index, 0), cards.length - 1)].focus();
        else controls.current?.focus();
      });
    }
  }
  const active = eligible.find((image) => image.id === current) ?? eligible[0];
  const preview = collection.images.find((image) => image.id === selected);
  const assetProps = {
    retryKey: collection.retryKey,
    onUnreadable: collection.markUnreadable,
    onRetry: collection.retryImages,
  };
  const empty = collection.images.length === 0;
  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="wordmark" href="./" aria-label="Random Gallery home">
          <span className="brand-mark" aria-hidden="true">
            ▧
          </span>
          <span>
            random<span className="wordmark-light">gallery</span>
            <span className="brand-period">.</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <button
            aria-current={destination === "random" ? "page" : undefined}
            onClick={() => setDestination("random")}
          >
            Random
          </button>
          <button
            aria-current={destination === "gallery" ? "page" : undefined}
            onClick={() => setDestination("gallery")}
          >
            Gallery
          </button>
        </nav>
        <button
          className="theme-toggle"
          aria-label={
            themeState.theme === "light" ? "Use dark theme" : "Use light theme"
          }
          onClick={toggleTheme}
        >
          <span aria-hidden="true">
            {themeState.theme === "light" ? "◐" : "☼"}
          </span>
        </button>
      </header>
      <main id="main">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A COLLECTION OF YOUR OWN</p>
            <h1 ref={controls} tabIndex={-1}>
              {destination === "random"
                ? "A fresh perspective."
                : "Your gallery."}
            </h1>
          </div>
          <span className="collection-count">
            {collection.status === "ready"
              ? `${collection.images.length} ${collection.images.length === 1 ? "image" : "images"} · ${cloud ? "saved to your account" : "stored locally"}`
              : cloud ? "Account collection" : "Local collection"}
          </span>
        </div>
        {cloud && <button disabled={collection.uploading || collection.pending.size > 0 || collection.status === "loading"} onClick={() => void collection.load()}>Refresh account collection</button>}
        <Uploader
          cloud={cloud}
          disabled={collection.status !== "ready"}
          uploading={collection.uploading}
          outcomes={collection.uploads}
          onUpload={collection.upload}
        />
        {themeState.failed && (
          <p role="status" className="notice">
            Theme preferences could not be saved. This theme applies for this
            session only.
          </p>
        )}
        {collection.status === "loading" ? (
          <div className="state-box" role="status">
            Opening your collection…
          </div>
        ) : collection.status === "error" ? (
          <div className="state-box error" role="alert">
            <h2>Could not open your collection.</h2>
            <p>{collection.error}</p>
            <button onClick={() => void collection.load()}>
              Retry opening collection
            </button>
          </div>
        ) : (
          <>
            {collection.error && !deleting && (
              <div role="alert" className="error notice">
                <p>{collection.error}</p>
                {lastAction.current && (
                  <button onClick={() => lastAction.current?.()}>
                    Retry last action
                  </button>
                )}
              </div>
            )}
            {empty ? (
              <section className="empty-collection">
                <div className="empty-art" aria-hidden="true">
                  <span className="art-back" />
                  <span className="art-front">
                    <span>✳</span>
                  </span>
                  <span className="art-dot" />
                </div>
                <p className="eyebrow">START WITH SOMETHING YOU LOVE</p>
                <h2>A little room for your images.</h2>
                <p>
                  Add your first photos, saved moments, or everyday inspiration.
                  <br />
                  Then let a little randomness find your next favorite.
                </p>
                <button
                  className="button primary"
                  onClick={() =>
                    document
                      .querySelector<HTMLInputElement>("input[type=file]")
                      ?.click()
                  }
                >
                  Upload your first images <span aria-hidden="true">↗</span>
                </button>
                <p className="small-note">
                  {cloud ? "Your collection is private to your account." : "Your collection stays yours. Always on this device."}
                </p>
              </section>
            ) : destination === "random" ? (
              <section aria-label="Random image viewer">
                <div className="view-toolbar">
                  <div
                    className="scope-control"
                    role="group"
                    aria-label="Random collection"
                  >
                    <button
                      aria-pressed={scope === "all"}
                      onClick={() => setScope("all")}
                    >
                      All images
                    </button>
                    <button
                      aria-pressed={scope === "favorites"}
                      onClick={() => setScope("favorites")}
                    >
                      Favorites only
                    </button>
                  </div>
                  <span className="toolbar-note">
                    A little serendipity, on demand.
                  </span>
                </div>
                {active ? (
                  <>
                    <ImageViewer
                      key={active.id}
                      image={active}
                      {...assetProps}
                      pending={collection.pending.has(active.id)}
                      onFavorite={() => favorite(active)}
                      onDelete={() => requestDelete(active)}
                    />
                    <div className="shuffle-row">
                      <button
                        className="button primary shuffle-button"
                        onClick={() => {
                          setCurrent((previous) =>
                            selectRandomImage(ids, previous),
                          );
                          setSingleNotice(ids.length === 1);
                        }}
                      >
                        <span aria-hidden="true">⤨</span> Random image
                      </button>
                      <p aria-live="polite">
                        {singleNotice
                          ? "Only one image is available in this collection."
                          : "See what turns up next."}
                      </p>
                    </div>
                  </>
                ) : scoped.length > 0 ? (
                  <div className="state-box" role="alert">
                    <h2>These images could not be read.</h2>
                    <p>
                      Your saved entries are still in Gallery. Retry reading
                      them or open Gallery to remove an entry.
                    </p>
                    <button onClick={collection.retryImages}>
                      Retry images
                    </button>
                    <button onClick={() => setDestination("gallery")}>
                      Open Gallery
                    </button>
                  </div>
                ) : (
                  <div className="state-box">
                    <h2>Your favorites are waiting.</h2>
                    <p>Favorite an image to give it a place here.</p>
                    <button onClick={() => setScope("all")}>
                      Show all images
                    </button>
                    <button onClick={() => setDestination("gallery")}>
                      Open Gallery
                    </button>
                  </div>
                )}
                {collection.unreadable.size > 0 && active && (
                  <p role="status" className="notice">
                    {collection.unreadable.size} image(s) could not be read and
                    are skipped.{" "}
                    <button onClick={collection.retryImages}>
                      Retry images
                    </button>
                  </p>
                )}
              </section>
            ) : (
              <section aria-label="Gallery images">
                <div className="view-toolbar gallery-tools">
                  <label className="search-label">
                    <span className="sr-only">Search images</span>
                    <span aria-hidden="true">⌕</span>
                    <input
                      type="search"
                      aria-label="Search images"
                      placeholder="Search by image name…"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={favoritesOnly}
                      onChange={(event) =>
                        setFavoritesOnly(event.target.checked)
                      }
                    />
                    Favorites only
                  </label>
                </div>
                {results.length ? (
                  <Gallery
                    images={results}
                    {...assetProps}
                    onOpen={(image) => setSelected(image.id)}
                    onFavorite={favorite}
                    pending={collection.pending}
                  />
                ) : (
                  <div className="state-box">
                    <h2>No images found.</h2>
                    <p>Try another name or clear your filters.</p>
                    <button
                      onClick={() => {
                        setQuery("");
                        setFavoritesOnly(false);
                      }}
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
      <footer>
        <span>Made for the things you want to keep.</span>
        <span>
          <span className="local-dot" aria-hidden="true" /> Private by nature.
          {cloud ? "Saved to your account." : "Local by design."}
        </span>
      </footer>
      {preview && (
        <ImageViewer
          image={preview}
          {...assetProps}
          pending={collection.pending.has(preview.id)}
          error={collection.error}
          onFavorite={() => favorite(preview)}
          onDelete={() => requestDelete(preview)}
          onClose={() => setSelected(null)}
        />
      )}
      {deleting && (
        <DeleteConfirmation
          image={deleting}
          pending={collection.pending.has(deleting.id)}
          error={collection.error}
          onCancel={() => {
            setDeleting(null);
            collection.clearError();
          }}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </div>
  );
}
