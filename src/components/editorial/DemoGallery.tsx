"use client";
import { useState } from "react";
import { gallery } from "@/lib/content";
export function DemoGallery() {
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  function toggle(
    id: string,
    values: string[],
    update: (value: string[]) => void,
  ) {
    update(
      values.includes(id)
        ? values.filter((value) => value !== id)
        : [...values, id],
    );
  }
  return (
    <section
      id="demo-gallery"
      className="mx-auto max-w-6xl space-y-5 px-5 py-16"
    >
      <h2 className="font-display text-3xl">Galería de demostración</h2>
      <p className="text-white/60">
        Muestras de portafolio · Favoritas {favorites.length} · Seleccionadas{" "}
        {selected.length}
      </p>
      <label className="block">
        Buscar muestra
        <input
          className="input-field mt-2"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {gallery
          .filter((item) =>
            item.alt.toLowerCase().includes(search.toLowerCase()),
          )
          .map((item) => (
            <article key={item.id} className="ds-card overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.src}
                alt={item.alt}
                className="h-56 w-full object-cover"
              />
              <div className="space-y-3 p-4">
                <p>{item.alt}</p>
                <div className="flex gap-3">
                  <button
                    className="btn-ghost"
                    aria-pressed={favorites.includes(item.id)}
                    onClick={() => toggle(item.id, favorites, setFavorites)}
                  >
                    ♡ Favorita
                  </button>
                  <button
                    className="btn-ghost"
                    aria-pressed={selected.includes(item.id)}
                    onClick={() => toggle(item.id, selected, setSelected)}
                  >
                    Seleccionar
                  </button>
                </div>
              </div>
            </article>
          ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setMessage("Datos de ejemplo validados.");
        }}
        className="ds-card space-y-4 p-5"
      >
        <h3 className="font-display text-xl">Consulta de demostración</h3>
        <label className="block">
          Nombre
          <input className="input-field mt-1" required maxLength={100} />
        </label>
        <label className="block">
          Correo
          <input className="input-field mt-1" type="email" required />
        </label>
        <button className="btn-ghost">Validar datos de ejemplo</button>
        <p role="status">{message}</p>
      </form>
    </section>
  );
}
