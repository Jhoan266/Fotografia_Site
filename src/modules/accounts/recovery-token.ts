import { createHash, randomBytes } from "node:crypto";

export const RECOVERY_LIFETIME_MS = 15 * 60_000;
export const newRecoveryCode = () => randomBytes(32).toString("base64url");
export const validRecoveryCode = (code: string) => /^[A-Za-z0-9_-]{43}$/.test(code);
export const recoveryDigest = (code: string) => createHash("sha256").update(code).digest("hex");
