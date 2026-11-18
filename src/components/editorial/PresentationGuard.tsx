"use client";
import { useEffect } from "react";
export function PresentationGuard({
  locale,
  framed,
}: {
  locale: string;
  framed: boolean;
}) {
  useEffect(() => {
    const block = (event: MouseEvent) => {
      const link = (event.target as Element).closest("a");
      if (!link) return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname)
        event.preventDefault();
    };
    const prevent = (event: Event) => {
      if (!(event.target as Element).closest("#demo-gallery"))
        event.preventDefault();
    };
    document.addEventListener("click", block, true);
    document.addEventListener("submit", prevent, true);
    return () => {
      document.removeEventListener("click", block, true);
      document.removeEventListener("submit", prevent, true);
    };
  }, []);
  if (framed) return null;
  return (
    <aside className="fixed bottom-4 left-4 z-[90] rounded border border-sand/40 bg-ink p-3 shadow-xl">
      <details>
        <summary className="cursor-pointer">Recorrido privado</summary>
        <div className="mt-3 flex flex-wrap gap-3">
          <a
            href={`/${locale}/studio`}
            onClick={(event) => {
              event.preventDefault();
              location.href = `/${locale}/studio`;
            }}
          >
            Editar contenido
          </a>
          <button
            onClick={() =>
              document.fullscreenElement
                ? document.exitFullscreen()
                : document.documentElement.requestFullscreen()
            }
          >
            Pantalla completa
          </button>
          <a href="#portafolio">Portafolio de muestra</a>
        </div>
      </details>
    </aside>
  );
}
