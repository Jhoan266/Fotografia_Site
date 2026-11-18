"use client";
import { useState } from "react";
export function PreviewFrame({ locale }: { locale: string }) {
  const [width, setWidth] = useState("100%");
  const [version, setVersion] = useState(0);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {[
          ["Escritorio", "100%"],
          ["Tablet", "768px"],
          ["Móvil", "390px"],
        ].map(([label, size]) => (
          <button
            key={label}
            className="btn-ghost"
            onClick={() => setWidth(size)}
            aria-pressed={width === size}
          >
            {label}
          </button>
        ))}
        <button className="btn-ghost" onClick={() => setVersion(version + 1)}>
          Actualizar
        </button>
        <a className="btn-ghost" href={`/${locale}/studio/present`}>
          Presentar web
        </a>
      </div>
      <iframe
        key={version}
        title="Vista previa del borrador"
        src={`/${locale}/studio/present?frame=1`}
        className="mx-auto h-[75vh] max-w-full border border-white/20"
        style={{ width }}
        sandbox="allow-same-origin allow-scripts"
      />
    </div>
  );
}
