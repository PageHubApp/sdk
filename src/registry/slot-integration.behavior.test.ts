/**
 * Integration tests for the slot-registry surfaces migrated off
 * `editorChromeSlots.render*` reads (L31 follow-up).
 *
 * Each migrated surface now goes through `useSlot` / `useSlotList` /
 * `<SlotRenderer>`. We don't render React here — the SlotRenderer is a
 * thin pass-through that reads `slots.resolve(...)` then invokes the
 * winning contribution's `render(ctx)`. These tests cover the SAME
 * resolution path with the SAME slot ids the surfaces use, so the
 * registry behavior under the surfaces is exercised end-to-end.
 *
 * Coverage:
 *   - All BUILTIN_SLOTS ids resolve correctly when a host contributes
 *   - Empty contribution -> resolved.length === 0 (fallback path)
 *   - Single-cardinality slots pick the highest priority winner
 *   - List-cardinality slots accumulate + sort by group@order
 *   - The adapter shim and direct `slots.contribute` co-exist on the
 *     same slot (later-added direct contribution wins on tie)
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createSlotsRegistry } from "./slots";
import { createContextRegistry } from "./context";
import { applyEditorChromeSlotsShim } from "./adapter";
import { BUILTIN_SLOTS } from "./builtins/slots";

function setup() {
  const context = createContextRegistry();
  const slots = createSlotsRegistry({ context });
  for (const def of BUILTIN_SLOTS) slots.register(def);
  return { context, slots };
}

// ─── settings/ai-button (13 inspector surfaces) ─────────────────────────────

test("slot integration: settings/ai-button resolves host ReactNode", () => {
  const { slots } = setup();
  const node = { sentinel: "settings-ai" } as unknown;
  applyEditorChromeSlotsShim({ settingsAiButton: node as never }, slots);
  const resolved = slots.resolve("settings/ai-button");
  assert.equal(resolved.length, 1);
  assert.equal(resolved[0]!.render(undefined), node);
});

test("slot integration: settings/ai-button — no contribution -> empty", () => {
  const { slots } = setup();
  applyEditorChromeSlotsShim({}, slots);
  assert.equal(slots.resolve("settings/ai-button").length, 0);
});

// ─── node/data-source-section (DataSourceSectionSlot + DataMainTab) ─────────

test("slot integration: node/data-source-section receives { nodeId } context", () => {
  const { slots } = setup();
  let receivedNodeId: string | undefined;
  applyEditorChromeSlotsShim(
    {
      renderDataSourceSection: (ctx: { nodeId: string }) => {
        receivedNodeId = ctx.nodeId;
        return "ok";
      },
    } as never,
    slots
  );
  const resolved = slots.resolve("node/data-source-section", { nodeId: "abc" });
  assert.equal(resolved.length, 1);
  resolved[0]!.render({ nodeId: "abc" });
  assert.equal(receivedNodeId, "abc");
});

// ─── node/ai-context-button (ToolboxContextual + 2 canvas controllers) ──────

test("slot integration: node/ai-context-button forwards onClick / className", () => {
  const { slots } = setup();
  const calls: Array<{ className?: string }> = [];
  applyEditorChromeSlotsShim(
    {
      renderNodeAiContextButton: (ctx: { onClick: () => void; className?: string }) => {
        calls.push({ className: ctx.className });
        return "btn";
      },
    } as never,
    slots
  );
  const resolved = slots.resolve("node/ai-context-button", {
    onClick: () => {},
    className: "tool-button",
  });
  resolved[0]!.render({ onClick: () => {}, className: "tool-button" });
  assert.deepEqual(calls, [{ className: "tool-button" }]);
});

// ─── node/ai-generate-button (ContainerSettingsTopNodeTool + AddSection) ────

test("slot integration: node/ai-generate-button winner picks highest priority", () => {
  const { slots } = setup();
  slots.contribute({
    slot: "node/ai-generate-button",
    render: () => "low",
    priority: 0,
  });
  slots.contribute({
    slot: "node/ai-generate-button",
    render: () => "high",
    priority: 10,
  });
  const resolved = slots.resolve("node/ai-generate-button");
  assert.equal(resolved.length, 1);
  assert.equal(resolved[0]!.render(undefined), "high");
});

// ─── node/ai-context-editor (NodeAiContextSection) ──────────────────────────

test("slot integration: node/ai-context-editor receives full editor ctx", () => {
  const { slots } = setup();
  let seen: Record<string, unknown> | null = null;
  applyEditorChromeSlotsShim(
    {
      renderNodeAiContextEditor: (ctx: Record<string, unknown>) => {
        seen = ctx;
        return "editor";
      },
    } as never,
    slots
  );
  const ctx = {
    designNotes: "n",
    setDesignNotes: () => {},
    designTags: ["t1"],
    setDesignTags: () => {},
    fieldIdPrefix: "p-",
  };
  const resolved = slots.resolve("node/ai-context-editor", ctx);
  resolved[0]!.render(ctx);
  assert.equal((seen as unknown as { designNotes: string }).designNotes, "n");
  assert.equal((seen as unknown as { fieldIdPrefix: string }).fieldIdPrefix, "p-");
});

// ─── import-export/handoff-extras (ImportExportPanel) ───────────────────────

test("slot integration: import-export/handoff-extras — fallback path when no host", () => {
  const { slots } = setup();
  // No shim applied -> empty contributions list -> SlotRenderer falls back.
  assert.equal(slots.resolve("import-export/handoff-extras").length, 0);
});

// ─── tiptap/inline-copy-assistant (TextEditor boolean gate) ─────────────────

test("slot integration: tiptap/inline-copy-assistant gates inline AI chrome", () => {
  const { slots } = setup();
  // Without a contribution, the editor must NOT show inline AI chrome.
  assert.equal(slots.resolve("tiptap/inline-copy-assistant").length, 0);
  applyEditorChromeSlotsShim(
    { renderInlineCopyAssistantTrigger: () => "trigger" } as never,
    slots
  );
  assert.equal(slots.resolve("tiptap/inline-copy-assistant").length, 1);
});

// ─── media-edit/ai-actions (MediaEditModal) ─────────────────────────────────

test("slot integration: media-edit/ai-actions forwards rich context object", () => {
  const { slots } = setup();
  let seenCtx: unknown = null;
  applyEditorChromeSlotsShim(
    {
      renderMediaEditAiActions: (ctx: unknown) => {
        seenCtx = ctx;
        return "ai-actions";
      },
    } as never,
    slots
  );
  const ctx = { mediaId: "m1", designNotes: "x" };
  const resolved = slots.resolve("media-edit/ai-actions", ctx);
  resolved[0]!.render(ctx);
  assert.deepEqual(seenCtx, ctx);
});

// ─── page-settings/extra-tabs (PageSelector — list slot) ────────────────────

test("slot integration: page-settings/extra-tabs accumulates host tabs in order", () => {
  const { slots } = setup();
  applyEditorChromeSlotsShim(
    {
      pageSettingsExtraTabs: [
        { key: "z", label: "Z", order: 30, render: () => null },
        { key: "a", label: "A", order: 5, render: () => null },
        { key: "m", label: "M", order: 10, render: () => null },
      ],
    } as never,
    slots
  );
  const resolved = slots.resolve("page-settings/extra-tabs");
  assert.equal(resolved.length, 3);
  // Tabs come back as objects (descriptor handoff); order by group@order.
  const keys = resolved.map(
    r => (r.render(undefined) as unknown as { key: string }).key
  );
  assert.deepEqual(keys, ["a", "m", "z"]);
});

// ─── adapter + direct contribute co-exist ───────────────────────────────────

test("slot integration: direct contribute wins over later shim apply on priority tie", () => {
  const { slots } = setup();
  // Adapter shim contributes first.
  applyEditorChromeSlotsShim(
    { renderToolboxAiButton: () => "shim" } as never,
    slots
  );
  // Later direct contribution at the same priority wins by insertion-order rule.
  slots.contribute({
    slot: "toolbox/ai-button",
    render: () => "direct",
  });
  const resolved = slots.resolve("toolbox/ai-button");
  assert.equal(resolved.length, 1);
  assert.equal(resolved[0]!.render(undefined), "direct");
});
