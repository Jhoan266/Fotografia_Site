import assert from "node:assert/strict";
import { test } from "node:test";
import { readUploadForm, UploadBodyTooLarge } from "../src/modules/photos/upload-body";

const multipart = "--qa\r\nContent-Disposition: form-data; name=\"projectId\"\r\n\r\nproject\r\n--qa--\r\n";
const bytes = new TextEncoder().encode(multipart);

function request(length?: number) {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes.subarray(0, 20));
      controller.enqueue(bytes.subarray(20));
      controller.close();
    },
  });
  const headers = new Headers({ "content-type": "multipart/form-data; boundary=qa" });
  if (length !== undefined) headers.set("content-length", String(length));
  return new Request("http://localhost/upload", {
    method: "POST", headers, body, duplex: "half",
  } as RequestInit & { duplex: "half" });
}

test("accepts a streamed multipart body at the byte limit without a length header", async () => {
  assert.equal((await readUploadForm(request(), bytes.length)).get("projectId"), "project");
});

test("enforces the byte limit even without an accurate length header", async () => {
  for (const length of [undefined, 1, bytes.length]) {
    await assert.rejects(readUploadForm(request(length), bytes.length - 1), UploadBodyTooLarge);
  }
});
