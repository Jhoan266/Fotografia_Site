import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { renderProtectedPreview, PREVIEW_EDGE, LARGE_PREVIEW_EDGE } from "../src/modules/photos/protected-preview";
import { previewCode } from "../src/modules/photos/preview-identity";

test("review codes are stable, session-specific and do not expose client identity", () => {
  const old = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = "preview-only-unit-test-secret-1234567890";
  try {
    const code = previewCode("client@example.invalid", "session-a");
    assert.match(code, /^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
    assert.equal(code, previewCode("client@example.invalid", "session-a"));
    assert.notEqual(code, previewCode("other", "session-a"));
    assert.notEqual(code, previewCode("client@example.invalid", "session-b"));
    assert(!code.includes("client"));
  } finally { if (old === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = old; }
});

test("watermark changes pixels for each client without modifying the source or blurring the rest", async () => {
  const source = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#625440" } }).png().toBuffer();
  const hash = createHash("sha256").update(source).digest("hex");
  const a = await renderProtectedPreview(source, 'Foto <&> "QA"', "AAAA-BBBB-CCCC");
  const b = await renderProtectedPreview(source, 'Foto <&> "QA"', "DDDD-EEEE-FFFF");
  assert(!a.equals(b));
  assert.equal(createHash("sha256").update(source).digest("hex"), hash);
  const original = await sharp(source).removeAlpha().raw().toBuffer();
  const rendered = await sharp(a).removeAlpha().raw().toBuffer();
  let changed = 0;
  for (let i = 0; i < original.length; i += 3)
    if (original[i] !== rendered[i] || original[i + 1] !== rendered[i + 1] || original[i + 2] !== rendered[i + 2]) changed++;
  assert(changed > 500, "The watermark must be present in image pixels");
  assert(changed < 800 * 600 * 0.35, "Most image pixels must remain exact, without blur or lossy compression");
  const metadata = await sharp(a).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 800); assert.equal(metadata.height, 600);
  assert.equal(metadata.exif, undefined);
});

test("screen previews bound both edges, preserve orientation and remove capture metadata", async () => {
  const source = await sharp({ create: { width: 2800, height: 1600, channels: 3, background: "#857057" } })
    .jpeg().withMetadata({ orientation: 6 }).toBuffer();
  for (const large of [false, true]) {
    const output = await renderProtectedPreview(source, "VISTA PREVIA", "AAAA-BBBB-CCCC", large);
    const m = await sharp(output).metadata();
    assert.equal(m.height, large ? LARGE_PREVIEW_EDGE : PREVIEW_EDGE);
    assert(m.width! < m.height!);
    assert.equal(m.exif, undefined); assert.equal(m.orientation, undefined);
  }
});
