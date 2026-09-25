import test from "node:test";
import assert from "node:assert/strict";
import { buildToolboxInsertDescriptors } from "../../chrome/viewport/state/buildToolboxInsertDescriptors";
import { resetComponentAllowlist } from "../../define/componentAllowlist";
import { COMPONENT_COMMANDS } from "../../registry/builtins/commands/component";
import { emailEditorConfig } from "./profile";

/**
 * Email mode never offers saved ("reusable") components: they can hold
 * anything, and `SavedComponentLoader` isn't in the email allowlist.
 */

const SAVED = [{ name: "Promo strip", rootNodeId: "c1", nodes: "{}" }];
const createReusable = COMPONENT_COMMANDS.find(c => c.id === "ph.component.createReusable")!;

test("saved components: offered when no allowlist is set", () => {
  resetComponentAllowlist();
  const rows = buildToolboxInsertDescriptors([], SAVED);
  assert.equal(rows.filter(r => r.category === "My Components").length, 1);
  assert.equal(createReusable.when?.({} as any), true);
});

test("saved components: hidden in email mode (not in the allowlist)", () => {
  emailEditorConfig(["EmailSlot", "Background"]);
  try {
    const rows = buildToolboxInsertDescriptors([], SAVED);
    assert.equal(rows.filter(r => r.category === "My Components").length, 0);
    assert.equal(createReusable.when?.({} as any), false);
  } finally {
    resetComponentAllowlist();
  }
});

test("emailEditorConfig hides the Theme panel and Publish (host owns both)", () => {
  const f = emailEditorConfig([]);
  assert.equal(f.designSystem, false);
  assert.equal(f.saveButton, false);
});
