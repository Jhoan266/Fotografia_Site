import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { planZip, streamZip } from "../src/modules/photos/zip-export";
import { S3StorageProvider } from "../src/modules/storage/s3";

test("isolated S3 supports private objects, streaming ZIPs and cleanup", {
  skip: process.env.ALLOW_LOCAL_S3_TEST !== "1",
}, async () => {
  const endpoint = new URL(process.env.S3_ENDPOINT!);
  const bucket = process.env.S3_BUCKET;
  assert.equal(endpoint.hostname, "127.0.0.1");
  assert.equal(bucket, "fotografia-qa");
  assert.equal(process.env.S3_ACCESS_KEY, "fotografia-qa");
  assert.equal(process.env.S3_FORCE_PATH_STYLE, "true");

  const storage = new S3StorageProvider();
  const signal = AbortSignal.timeout(30_000);
  const key = `fixtures/${randomUUID()}/fóto con espacios.jpg`;
  const data = Buffer.from("synthetic S3 fixture");
  const filename = "fixture.jpg";
  try {
    assert.equal(await storage.size(key, signal), null);
    assert.deepEqual(await storage.put(key, data), { key, size: data.length });
    assert.equal(await storage.size(key, signal), data.length);
    assert.deepEqual(await storage.get(key), data);

    const anonymous = await fetch(new URL(
      `/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`, endpoint,
    ), { signal });
    assert.equal(anonymous.status, 403);
    await anonymous.body?.cancel();

    await assert.rejects(storage.size(key, AbortSignal.abort()));
    const entries = await planZip([{ filename, storageKey: key }], storage, signal);
    let release!: () => void;
    const closed = new Promise<void>((resolve) => { release = resolve; });
    const response = new Response(streamZip(entries, storage, signal, release));
    const zip = Buffer.from(await response.arrayBuffer());
    await closed;
    assert.equal(zip.readUInt32LE(0), 0x04034b50);
    const offset = 30 + zip.readUInt16LE(26) + zip.readUInt16LE(28);
    assert.deepEqual(zip.subarray(offset, offset + data.length), data);
  } finally {
    await storage.delete(key);
  }
  assert.equal(await storage.size(key, signal), null);
});
