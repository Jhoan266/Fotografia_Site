"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { SubmittedPhoto } from "@/modules/projects/selection-export";

export function SelectionReview({ projectId, confirmed, items, version }: { projectId: string; confirmed: boolean; items: SubmittedPhoto[]; version: number }) {
  const t = useTranslations("proofing");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function reopen() {
    if (busy || !window.confirm(t("reopenPrompt"))) return;
    setBusy(true); setError(false);
    try {
      const r = await fetch(`/api/projects/${projectId}/selection`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reopen", version }) });
      if (!r.ok) throw new Error();
      router.refresh();
    } catch { setError(true); }
    finally { setBusy(false); }
  }
  return <section className="ds-card mt-8 space-y-4 p-5 md:p-6">
    <h2 className="font-display text-2xl">{t("title")}</h2>
    <p className="max-w-2xl text-sm leading-relaxed text-white/65">{confirmed ? t("received", { count: items.length }) : t("waiting")}</p>
    {confirmed && <>
      <div className="flex flex-wrap gap-3">
        <a className="btn-ghost" href={`/api/projects/${projectId}/selection?format=csv`}>{t("csv")}</a>
        <a className="btn-ghost" href={`/api/projects/${projectId}/selection?format=txt`}>{t("txt")}</a>
        <button className="btn-ghost" type="button" disabled={busy} onClick={() => void reopen()}>{t("reopen")}</button>
      </div>
      <p className="text-xs leading-relaxed text-white/55">{t("exportHelp")}</p>
      <details><summary className="cursor-pointer text-sm">{t("viewList")}</summary>
        <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm text-white/70">{items.map(item => <li className="break-words" key={item.id}>{item.filename}</li>)}</ul>
      </details>
    </>}
    {error && <p role="alert" className="text-sm text-red-300">{t("error")}</p>}
  </section>;
}
