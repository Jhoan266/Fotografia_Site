import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

// Stable account keys share the allowance across sessions, photos and URL variants.
// PostgreSQL increments atomically, including across application workers.
const limits = { preview: 600, download: 60, zip: 6 } as const;

export async function limitClientDelivery(userId: string, kind: keyof typeof limits) {
  const result = await rateLimit(`photo-delivery:${kind}:${userId}`, limits[kind], 60_000);
  if (result.ok) return null;
  return NextResponse.json({ error: "photo_request_limit" }, {
    status: 429,
    headers: {
      "Retry-After": String(Math.max(1, Math.ceil(result.retryAfterMs / 1000))),
      "Cache-Control": "private, no-store, no-transform",
    },
  });
}
