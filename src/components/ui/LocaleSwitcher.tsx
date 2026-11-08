"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const locales = ["es", "en", "fr"] as const;

export function LocaleSwitcher({ current }: { current: string }) {
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
                ? "border border-white/70 text-white"
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
