"use client";

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
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setBusy(true);
    setMessage(null);
    const body = new FormData();
    body.set("projectId", projectId);
    Array.from(files).forEach((file) => body.append("files", file));
    const res = await fetch("/api/photos/upload", { method: "POST", body });
    setBusy(false);
    if (!res.ok) {
      setMessage("Error");
      return;
    }
    const data = await res.json();
    setMessage(`${data.count} OK`);
    router.refresh();
  }

  return (
    <div className="border border-dashed border-white/20 p-6">
      <label className="block cursor-pointer">
        <span className="btn-ghost inline-flex">{busy ? "…" : label}</span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onChange}
          disabled={busy}
        />
      </label>
      {message && <p className="mt-3 text-sm text-sand">{message}</p>}
    </div>
  );
}
