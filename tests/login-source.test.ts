import assert from "node:assert/strict";
import { test } from "node:test";
import { loginSource } from "../src/lib/login-source";

const token = "test-only-0123456789-0123456789-0123456789";
const https = "https://studio.example.invalid";

test("ignores untrusted forwarding headers in local mode", () => {
  const headers = new Headers({ "x-forwarded-for": "192.0.2.10", "x-real-ip": "192.0.2.11" });
  assert.deepEqual(loginSource(headers, undefined, "http://localhost:3000"), { allowed: true, ip: null });
  assert.equal(loginSource(headers, undefined, https).allowed, false);
  assert.equal(loginSource(headers, undefined, "http://studio.example.invalid").allowed, false);
  assert.equal(loginSource(headers, undefined, "invalid URL").allowed, false);
  assert.equal(loginSource(headers, token, https).allowed, false);
});

test("only accepts a single IP supplied by the authenticated proxy", () => {
  const headers = new Headers({ "x-studio-proxy-token": token, "x-studio-client-ip": "2001:0db8::1" });
  assert.deepEqual(loginSource(headers, token, https), { allowed: true, ip: "[2001:db8::1]" });
  headers.set("x-studio-client-ip", "192.0.2.10, 192.0.2.11");
  assert.equal(loginSource(headers, token, https).allowed, false);
  headers.set("x-studio-client-ip", "192.0.2.10");
  headers.set("x-studio-proxy-token", "wrong");
  assert.equal(loginSource(headers, token, https).allowed, false);
});

test("managed HTTPS login is explicit and ignores untrusted client IP headers", () => {
  const headers = new Headers({ "x-forwarded-for": "192.0.2.10", "x-studio-client-ip": "192.0.2.11" });
  assert.deepEqual(loginSource(headers, undefined, https, true), { allowed: true, ip: null });
  assert.equal(loginSource(headers, undefined, "http://studio.example.invalid", true).allowed, false);
  assert.equal(loginSource(headers, token, https, true).allowed, false);
});
