"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { changeEditorial } from "@/modules/editorial/actions";
import { fieldLabel, type Values } from "@/modules/editorial/schema";

type History = { id: string; revision: number; action: string; date: string };
export function ModuleEditor({
  locale,
  module,
  initial,
  revision: initialRevision,
  owner,
  history,
  assets,
}: {
  locale: string;
  module: string;
  initial: Values;
  revision: number;
  owner: boolean;
  history: History[];
  assets: { id: string; filename: string }[];
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [revision, setRevision] = useState(initialRevision);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const leave = (event: MouseEvent) => {
      if (
        (event.target as Element).closest("a") &&
        !confirm("Hay cambios sin guardar. ¿Salir del módulo?")
      )
        event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", leave, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", leave, true);
    };
  }, [dirty]);

  function change(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }
  async function act(action: string, historyId?: string, preview = false) {
    setBusy(true);
    try {
      const result = await changeEditorial({
        locale,
        module,
        revision,
        action,
        values,
        historyId,
      });
      if (!result.ok) {
        setStatus(result.error ?? "No se pudo guardar.");
        return;
      }
      setRevision(result.revision!);
      setDirty(false);
      setStatus(
        action === "publish" ? "Versión publicada." : "Borrador guardado.",
      );
      if (preview) router.push(`/${locale}/studio/preview`);
      else if (action === "restore") location.reload();
      else router.refresh();
    } catch {
      setStatus("No se pudo conectar. Puedes descargar tus cambios.");
    } finally {
      setBusy(false);
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob(
        [JSON.stringify({ locale, module, revision, values }, null, 2)],
        { type: "application/json" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = module + "-borrador.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/editorial/assets", {
        method: "POST",
        body,
      });
      if (!response.ok) {
        setStatus(
          "No se pudo subir la imagen. Usa JPEG, PNG o WebP, máximo 10 MiB.",
        );
        return;
      }
      const data = await response.json();
      setStatus(
        "Imagen subida. Copia esta dirección en el campo de imagen y guarda el borrador.",
      );
      await navigator.clipboard.writeText(data.url).catch(() => undefined);
      setAssetUrl(data.url);
    } catch {
      setStatus("No se pudo subir la imagen.");
    } finally {
      setBusy(false);
    }
  }
  const [assetUrl, setAssetUrl] = useState("");
  return (
    <div className="space-y-6">
      <p className="text-sm text-white/60">
        Revisión {revision} ·{" "}
        {dirty ? "Cambios pendientes" : "Contenido guardado"} ·{" "}
        {owner ? "Propietario" : "Diseñador"}
      </p>
      <label className="block space-y-2">
        <span>Buscar campo</span>
        <input
          className="input-field"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void act("save");
        }}
        className="space-y-5"
      >
        <fieldset disabled={busy} className="space-y-5">
          {Object.entries(values)
            .filter(([key]) =>
              fieldLabel(key).toLowerCase().includes(query.toLowerCase()),
            )
            .map(([key, value]) => (
              <label key={key} className="block space-y-2">
                <span className="block break-words text-sm text-sand">
                  {fieldLabel(key)}
                </span>
                {module === "design" ||
                (module === "launch" && key !== "comingSoon") ? (
                  <select
                    className="input-field"
                    value={value}
                    onChange={(event) => change(key, event.target.value)}
                  >
                    {(module === "design"
                      ? ["inherit", "Georgia", "Arial", "Verdana"]
                      : key === "publicMode"
                        ? ["live", "coming-soon"]
                        : ["true", "false"]
                    ).map((font) => (
                      <option className="bg-ink" key={font} value={font}>
                        {(
                          {
                            inherit: "Heredar diseño",
                            live: "Web completa",
                            "coming-soon": "Próximamente",
                            true: "Habilitado",
                            false: "Deshabilitado",
                          } as Record<string, string>
                        )[font] ?? font}
                      </option>
                    ))}
                  </select>
                ) : (
                  <textarea
                    className="input-field min-h-24 w-full"
                    maxLength={4000}
                    required
                    value={value}
                    onChange={(event) => change(key, event.target.value)}
                  />
                )}
              </label>
            ))}
        </fieldset>
        <div className="flex flex-wrap gap-3">
          <button className="btn-primary" disabled={busy}>
            Guardar borrador
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={busy}
            onClick={() => void act("save", undefined, true)}
          >
            Guardar y ver cambios
          </button>
          {owner && (
            <button
              type="button"
              className="btn-ghost"
              disabled={busy || dirty || revision === 0}
              onClick={() => {
                if (confirm("¿Publicar esta revisión guardada?"))
                  void act("publish");
              }}
            >
              Publicar revisión
            </button>
          )}
          <button type="button" className="btn-ghost" onClick={download}>
            Descargar cambios
          </button>
        </div>
      </form>
      <p role="status" className="text-sm text-sand">
        {status}
      </p>
      {module === "media" && (
        <section className="ds-card space-y-3 p-5">
          <h2 className="font-display text-xl">Biblioteca de imágenes</h2>
          <input
            aria-label="Subir imagen editorial"
            disabled={busy}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => void upload(event.target.files?.[0])}
          />
          {assetUrl && (
            <input
              aria-label="Dirección de imagen subida"
              readOnly
              className="input-field"
              value={assetUrl}
              onFocus={(event) => event.target.select()}
            />
          )}
          <ul className="grid gap-2">
            {assets.map((asset) => (
              <li key={asset.id} className="space-y-1">
                <p className="text-sm">{asset.filename}</p>
                <input
                  readOnly
                  aria-label={asset.filename}
                  className="input-field"
                  value={"/api/editorial/assets/" + asset.id}
                  onFocus={(event) => event.target.select()}
                />
              </li>
            ))}
          </ul>
          <p className="text-sm text-white/60">
            Las imágenes se hacen públicas al publicar el módulo que las
            utiliza.
          </p>
        </section>
      )}
      <section className="ds-card space-y-4 p-5">
        <h2 className="font-display text-xl">Historial</h2>
        {!history.length && <p>Aún no hay revisiones.</p>}
        {history.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3"
          >
            <span>
              Revisión {item.revision} ·{" "}
              {(
                {
                  save: "Guardado",
                  publish: "Publicación",
                  restore: "Recuperación",
                } as Record<string, string>
              )[item.action] ?? item.action}{" "}
              · {item.date}
            </span>
            {owner && (
              <button
                className="btn-ghost"
                disabled={busy || dirty}
                onClick={() => void act("restore", item.id)}
              >
                Recuperar como borrador
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
