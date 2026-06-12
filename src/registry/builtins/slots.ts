/**
 * Builtin slot catalog — the named slots host integrations can contribute
 * against via `sdk.slots.contribute({ slot, render })`.
 *
 * Adding a new slot here requires adding its id to the `BuiltinSlotId` literal
 * union in `../types.ts` — the TS error from this assignment enforces it.
 */
import type { BuiltinSlotId, SlotDef } from "../types";

export const BUILTIN_SLOTS: Array<SlotDef & { id: BuiltinSlotId }> = [
  { id: "toolbox/ai-button", cardinality: "single", contextShape: "void" },
  {
    id: "tiptap/inline-copy-assistant",
    cardinality: "single",
    contextShape: "{ textNodeId, query }",
  },
  { id: "settings/ai-button", cardinality: "single", contextShape: "void" },
  { id: "node/data-source-section", cardinality: "single", contextShape: "{ nodeId }" },
  {
    id: "node/ai-generate-button",
    cardinality: "single",
    contextShape: "{ onClick, className?, disabled? }",
  },
  {
    id: "node/ai-context-button",
    cardinality: "single",
    contextShape:
      "{ onClick, className?, disabled?, label?, data-tooltip-* }",
  },
  {
    id: "node/ai-context-editor",
    cardinality: "single",
    contextShape:
      "{ designNotes, setDesignNotes, designTags, setDesignTags, fieldIdPrefix }",
  },
  { id: "empty-state/ai-card", cardinality: "single", contextShape: "{ onOpenAssistant }" },
  { id: "navmenu/ai-row", cardinality: "single", contextShape: "{ onSelect }" },
  { id: "navmenu/header-items", cardinality: "single", contextShape: "{ close }" },
  { id: "import-export/handoff-extras", cardinality: "single", contextShape: "void" },
  {
    id: "media-edit/ai-actions",
    cardinality: "single",
    contextShape: "PageHubMediaEditAiActionsContext",
  },
];
