"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { verifyVault } from "@/modules/photos/verify-vault";
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
  downloadLabel,
}: {
  projectId: string;
  initialPhotos: AdminPhoto[];
  deleteLabel: string;
  downloadLabel?: string;
}) {
  const router = useRouter();
  const t = useTranslations("vaultVerification");
  const [verifiedUntil, verify, verifying] = useActionState(verifyVault, 0);
  const [expiredVerification, setExpiredVerification] = useState(0);
  const [deleteError, setDeleteError] = useState(false);
  const verified = verifiedUntil !== null && verifiedUntil > expiredVerification;

  useEffect(() => {
    if (!verified || !verifiedUntil) return;
    const timer = window.setTimeout(() => setExpiredVerification(verifiedUntil),
      Math.max(0, verifiedUntil - Date.now()));
    return () => window.clearTimeout(timer);
  }, [verified, verifiedUntil]);
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
    if (busyId || !verified || !window.confirm(t("confirmDelete"))) return;
    setDeleteError(false);
    setBusyId(photoId);

    try {
      const response = await fetch(`/api/photos/${photoId}/delete`, {
        method: "DELETE",
      });
      if (!response.ok) {
        if (response.status === 403 && verifiedUntil) setExpiredVerification(verifiedUntil);
        setDeleteError(true);
        return;
      }
      setPhotos((current) => current.filter((photo) => photo.id !== photoId));
      router.refresh();
    } catch {
      setDeleteError(true);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {photos.length > 0 && (verified ? (
        <form method="post" action={`/api/photos/download-zip?projectId=${encodeURIComponent(projectId)}`}>
          <button type="submit" className="btn-ghost">{t("export")}</button>
        </form>
      ) : (
        <form id={`vault-verify-${projectId}`} action={verify} className="space-y-2">
          <p className="text-sm text-white/65">{t("help")}</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block space-y-1">
              <span className="text-sm">{t("password")}</span>
              <input className="input-field" name="password" type="password" autoComplete="current-password" maxLength={128} required />
            </label>
            <button className="btn-ghost" disabled={verifying}>{t("unlock")}</button>
          </div>
          {verifiedUntil === null && <p role="alert" className="text-sm text-red-300">{t("invalid")}</p>}
        </form>
      ))}
      {deleteError && <p role="alert" className="text-sm text-red-300">{t("deleteError")}</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {photos.map((photo, index) => (
          <article key={photo.id} className="group overflow-hidden border border-white/10 bg-ink-soft">
            <div className="aspect-[4/5] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                loading="lazy"
                src={photo.thumbUrl}
                alt={photo.filename}
                className="h-full w-full object-cover"
              />
            </div>
            {downloadLabel && <div className="space-y-2 px-3 pt-3">
              <p className="truncate text-sm" title={photo.filename}>{photo.filename}</p>
              <a className="ds-focus inline-block text-xs text-sand" href={`/api/photos/${encodeURIComponent(photo.id)}/download`}>{downloadLabel}</a>
            </div>}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2">
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
                disabled={!verified || busyId !== null}
                onClick={() => void remove(photo.id)}
              >
                {busyId === photo.id ? "…" : deleteLabel}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
