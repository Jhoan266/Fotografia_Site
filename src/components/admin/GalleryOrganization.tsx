"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function GalleryOrganization({ projectId, albums, photos, coverPhotoId }: {
  projectId: string;
  albums: { id: string; name: string }[];
  photos: { id: string; filename: string; albumId: string | null }[];
  coverPhotoId: string | null;
}) {
  const t = useTranslations("collections");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [destination, setDestination] = useState("");
  const [name, setName] = useState("");

  async function change(body: object) {
    if (busy) return;
    setBusy(true); setError(false); setSaved(false);
    try {
      const response = await fetch(`/api/projects/${projectId}/organization`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error();
      setSelected([]); setName(""); setSaved(true); router.refresh();
    } catch { setError(true); }
    finally { setBusy(false); }
  }

  function move(index: number, direction: number) {
    const target = index + direction;
    if (target < 0 || target >= albums.length) return;
    const ids = albums.map(a => a.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void change({ action: "reorder", albumIds: ids });
  }

  return <section className="ds-card mt-8 space-y-6 p-5 md:p-6" aria-busy={busy}>
    <div><h2 className="font-display text-2xl">{t("title")}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">{t("help")}</p></div>
    <fieldset disabled={busy} className="min-w-0 space-y-6 disabled:opacity-60">
      <form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); void change({ action: "create", name }); }}>
        <label className="block min-w-0 flex-1 space-y-2 text-sm"><span>{t("newAlbum")}</span>
          <input className="input-field" value={name} onChange={e => setName(e.target.value)} maxLength={120} required /></label>
        <button className="btn-ghost" disabled={!name.trim() || albums.length >= 100}>{t("create")}</button>
      </form>
      <div className="space-y-3">
        {albums.map((album, index) => <div key={album.id} className="rounded border border-white/10 p-3">
          <form className="flex flex-wrap items-center gap-3" onSubmit={e => {
            e.preventDefault(); const values = new FormData(e.currentTarget);
            void change({ action: "rename", albumId: album.id, name: values.get("name") });
          }}>
            <label className="min-w-0 flex-1"><span className="sr-only">{t("albumName")}</span>
              <input className="input-field" name="name" defaultValue={album.name} maxLength={120} required /></label>
            <span className="text-xs text-white/60">{photos.filter(p => p.albumId === album.id).length} {t("photos")}</span>
            <button className="btn-ghost !px-3 !py-2">{t("rename")}</button>
            <button type="button" className="btn-ghost !px-3 !py-2" disabled={index === 0} aria-label={t("moveUp", { name: album.name })} onClick={() => move(index, -1)}>↑</button>
            <button type="button" className="btn-ghost !px-3 !py-2" disabled={index === albums.length - 1} aria-label={t("moveDown", { name: album.name })} onClick={() => move(index, 1)}>↓</button>
            <button type="button" className="btn-ghost !px-3 !py-2" onClick={() => {
              if (window.confirm(t("deleteHelp"))) void change({ action: "delete", albumId: album.id });
            }}>{t("delete")}</button>
          </form>
        </div>)}
        {!albums.length && <p className="text-sm text-white/55">{t("empty")}</p>}
      </div>
      <label className="block max-w-xl space-y-2 text-sm"><span>{t("cover")}</span>
        <select className="input-field" value={coverPhotoId ?? ""} onChange={e => void change({ action: "cover", photoId: e.target.value || null })}>
          <option value="">{t("automaticCover")}</option>
          {photos.map(p => <option key={p.id} value={p.id}>{p.filename}</option>)}
        </select>
      </label>
      <details className="rounded border border-white/10 p-4">
        <summary className="cursor-pointer text-sm">{t("organize")}</summary>
        <div className="mt-4 grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2">
          {photos.map(photo => <label key={photo.id} className="flex min-w-0 items-start gap-3 rounded bg-white/5 p-3 text-sm">
            <input type="checkbox" checked={selected.includes(photo.id)} disabled={!selected.includes(photo.id) && selected.length >= 500}
              onChange={e => setSelected(current => e.target.checked ? [...current, photo.id] : current.filter(id => id !== photo.id))} />
            <span className="min-w-0 break-words">{photo.filename}<span className="mt-1 block text-xs text-white/50">{albums.find(a => a.id === photo.albumId)?.name ?? t("unassigned")}</span></span>
          </label>)}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block min-w-0 flex-1 space-y-2 text-sm"><span>{t("destination")}</span>
            <select className="input-field" value={destination} onChange={e => setDestination(e.target.value)}>
              <option value="">{t("unassigned")}</option>
              {albums.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select></label>
          <button type="button" className="btn-ghost" disabled={!selected.length} onClick={() => void change({ action: "assign", albumId: destination || null, photoIds: selected })}>{t("moveSelected", { count: selected.length })}</button>
        </div>
      </details>
    </fieldset>
    <p role="status" className="text-sm text-white/70">{busy ? t("saving") : error ? t("error") : saved ? t("saved") : ""}</p>
  </section>;
}
