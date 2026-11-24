import assert from "node:assert/strict";
import { test } from "node:test";
import { parseConfirmation, selectionCsv, selectionText } from "../src/modules/projects/selection-export";

test("confirmation requires a bounded, unique selection and an integer version", () => {
  assert.deepEqual(parseConfirmation({ version: 0, photoIds: ["a", "b"] }), { version: 0, photoIds: ["a", "b"] });
  for (const input of [null, { version: -1, photoIds: ["a"] }, { version: 0, photoIds: [] },
    { version: 0, photoIds: ["a", "a"] }, { version: 0, photoIds: [1] },
    { version: 0, photoIds: Array.from({ length: 501 }, (_, i) => String(i)) }])
    assert.equal(parseConfirmation(input), null);
});

test("exports preserve filenames and IDs while escaping CSV formulas, quotes and line breaks", () => {
  const items = [{ id: "one", filename: '="unsafe",photo.jpg' }, { id: "two", filename: " \t+command.jpg" },
    { id: "three", filename: "sesión.jpg" }, { id: "four", filename: "line\nbreak.jpg" }];
  const csv = selectionCsv(items);
  assert(csv.startsWith("\uFEFFphoto_id,filename\r\n"));
  assert(csv.includes('"one","\'=\"\"unsafe\"\",photo.jpg"'));
  assert(csv.includes('"\' \t+command.jpg"'));
  assert(csv.includes("sesión.jpg"));
  assert.equal(selectionText(items).split("\n").length, 5);
});
