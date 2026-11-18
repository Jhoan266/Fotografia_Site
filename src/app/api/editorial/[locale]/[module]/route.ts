import { NextRequest, NextResponse } from "next/server";
import { changeEditorial } from "@/modules/editorial/actions";
import { hasValidSameOrigin } from "@/lib/security";
import { requireEditor } from "@/modules/editorial/access";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ locale: string; module: string }> },
) {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  if (!request.headers.has("origin") || !hasValidSameOrigin(request))
    return NextResponse.json({ ok: false }, { status: 403 });
  if (!(await rateLimit("editorial:" + user.id, 60, 60_000)).ok)
    return NextResponse.json({ ok: false }, { status: 429 });
  const text = await request.text();
  if (text.length > 120_000)
    return NextResponse.json({ ok: false }, { status: 413 });
  let body;
  try {
    body = JSON.parse(text || "null");
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!body || typeof body !== "object")
    return NextResponse.json({ ok: false }, { status: 400 });
  const params = await context.params;
  const result = await changeEditorial({
    ...body,
    locale: params.locale,
    module: params.module,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
