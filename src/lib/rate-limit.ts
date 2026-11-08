import { prisma } from "@/lib/prisma";

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
};

export async function rateLimit(
  key: string,
  limit = 8,
  windowMs = 60_000,
): Promise<RateLimitResult> {
  const now = new Date();
  const nextReset = new Date(now.getTime() + windowMs);

  const rows = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
    VALUES (${key}, 1, ${nextReset})
    ON CONFLICT ("key") DO UPDATE
    SET
      "count" = CASE
        WHEN "RateLimitBucket"."resetAt" <= ${now} THEN 1
        ELSE "RateLimitBucket"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "RateLimitBucket"."resetAt" <= ${now} THEN ${nextReset}
        ELSE "RateLimitBucket"."resetAt"
      END
    RETURNING "count", "resetAt"
  `;

  const bucket = rows[0];
  if (!bucket) {
    return { ok: false, remaining: 0, retryAfterMs: windowMs };
  }

  const ok = bucket.count <= limit;
  return {
    ok,
    remaining: ok ? Math.max(0, limit - bucket.count) : 0,
    retryAfterMs: ok ? 0 : Math.max(0, bucket.resetAt.getTime() - Date.now()),
  };
}

export async function clearRateLimit(key: string) {
  await prisma.rateLimitBucket.deleteMany({ where: { key } });
}
