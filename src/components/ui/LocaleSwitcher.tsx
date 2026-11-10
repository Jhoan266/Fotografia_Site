"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const locales = ["es", "en", "fr"] as const;

export function LocaleSwitcher({
  current,
  appearance = "dark",
}: {
  current: string;
  appearance?: "dark" | "light";
}) {
  const pathname = usePathname();
  const rest = pathname.replace(/^\/(es|en|fr)/, "") || "";

  return (
    <div className="flex items-center gap-1 text-[11px] tracking-[0.18em]">
      {locales.map((locale) => {
        const active = locale === current;
        return (
          <Link
            key={locale}
            href={`/${locale}${rest}`}
            className={`px-2 py-1 uppercase transition ${
              active
                ? appearance === "light"
                  ? "border border-black/40 text-ink"
                  : "border border-white/70 text-white"
                : appearance === "light"
                  ? "text-black/50 hover:text-black"
                  : "text-white/50 hover:text-white"
            }`}
          >
            {locale}
          </Link>
        );
      })}
    </div>
  );
}
