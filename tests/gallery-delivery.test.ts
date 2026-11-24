import assert from "node:assert/strict";
import { test } from "node:test";
import { isGalleryAvailable, canDownloadGallery, parseGalleryExpiry } from "../src/modules/projects/delivery-policy";

test("expiry blocks access exactly at its deadline, independently of download settings", () => {
  const now = new Date("2026-11-24T12:00:00Z");
  const project = { status: "DELIVERED", downloadsEnabled: true, expiresAt: null };
  assert(isGalleryAvailable(project, now));
  assert(canDownloadGallery(project, now));
  assert(isGalleryAvailable({ ...project, expiresAt: new Date(now.getTime() + 1) }, now));
  assert(!isGalleryAvailable({ ...project, expiresAt: now }, now));
  assert(!canDownloadGallery({ ...project, expiresAt: now }, now));
  assert(!isGalleryAvailable({ ...project, status: "DRAFT" }, now));
  assert(!isGalleryAvailable({ ...project, status: "ARCHIVED" }, now));
  assert(!canDownloadGallery({ ...project, downloadsEnabled: false }, now));
});

test("expiry dates are inclusive in UTC and invalid calendar dates are rejected", () => {
  assert.equal(parseGalleryExpiry(""), null);
  assert.equal(parseGalleryExpiry("2026-11-24")?.toISOString(), "2026-11-25T00:00:00.000Z");
  assert.equal(parseGalleryExpiry("2028-02-29")?.toISOString(), "2028-03-01T00:00:00.000Z");
  for (const date of ["2026-02-29", "2026-13-01", "2026-04-31", "no", "2026-1-2"])
    assert.equal(parseGalleryExpiry(date), undefined);
});
