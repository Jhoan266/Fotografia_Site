"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

export type GalleryPhoto = {
  id: string;
  filename: string;
  thumbUrl: string;
  favorite: boolean;
  selected: boolean;
  comments: { id: string; body: string; author: string; createdAt: string }[];
};

type Filter = "all" | "favorites" | "album";

export function GalleryClient({
  locale,
  projectId,
  photos: initial,
}: {
  locale: string;
  projectId: string;
  photos: GalleryPhoto[];
}) {
  const t = useTranslations("client");
  const [filter, setFilter] = useState<Filter>("all");
  const [photos, setPhotos] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutationLocks = useRef(new Set<string>());
  const commentLock = useRef(false);
  const draftVersion = useRef(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const viewerTrigger = useRef<string | null>(null);
  const viewerOpen = Boolean(activeId);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRefs = useRef(new Map<string, HTMLButtonElement>());

  const visible = useMemo(() => {
    if (filter === "favorites") return photos.filter((photo) => photo.favorite);
    if (filter === "album") return photos.filter((photo) => photo.selected);
    return photos;
  }, [filter, photos]);

  const favoritesCount = photos.filter((photo) => photo.favorite).length;
  const selectedCount = photos.filter((photo) => photo.selected).length;
  const activeIndex = activeId ? photos.findIndex((photo) => photo.id === activeId) : -1;
  const active = activeIndex >= 0 ? photos[activeIndex] : null;

  const closeViewer = useCallback(() => {
    draftVersion.current++;
    const previousId = viewerTrigger.current;
    setActiveId(null);
    setComment("");
    if (previousId) {
      requestAnimationFrame(() => triggerRefs.current.get(previousId)?.focus());
    }
  }, []);

  const navigateViewer = useCallback((direction: -1 | 1) => {
    draftVersion.current++;
    if (activeIndex < 0 || photos.length < 2) return;
    const nextIndex = (activeIndex + direction + photos.length) % photos.length;
    setActiveId(photos[nextIndex].id);
    setComment("");
  }, [activeIndex, photos]);

  useEffect(() => {
    if (!viewerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, [viewerOpen]);

  useEffect(() => {
    if (!viewerOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeViewer();
      }
      if (event.key === "Tab") {
        const elements = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]',
        ) ?? []).filter((element) => element.getClientRects().length > 0);
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
          event.preventDefault(); first?.focus();
        }
      }
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select"))) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        navigateViewer(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        navigateViewer(1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [viewerOpen, closeViewer, navigateViewer]);

  async function togglePhoto(photoId: string, field: "favorite" | "selected") {
    const key = `${photoId}:${field}`;
    if (mutationLocks.current.has(key)) return;
    const previous = photos.find((photo) => photo.id === photoId)?.[field];
    if (previous === undefined) return;
    mutationLocks.current.add(key);
    setError(null);
    setPhotos((current) => current.map((photo) => photo.id === photoId ? { ...photo, [field]: !previous } : photo));
    try {
      const response = await fetch(`/api/photos/${photoId}/${field === "favorite" ? "favorite" : "select"}`, { method: "POST" });
      if (!response.ok) throw new Error("Photo update failed");
      const data = await response.json();
      if (typeof data[field] !== "boolean") throw new Error("Invalid photo response");
      setPhotos((current) => current.map((photo) => photo.id === photoId ? { ...photo, [field]: data[field] } : photo));
    } catch {
      setPhotos((current) => current.map((photo) => photo.id === photoId ? { ...photo, [field]: previous } : photo));
      setError(t("saveError"));
    } finally {
      mutationLocks.current.delete(key);
    }
  }

  async function sendComment(photoId: string) {
    const text = comment.trim();
    if (!text || commentLock.current) return;
    const version = draftVersion.current;
    commentLock.current = true;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/photos/${photoId}/comment`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: text }),
      });
      if (!response.ok) throw new Error("Comment failed");
      const data = await response.json();
      setPhotos((current) => current.map((photo) => photo.id === photoId
        ? { ...photo, comments: [data.comment, ...photo.comments] } : photo));
      if (version === draftVersion.current) setComment("");
    } catch {
      setError(t("saveError"));
    } finally {
      commentLock.current = false;
      setPending(false);
    }
  }

  return (
    <div>
      {error && !active && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
      <section
        aria-label={t("selectionSummary")}
        className="mt-8 grid gap-px overflow-hidden border border-white/10 bg-white/10 sm:grid-cols-3"
      >
        <GalleryStat value={photos.length} label={t("totalPhotos")} />
        <GalleryStat value={favoritesCount} label={t("favoriteCount")} />
        <GalleryStat value={selectedCount} label={t("selectedCount")} />
      </section>

      <div className="sticky top-0 z-20 -mx-5 mt-6 border-y border-white/10 bg-[#0c0c0c]/95 px-5 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2" role="group" aria-label={t("galleryFilters")}>
            {(
              [
                ["all", t("filterAll"), photos.length],
                ["favorites", t("filterFavorites"), favoritesCount],
                ["album", t("filterAlbum"), selectedCount],
              ] as const
            ).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                aria-pressed={filter === id}
                className={
                  filter === id
                    ? "bg-sand px-3 py-2 text-xs font-semibold text-ink"
                    : "border border-white/20 px-3 py-2 text-xs text-white/70 transition hover:border-white/50 hover:text-white"
                }
              >
                {label} <span className="ml-1 opacity-70">{count}</span>
              </button>
            ))}
          </div>

          <a
            href={`/api/photos/download-zip?projectId=${projectId}`}
            className="btn-ghost !py-2 text-xs"
          >
            {t("downloadSelection")}
          </a>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-12 border border-dashed border-white/15 px-6 py-16 text-center">
          <p className="text-sm text-white/50">{t("emptyFilter")}</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((photo) => (
            <article
              key={photo.id}
              className="group relative overflow-hidden border border-transparent bg-ink-soft transition hover:border-white/20"
            >
              <button
                ref={(node) => {
                  if (node) triggerRefs.current.set(photo.id, node);
                  else triggerRefs.current.delete(photo.id);
                }}
                type="button"
                onClick={() => { draftVersion.current++; viewerTrigger.current = photo.id; setComment(""); setError(null); setActiveId(photo.id); }}
                className="block aspect-[4/5] w-full overflow-hidden text-left"
                aria-label={photo.filename}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.thumbUrl}
                  alt={photo.filename}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
                />
              </button>

              <button
                type="button"
                className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/65 text-lg text-white backdrop-blur transition hover:bg-black/85 focus:outline-none focus:ring-2 focus:ring-sand"
                aria-label={t("favorite")}
                aria-pressed={photo.favorite}
                onClick={() => void togglePhoto(photo.id, "favorite")}
              >
                {photo.favorite ? "♥" : "♡"}
              </button>

              {photo.selected && (
                <span className="absolute bottom-3 left-3 bg-sand px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] text-ink uppercase">
                  {t("selectedBadge")}
                </span>
              )}
            </article>
          ))}
        </div>
      )}

      {active && (
        <div
          className="fixed inset-0 z-[80] bg-black/95 p-3 md:p-6"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={active.filename}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeViewer();
          }}
        >
          <div className="mx-auto grid h-full max-w-7xl grid-rows-[minmax(0,0.45fr)_minmax(0,0.55fr)] overflow-hidden lg:grid-rows-1 border border-white/10 bg-[#101010] lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.65fr)]">
            <div className="relative flex min-h-0 items-center justify-center bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.thumbUrl}
                alt={active.filename}
                className="max-h-full max-w-full object-contain"
              />

              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => navigateViewer(-1)}
                    aria-label={t("previousPhoto")}
                    className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-xl text-white transition hover:bg-black/90"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateViewer(1)}
                    aria-label={t("nextPhoto")}
                    className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-xl text-white transition hover:bg-black/90"
                  >
                    →
                  </button>
                </>
              )}
            </div>

            <aside className="flex min-h-0 flex-col border-t border-white/10 lg:border-l lg:border-t-0">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
                <div className="min-w-0">
                  <p className="text-xs text-white/40">
                    {activeIndex + 1} / {photos.length}
                  </p>
                  <p className="mt-1 truncate text-sm text-white/80">{active.filename}</p>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:border-white/40 hover:text-white"
                  onClick={closeViewer}
                  aria-label={t("closeViewer")}
                >
                  ✕
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={active.favorite ? "btn-primary !py-2" : "btn-ghost !py-2"}
                    aria-pressed={active.favorite}
                    onClick={() => void togglePhoto(active.id, "favorite")}
                  >
                    {active.favorite ? "♥" : "♡"} {t("favorite")}
                  </button>
                  <button
                    type="button"
                    className={active.selected ? "btn-primary !py-2" : "btn-ghost !py-2"}
                    aria-pressed={active.selected}
                    onClick={() => void togglePhoto(active.id, "selected")}
                  >
                    {active.selected ? "✓" : "+"} {t("selectAlbum")}
                  </button>
                </div>

                <a
                  href={`/api/photos/${active.id}/download`}
                  className="btn-ghost mt-2 w-full !py-2"
                >
                  ↓ {t("downloadOne")}
                </a>

                <div className="mt-8">
                  <h3 className="section-label">{t("comments")}</h3>
                  {active.comments.length === 0 ? (
                    <p className="mt-4 text-sm text-white/40">{t("noComments")}</p>
                  ) : (
                    <ul className="mt-4 space-y-4">
                      {active.comments.map((item) => (
                        <li key={item.id} className="border-l border-sand/40 pl-3 text-sm text-white/70">
                          <p className="whitespace-pre-wrap break-words">{item.body}</p>
                          <p className="mt-1 text-[11px] text-white/35">
                            {item.author} · {new Date(item.createdAt).toLocaleString(locale)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="border-t border-white/10 p-4">
                {error && <p role="alert" className="mb-3 text-sm text-red-300">{error}</p>}
                <div className="flex gap-2">
                  <input
                    className="input-field"
                    value={comment}
                    maxLength={2000}
                    disabled={pending}
                    aria-label={t("commentPlaceholder")}
                    onChange={(event) => { draftVersion.current++; setComment(event.target.value); }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void sendComment(active.id);
                      }
                    }}
                    placeholder={t("commentPlaceholder")}
                  />
                  <button
                    type="button"
                    className="btn-primary shrink-0"
                    disabled={pending || !comment.trim()}
                    onClick={() => void sendComment(active.id)}
                  >
                    {t("send")}
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}

function GalleryStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-[#101010] px-5 py-4">
      <p className="font-display text-2xl text-white">{value}</p>
      <p className="mt-1 text-[10px] tracking-[0.18em] text-white/40 uppercase">{label}</p>
    </div>
  );
}
