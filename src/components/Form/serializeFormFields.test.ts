import test from "node:test";
import assert from "node:assert/strict";
import { formEntriesToRecord } from "./serializeFormFields";

// Entries below mirror what `new FormData(form)` yields in a browser: unchecked
// checkboxes and unselected radios contribute nothing, a checked checkbox
// contributes its value attribute (or "on"), file inputs contribute a File.

test("unchecked checkbox is omitted (no implied consent)", () => {
  const data = formEntriesToRecord([
    ["email", "a@b.co"],
    ["_ph_hp", ""],
  ]);
  assert.deepEqual(data, { email: "a@b.co", _ph_hp: "" });
  assert.equal("marketingOptIn" in data, false);
});

test("checked checkbox keeps its value (or 'on')", () => {
  assert.deepEqual(formEntriesToRecord([["marketingOptIn", "on"]]), { marketingOptIn: "on" });
  assert.deepEqual(formEntriesToRecord([["terms", "yes"]]), { terms: "yes" });
});

test("radio group sends only the checked option", () => {
  assert.deepEqual(formEntriesToRecord([["size", "m"]]), { size: "m" });
});

test("File entries are dropped, strings kept", () => {
  const fd = new FormData();
  fd.append("name", "Ada");
  fd.append("upload", new Blob(["x"]), "x.txt");
  assert.deepEqual(formEntriesToRecord(fd), { name: "Ada" });
});

test("repeated name keeps the last value", () => {
  assert.deepEqual(
    formEntriesToRecord([
      ["tag", "a"],
      ["tag", "b"],
    ]),
    { tag: "b" }
  );
});
