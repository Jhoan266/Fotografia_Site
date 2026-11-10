import assert from "node:assert/strict";
import { mkdtemp, readFile, unlink, writeFile, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

test("S3 restore preserves object keys and bytes in an independent store", {
  skip: process.env.ALLOW_LOCAL_S3_TEST !== "1" || !process.env.S3_RESTORE_ENDPOINT,
}, async () => {
  const source = process.env.S3_ENDPOINT!;
  const target = process.env.S3_RESTORE_ENDPOINT!;
  for (const address of [source, target]) {
    assert.equal(new URL(address).hostname, "127.0.0.1");
  }
  assert.notEqual(new URL(source).origin, new URL(target).origin);
  assert.equal(process.env.S3_BUCKET, "fotografia-qa");
  assert.equal(process.env.S3_ACCESS_KEY, "fotografia-qa");

  const storage = new S3StorageProvider();
  const id = randomUUID();
  const files = new Map([
    [`originals/${id}.jpg`, Buffer.from("synthetic original")],
    [`thumbs/${id}.webp`, Buffer.from("synthetic thumbnail")],
  ]);
  const directory = await mkdtemp(join(tmpdir(), "fotografia-s3-restore-"));
  const backup = [...files.keys()].map((key, index) => ({ key, path: join(directory, String(index)) }));
  try {
    for (const [key, bytes] of files) await storage.put(key, bytes);
    for (const { key, path } of backup) await writeFile(path, await storage.get(key));
    for (const key of files.keys()) {
      await storage.delete(key);
      assert.equal(await storage.size(key), null);
    }

    process.env.S3_ENDPOINT = target;
    for (const { key, path } of backup) {
      assert.equal(await storage.size(key), null);
      await storage.put(key, await readFile(path));
    }
    for (const [key, bytes] of files) {
      assert.equal(await storage.size(key), bytes.length);
      assert.deepEqual(await storage.get(key), bytes);
    }
  } finally {
    try {
      for (const endpoint of [source, target]) {
        process.env.S3_ENDPOINT = endpoint;
        await Promise.all([...files.keys()].map((key) => storage.delete(key)));
      }
    } finally {
      process.env.S3_ENDPOINT = source;
      for (const { path } of backup) {
        await unlink(path).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== "ENOENT") throw error;
        });
      }
      await rmdir(directory);
    }
  }
});
