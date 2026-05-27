/**
 * Builtin slot catalog — 12 slots that today map 1:1 to the existing
 * `editorChromeSlots.render*` fields. The adapter shim in
 * `../adapter.ts` translates host-supplied render functions into
 * contributions against these slots.
 */
import type { SlotDef } from "../types";

export const BUILTIN_SLOTS: SlotDef[] = [
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
  // List slot — page settings extra tabs (one contribution per tab).
  {
    id: "page-settings/extra-tabs",
    cardinality: "list",
    contextShape: "{ pageId, inputClass, selectClass, query, actions, ... }",
  },
];
