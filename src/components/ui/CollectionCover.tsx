import Image from "next/image";

export function CollectionCover({ src, title, priority = false }: {
  src?: string | null; title: string; priority?: boolean;
}) {
  return <div className={`collection-cover ${src ? "has-photo" : "is-empty"}`}>
    {src ? <Image src={src} alt={title} fill unoptimized priority={priority}
      sizes="(max-width:700px) 100vw, (max-width:1100px) 45vw, 30vw" />
      : <span className="collection-monogram" aria-hidden="true">{title.trim().slice(0, 1) || "V"}<i>Vera Solís · Studio</i></span>}
  </div>;
}
