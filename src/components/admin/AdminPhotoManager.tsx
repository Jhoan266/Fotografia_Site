"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AdminPhoto = {
  id: string;
  filename: string;
  thumbUrl: string;
};

export function AdminPhotoManager({
  projectId,
  initialPhotos,
  deleteLabel,
}: {
  projectId: string;
  initialPhotos: AdminPhoto[];
  deleteLabel: string;
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initialPhotos);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  async function persistOrder(next: AdminPhoto[]) {
    setSavingOrder(true);
    const response = await fetch("/api/photos/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        photoIds: next.map((photo) => photo.id),
      }),
    });
    setSavingOrder(false);

    if (!response.ok) {
      setPhotos(photos);
      return;
    }
    router.refresh();
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= photos.length || savingOrder) return;

    const next = [...photos];
    [next[index], next[target]] = [next[target], next[index]];
    setPhotos(next);
    void persistOrder(next);
  }

  async function remove(photoId: string) {
    if (busyId) return;
    setBusyId(photoId);

    const response = await fetch(`/api/photos/${photoId}/delete`, {
      method: "DELETE",
    });

    setBusyId(null);
    if (!response.ok) return;

    setPhotos((current) => current.filter((photo) => photo.id !== photoId));
    router.refresh();
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {photos.map((photo, index) => (
        <article key={photo.id} className="group overflow-hidden border border-white/10 bg-ink-soft">
          <div className="aspect-[4/5] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.thumbUrl}
              alt={photo.filename}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex items-center justify-between gap-2 p-2">
            <div className="flex gap-1">
              <button
                type="button"
                className="btn-ghost !px-2 !py-1 text-xs"
                aria-label="Move photo left"
                disabled={index === 0 || savingOrder}
                onClick={() => move(index, -1)}
              >
                ←
              </button>
              <button
                type="button"
                className="btn-ghost !px-2 !py-1 text-xs"
                aria-label="Move photo right"
                disabled={index === photos.length - 1 || savingOrder}
                onClick={() => move(index, 1)}
              >
                →
              </button>
            </div>
            <button
              type="button"
              className="text-xs text-red-300 transition hover:text-red-200 disabled:opacity-50"
              disabled={busyId === photo.id}
              onClick={() => void remove(photo.id)}
            >
              {busyId === photo.id ? "…" : deleteLabel}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
