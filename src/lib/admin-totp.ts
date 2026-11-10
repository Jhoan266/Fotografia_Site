import { createHmac, timingSafeEqual } from "node:crypto";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function adminTotpStep(email: string, code: string, now = Date.now()): number | null {
  if (!/^[0-9]{6}$/.test(code)) return null;

  let secrets: unknown;
  try {
    secrets = JSON.parse(process.env.ADMIN_TOTP_SECRETS ?? "{}");
  } catch {
    return null;
  }

  if (!secrets || typeof secrets !== "object" || !Object.hasOwn(secrets, email)) return null;
  const secret = (secrets as Record<string, unknown>)[email];
  if (typeof secret !== "string" || !/^[A-Z2-7]{32}$/.test(secret)) return null;

  const key = Buffer.alloc(20);
  let pending = 0;
  let bits = 0;
  let index = 0;
  for (const character of secret) {
    pending = (pending << 5) | alphabet.indexOf(character);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      key[index++] = (pending >> bits) & 255;
    }
  }

  const currentStep = Math.floor(now / 30_000);
  const provided = Buffer.from(code);
  for (const step of [currentStep, currentStep - 1, currentStep + 1]) {
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(step));
    const digest = createHmac("sha1", key).update(counter).digest();
    const offset = digest[digest.length - 1] & 15;
    const value = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
    const expected = Buffer.from(String(value).padStart(6, "0"));
    if (timingSafeEqual(expected, provided)) return step;
  }
  return null;
}
