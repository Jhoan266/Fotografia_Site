export class JsonBodyTooLarge extends Error {}
export class JsonBodyTimedOut extends Error {}

/** Limit actual bytes before decoding, including chunked or misleading requests. */
export async function readJsonBody(request: Request, maxBytes: number, timeoutMs = 15_000): Promise<unknown> {
  const length = request.headers.get("content-length");
  if (length !== null && Number(length) > maxBytes) {
    void request.body?.cancel().catch(() => undefined);
    throw new JsonBodyTooLarge();
  }
  if (!request.body) throw new SyntaxError("Missing JSON body");

  let received = 0;
  let exceeded = false;
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = AbortSignal.any([timeout, request.signal]);
  const bounded = request.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      received += chunk.byteLength;
      if (received > maxBytes) {
        exceeded = true;
        controller.error(new JsonBodyTooLarge());
      } else {
        controller.enqueue(chunk);
      }
    },
  }), { signal });
  try {
    return JSON.parse(await new Response(bounded).text());
  } catch (error) {
    if (exceeded) throw new JsonBodyTooLarge();
    if (timeout.aborted) throw new JsonBodyTimedOut();
    throw error;
  }
}

export function jsonBodyErrorStatus(error: unknown) {
  return error instanceof JsonBodyTooLarge ? 413 : error instanceof JsonBodyTimedOut ? 408 : 400;
}
