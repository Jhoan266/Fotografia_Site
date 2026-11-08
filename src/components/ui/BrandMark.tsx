import Link from "next/link";

export function BrandMark({
  locale,
  href,
  accent = false,
}: {
  locale: string;
  href?: string;
  accent?: boolean;
}) {
  return (
    <Link href={href || `/${locale}`} className="group block leading-none">
      <span
        className={`font-display text-lg font-semibold tracking-tight ${
          accent ? "text-sand" : "text-white"
        } group-hover:opacity-90`}
      >
        Vera Solís
      </span>
      <span className="mt-1 block text-[10px] tracking-[0.35em] text-white/55">
        FOTOGRAFÍA
      </span>
    </Link>
  );
}
