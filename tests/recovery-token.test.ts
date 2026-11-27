import assert from "node:assert/strict";
import test from "node:test";
import { newRecoveryCode, recoveryDigest, validRecoveryCode } from "../src/modules/accounts/recovery-token";

test("recovery codes use independent 256-bit secrets and only digests are persisted", () => {
  const codes = Array.from({ length: 32 }, newRecoveryCode);
  assert.equal(new Set(codes).size, codes.length);
  for (const code of codes) {
    assert(validRecoveryCode(code));
    assert.equal(Buffer.from(code, "base64url").byteLength, 32);
    assert.match(recoveryDigest(code), /^[a-f0-9]{64}$/);
    assert.notEqual(code, recoveryDigest(code));
  }
});

test("malformed, oversized and URL-like codes are rejected", () => {
  for (const code of ["", "x".repeat(42), "x".repeat(44), "é".repeat(43), "https://example.test/token", "x".repeat(42) + " "])
    assert.equal(validRecoveryCode(code), false);
});
