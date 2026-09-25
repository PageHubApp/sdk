import test from "node:test";
import assert from "node:assert/strict";
import "../../components/Container/Container.presets";
import { getPresets } from "../../define/catalogRegistry";
import { emailEditorConfig } from "./profile";

/**
 * Email mode hides presets whose children can't be sent (Icons, `btn` /
 * `fixed` / `shadow` classes, show-hide / state actions), not just presets
 * whose root class is unsafe.
 */

test("email toolbox: interactive / nav presets are hidden, plain layout presets stay", () => {
  const before = getPresets("Container").map(p => p.label);
  emailEditorConfig(["EmailSlot", "Background"]);
  const after = new Set(getPresets("Container").map(p => p.label));
  for (const label of ["Modal", "Tabs", "Accordion", "Cookie Consent", "Dropdown", "Navbar", "Mobile Menu", "Social Icons", "Checklist", "Button Group"]) {
    assert.ok(before.includes(label), `${label} exists outside email mode`);
    assert.ok(!after.has(label), `${label} offered in email mode`);
  }
  for (const label of ["Section", "Row", "Column", "Divider", "Two columns"]) {
    assert.ok(after.has(label), `${label} missing in email mode`);
  }
});
