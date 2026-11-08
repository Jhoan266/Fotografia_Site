import { createHash, createHmac } from "crypto";
import { Readable } from "stream";
import type { StorageProvider } from "@/modules/storage/types";

type S3Config = {
  endpoint: URL;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  forcePathStyle: boolean;
};

function env(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for STORAGE_DRIVER=s3.`);
  return value;
}

function config(): S3Config {
  return {
    endpoint: new URL(env("S3_ENDPOINT")),
    region: process.env.S3_REGION?.trim() || "us-east-1",
    bucket: env("S3_BUCKET"),
    accessKey: env("S3_ACCESS_KEY"),
    secretKey: env("S3_SECRET_KEY"),
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE || "true").toLowerCase() === "true",
  };
}

function sha256(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function encodeKey(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

function objectUrl(cfg: S3Config, key: string) {
  const encoded = encodeKey(key);
  if (cfg.forcePathStyle) {
    const base = cfg.endpoint.toString().replace(/\/$/, "");
    return new URL(`${base}/${encodeURIComponent(cfg.bucket)}/${encoded}`);
  }

  const url = new URL(cfg.endpoint);
  url.hostname = `${cfg.bucket}.${url.hostname}`;
  url.pathname = `/${encoded}`;
  return url;
}

function amzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

async function signedFetch(
  method: "GET" | "PUT" | "HEAD",
  key: string,
  body?: Buffer,
) {
  const cfg = config();
  const url = objectUrl(cfg, key);
  const now = new Date();
  const timestamp = amzDate(now);
  const dateStamp = timestamp.slice(0, 8);
  const payloadHash = sha256(body || Buffer.alloc(0));

  const canonicalHeaders =
    `host:${url.host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${timestamp}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    method,
    url.pathname,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${cfg.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    timestamp,
    scope,
    sha256(canonicalRequest),
  ].join("\n");

  const kDate = hmac(`AWS4${cfg.secretKey}`, dateStamp);
  const kRegion = hmac(kDate, cfg.region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${cfg.accessKey}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(url, {
    method,
    body: method === "PUT" ? body : undefined,
    headers: {
      Authorization: authorization,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": timestamp,
    },
  });
}

export class S3StorageProvider implements StorageProvider {
  async put(key: string, data: Buffer) {
    const response = await signedFetch("PUT", key, data);
    if (!response.ok) {
      throw new Error(`S3 PUT failed with ${response.status}.`);
    }
    return { key, size: data.byteLength };
  }

  async get(key: string) {
    const response = await signedFetch("GET", key);
    if (!response.ok) {
      throw new Error(`S3 GET failed with ${response.status}.`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  async exists(key: string) {
    const response = await signedFetch("HEAD", key);
    if (response.status === 404) return false;
    if (!response.ok) {
      throw new Error(`S3 HEAD failed with ${response.status}.`);
    }
    return true;
  }

  async openReadStream(key: string) {
    const response = await signedFetch("GET", key);
    if (!response.ok || !response.body) {
      throw new Error(`S3 stream failed with ${response.status}.`);
    }
    return Readable.fromWeb(response.body as import("stream/web").ReadableStream);
  }
}
