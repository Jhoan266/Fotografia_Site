import assert from "node:assert/strict";
import { test } from "node:test";
import { readJsonBody, JsonBodyTooLarge, JsonBodyTimedOut, jsonBodyErrorStatus } from "../src/lib/json-body";

function request(text: string, length?: number) {
  const bytes = new TextEncoder().encode(text);
  const headers = new Headers();
  if (length !== undefined) headers.set("content-length", String(length));
  return new Request("http://localhost/api", {
    method: "POST", headers, duplex: "half",
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.subarray(0, 3));
        controller.enqueue(bytes.subarray(3));
        controller.close();
      },
    }),
  } as RequestInit & { duplex: "half" });
}

test("accepts valid chunked Unicode JSON at the exact byte limit", async () => {
  const text = '{"body":"sesión 📷"}';
  assert.deepEqual(await readJsonBody(request(text), Buffer.byteLength(text)), { body: "sesión 📷" });
});

test("rejects oversized JSON even with missing or false length and cancels the source", async () => {
  for (const length of [undefined, 1, 100]) {
    await assert.rejects(readJsonBody(request('{"body":"' + "x".repeat(100) + '"}', length), 20), JsonBodyTooLarge);
  }
  let cancelled = false;
  const r = new Request("http://localhost/api", {
    method: "POST", duplex: "half",
    body: new ReadableStream({
      pull(controller) { controller.enqueue(new Uint8Array(64)); },
      cancel() { cancelled = true; },
    }),
  } as RequestInit & { duplex: "half" });
  await assert.rejects(readJsonBody(r, 32), JsonBodyTooLarge);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert(cancelled);
});

test("rejects malformed JSON and maps size, timeout and syntax to distinct responses", async () => {
  await assert.rejects(readJsonBody(request("{"), 20), SyntaxError);
  assert.equal(jsonBodyErrorStatus(new JsonBodyTooLarge()), 413);
  assert.equal(jsonBodyErrorStatus(new JsonBodyTimedOut()), 408);
  assert.equal(jsonBodyErrorStatus(new SyntaxError()), 400);
});

test("stalled JSON reads time out and cancel the source", async () => {
  let cancelled = false;
  const r = new Request("http://localhost/api", {
    method: "POST", duplex: "half",
    body: new ReadableStream({ cancel() { cancelled = true; } }),
  } as RequestInit & { duplex: "half" });
  // AbortSignal.timeout is unref'd, so keep the test runner alive during the read.
  const keepAlive = setInterval(() => undefined, 100);
  try {
    await assert.rejects(readJsonBody(r, 32, 20), JsonBodyTimedOut);
    assert(cancelled);
  } finally { clearInterval(keepAlive); }
});
