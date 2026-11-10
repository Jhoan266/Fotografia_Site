export class UploadBodyTooLarge extends Error {}
export class UploadBodyTimedOut extends Error {}

const UPLOAD_READ_TIMEOUT_MS = 5 * 60_000;

export async function readUploadForm(request: Request, maxBytes: number) {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null && Number(declaredLength) > maxBytes) {
    void request.body?.cancel().catch(() => undefined);
    throw new UploadBodyTooLarge();
  }

  const contentType = request.headers.get("content-type");
  if (!request.body || !contentType?.toLowerCase().startsWith("multipart/form-data;")) {
    throw new TypeError("Expected multipart form data");
  }

  let received = 0;
  let exceeded = false;
  const timeout = AbortSignal.timeout(UPLOAD_READ_TIMEOUT_MS);
  const bounded = request.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      received += chunk.byteLength;
      if (received > maxBytes) {
        exceeded = true;
        controller.error(new UploadBodyTooLarge());
        return;
      }
      controller.enqueue(chunk);
    },
  }), { signal: timeout });

  try {
    return await new Response(bounded, { headers: { "content-type": contentType } }).formData();
  } catch (error) {
    if (exceeded) throw new UploadBodyTooLarge();
    if (timeout.aborted) throw new UploadBodyTimedOut();
    throw error;
  }
}
