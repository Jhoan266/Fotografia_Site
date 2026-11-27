import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSession, hasRecentVaultVerification } from "@/lib/session";
import { hasValidSameOrigin } from "@/lib/security";
import { rateLimit } from "@/lib/rate-limit";
import { issueClientRecovery } from "@/modules/accounts/recovery";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getAuthenticatedSession();
  if (session?.user.role !== "ADMIN") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!request.headers.has("origin") || !hasValidSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!hasRecentVaultVerification(session)) return NextResponse.json({ error: "verification_required" }, { status: 403 });
  const { id } = await context.params;
  if (!id || id.length > 128) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const limits = await Promise.all([
    rateLimit(`password-recovery-issue:${session.user.id}`, 12, 3_600_000),
    rateLimit(`password-recovery-target:${id}`, 3, 3_600_000),
  ]);
  if (limits.some(limit => !limit.ok)) return NextResponse.json({ error: "rate" }, {
    status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil(Math.max(...limits.map(l => l.retryAfterMs)) / 1000))) },
  });
  const result = await issueClientRecovery(id, session.user.id);
  if (!result) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store, no-transform" } });
}
