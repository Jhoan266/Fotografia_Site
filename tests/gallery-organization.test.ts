import assert from "node:assert/strict";
import { test } from "node:test";
import { parseOrganizationChange as parse } from "../src/modules/projects/organization-input";

test("organization changes validate names, complete ID lists and explicit unassignment", () => {
  assert.deepEqual(parse({ action: "create", name: "  Ceremonia  " }), { action: "create", name: "Ceremonia" });
  assert.deepEqual(parse({ action: "assign", albumId: null, photoIds: ["photo"] }), { action: "assign", albumId: null, photoIds: ["photo"] });
  assert.deepEqual(parse({ action: "cover", photoId: null }), { action: "cover", photoId: null });
  for (const value of [
    null, { action: "create", name: " " }, { action: "create", name: "x".repeat(121) },
    { action: "rename", albumId: "", name: "x" }, { action: "delete", albumId: 1 },
    { action: "assign", albumId: null, photoIds: [] }, { action: "assign", albumId: null, photoIds: ["a", "a"] },
    { action: "assign", albumId: null, photoIds: Array.from({ length: 501 }, (_, i) => String(i)) },
    { action: "reorder", albumIds: ["a", 1] }, { action: "cover", photoId: "x".repeat(129) },
  ]) assert.equal(parse(value), null);
});
