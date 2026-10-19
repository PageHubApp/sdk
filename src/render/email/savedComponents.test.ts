import test from "node:test";
import assert from "node:assert/strict";
import { buildToolboxInsertDescriptors } from "../../chrome/viewport/state/buildToolboxInsertDescriptors";
import { getCatalogFilter } from "../../define/catalogRegistry";
import { getComponentAllowlist, resetComponentAllowlist } from "../../define/componentAllowlist";
import { COMPONENT_COMMANDS } from "../../registry/builtins/commands/component";
import { applyHostConstraints } from "../../define/hostConstraints";
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
  applyHostConstraints(emailEditorConfig(["EmailSlot", "Background"]));
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

test("emailEditorConfig is pure: the editor applies its constraints", () => {
  resetComponentAllowlist();
  const f = emailEditorConfig(["EmailSlot"], { EmailSlot: () => true });
  assert.equal(getComponentAllowlist(), null);
  assert.deepEqual(f.componentAllowlist, ["Container", "Text", "Button", "Image", "EmailSlot"]);
  assert.deepEqual(Object.keys(f.catalogFilters ?? {}), ["Container", "Text", "Button", "Image", "EmailSlot"]);
});

test("applyHostConstraints: an editor without constraints clears the previous editor's", () => {
  applyHostConstraints(emailEditorConfig(["EmailSlot"]));
  assert.notEqual(getComponentAllowlist(), null);
  applyHostConstraints({});
  assert.equal(getComponentAllowlist(), null);
  assert.equal(getCatalogFilter("Container"), undefined);
});
