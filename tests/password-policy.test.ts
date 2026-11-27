import assert from "node:assert/strict";
import test from "node:test";
import { fitsPasswordLimit, validNewPassword } from "../src/lib/password-policy";

test("new passwords enforce minimum length and the complete bcrypt byte boundary", () => {
  assert.equal(validNewPassword("a".repeat(11)), false);
  assert.equal(validNewPassword("a".repeat(12)), true);
  assert.equal(validNewPassword("a".repeat(72)), true);
  assert.equal(validNewPassword("a".repeat(73)), false);
  assert.equal(validNewPassword("é".repeat(36)), true);
  assert.equal(validNewPassword("é".repeat(37)), false);
  assert.equal(validNewPassword("😀".repeat(18)), true);
  assert.equal(validNewPassword("😀".repeat(19)), false);
});

test("authentication never silently truncates a submitted password", () => {
  assert.equal(fitsPasswordLimit(""), false);
  assert.equal(fitsPasswordLimit("x".repeat(72)), true);
  assert.equal(fitsPasswordLimit("x".repeat(72) + "A"), false);
  assert.equal(fitsPasswordLimit("x".repeat(72) + "B"), false);
});
