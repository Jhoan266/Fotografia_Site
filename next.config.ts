import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/api/media/**": ["./public/fonts/NotoSans.ttf"],
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  experimental: {
    // Keep builds within the resource limits of managed hosting.
    cpus: 2,
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store, no-transform" }],
      },
      { source: "/:locale/studio/:path*", headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }, { key: "Cache-Control", value: "private, no-store" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/:locale/account/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/:locale/reset-password", headers: [{ key: "Cache-Control", value: "private, no-store" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Referrer-Policy", value: "no-referrer" }] },
    ];
  },
};

export default withNextIntl(nextConfig);
