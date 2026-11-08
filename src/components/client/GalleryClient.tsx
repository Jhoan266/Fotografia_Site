"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export type GalleryPhoto = {
  id: string;
  filename: string;
  thumbUrl: string;
  favorite: boolean;
  selected: boolean;
  comments: { id: string; body: string; author: string; createdAt: string }[];
};

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
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "favorites" | "album">("all");
  const [photos, setPhotos] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();

  const visible = useMemo(() => {
    if (filter === "favorites") return photos.filter((p) => p.favorite);
    if (filter === "album") return photos.filter((p) => p.selected);
    return photos;
  }, [filter, photos]);

  const active = photos.find((p) => p.id === activeId) || null;

  async function toggleFavorite(photoId: string) {
    const res = await fetch(`/api/photos/${photoId}/favorite`, { method: "POST" });
    if (!res.ok) return;
    const data = await res.json();
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, favorite: data.favorite } : p)),
    );
  }

  async function toggleSelect(photoId: string) {
    const res = await fetch(`/api/photos/${photoId}/select`, { method: "POST" });
    if (!res.ok) return;
    const data = await res.json();
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, selected: data.selected } : p)),
    );
  }

  async function sendComment(photoId: string) {
    if (!comment.trim()) return;
    const res = await fetch(`/api/photos/${photoId}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: comment }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === photoId ? { ...p, comments: [data.comment, ...p.comments] } : p,
      ),
    );
    setComment("");
    startTransition(() => router.refresh());
  }

  return (
    <div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", t("filterAll")],
              ["favorites", t("filterFavorites")],
              ["album", t("filterAlbum")],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`px-3 py-1.5 text-xs tracking-wide ${
                filter === id
                  ? "bg-sand text-ink"
                  : "border border-white/25 text-white/75"
              }`}
            >
              {label}
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

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setActiveId(photo.id)}
            className="group relative aspect-[4/5] overflow-hidden bg-ink-soft"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.thumbUrl}
              alt={photo.filename}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
            <span
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center bg-black/55 text-white"
              onClick={(e) => {
                e.stopPropagation();
                void toggleFavorite(photo.id);
              }}
            >
              {photo.favorite ? "♥" : "♡"}
            </span>
          </button>
        ))}
      </div>

      {active && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/92 p-4">
          <div className="grid max-h-[92vh] w-full max-w-5xl gap-6 overflow-auto md:grid-cols-[1.4fr_1fr]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.thumbUrl}
              alt={active.filename}
              className="max-h-[70vh] w-full object-contain"
            />
            <div className="space-y-4 text-sm">
              <button
                type="button"
                className="text-white/60 hover:text-white"
                onClick={() => setActiveId(null)}
              >
                ✕
              </button>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-ghost !py-2"
                  onClick={() => void toggleFavorite(active.id)}
                >
                  {t("favorite")} {active.favorite ? "♥" : "♡"}
                </button>
                <button
                  type="button"
                  className="btn-ghost !py-2"
                  onClick={() => void toggleSelect(active.id)}
                >
                  {t("selectAlbum")} {active.selected ? "✓" : ""}
                </button>
                <a
                  href={`/api/photos/${active.id}/download`}
                  className="btn-primary !py-2"
                >
                  {t("downloadOne")}
                </a>
              </div>
              <div>
                <h3 className="section-label">{t("comments")}</h3>
                <ul className="mt-3 max-h-48 space-y-3 overflow-auto">
                  {active.comments.map((c) => (
                    <li key={c.id} className="border-l border-sand/40 pl-3 text-white/70">
                      <p>{c.body}</p>
                      <p className="mt-1 text-[11px] text-white/40">
                        {c.author} · {new Date(c.createdAt).toLocaleString(locale)}
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2">
                  <input
                    className="input-field"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t("commentPlaceholder")}
                  />
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={pending}
                    onClick={() => void sendComment(active.id)}
                  >
                    {t("send")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
