import assert from "node:assert/strict";
import { once } from "node:events";
import { Readable } from "node:stream";
import { test } from "node:test";
import { planZip, reserveZipExport, streamZip, ZipLimitExceeded } from "../src/modules/photos/zip-export";

const photos = ["a", "missing", "b"].map((storageKey) => ({ storageKey, filename: "same.jpg" }));
const storage = { size: async (key: string) => key === "missing" ? null : 5 };
const signal = new AbortController().signal;

test("ZIP planning counts stored bytes and resolves duplicate filenames", async () => {
  await assert.rejects(planZip(photos, storage, signal, 9), ZipLimitExceeded);
  assert.deepEqual(await planZip(photos, storage, signal, 10), [
    { name: "same.jpg", key: "a", size: 5 },
    { name: "same-2.jpg", key: "b", size: 5 },
  ]);
});

test("ZIP reservations are bounded per user and process", () => {
  const first = reserveZipExport("first");
  const second = reserveZipExport("second");
  assert(first && second);
  try {
    assert.equal(reserveZipExport("first"), null);
    assert.equal(reserveZipExport("third"), null);
  } finally {
    first();
    second();
  }
  const retry = reserveZipExport("first");
  assert(retry);
  retry();
  first();
});

test("cancelling a ZIP aborts the active source, releases its slot, and leaves other sources unopened", async () => {
  const input = new Readable({ read() {} });
  const closed = once(input, "close");
  let started!: () => void;
  const opened = new Promise<void>((resolve) => { started = resolve; });
  let released!: () => void;
  const done = new Promise<void>((resolve) => { released = resolve; });
  const keys: string[] = [];
  const stream = streamZip(await planZip(photos, storage, signal), {
    openReadStream(key, sourceSignal) {
      keys.push(key);
      sourceSignal?.addEventListener("abort", () => input.destroy(), { once: true });
      started();
      return input;
    },
  }, signal, released);

  await opened;
  await stream.cancel();
  await Promise.all([closed, done]);
  assert.deepEqual(keys, ["a"]);
});

test("a stored file that grows after sizing aborts the ZIP", async () => {
  let released!: () => void;
  const done = new Promise<void>((resolve) => { released = resolve; });
  const entries = await planZip(photos.slice(0, 1), storage, signal);
  const stream = streamZip(entries, {
    openReadStream: () => Readable.from([Buffer.alloc(6)]),
  }, signal, released);

  await assert.rejects(new Response(stream).arrayBuffer(), ZipLimitExceeded);
  await done;
});
