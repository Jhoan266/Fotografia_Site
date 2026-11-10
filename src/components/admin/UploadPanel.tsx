"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function UploadPanel({
  projectId,
  label,
}: {
  projectId: string;
  label: string;
}) {
  const router = useRouter();
  const t = useTranslations("admin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const files = input.files;
    if (busy || !files?.length) return;
    setBusy(true);
    setMessage(null);
    const body = new FormData();
    body.set("projectId", projectId);
    Array.from(files).forEach((file) => body.append("files", file));
    try {
      const res = await fetch("/api/photos/upload", { method: "POST", body });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setMessage(t("uploadSuccess", { count: data.count }));
      router.refresh();
    } catch {
      setMessage(t("uploadError"));
    } finally {
      setBusy(false);
      input.value = "";
    }

  }

  return (
    <div className="border border-dashed border-white/20 p-6">
      <label className="block space-y-3">
        <span className="text-sm text-white/80">{label}</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple
          className="input-field file:mr-4 file:border-0 file:bg-sand file:px-3 file:py-2 file:text-ink disabled:opacity-50"
          onChange={onChange} disabled={busy} />
      </label>
      <p role="status" aria-live="polite" className="mt-3 text-sm text-sand">
        {busy ? t("uploadPending") : message}
      </p>
    </div>
  );
}
