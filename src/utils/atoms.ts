/**
 * @pagehub/sdk — Zedux atoms
 *
 * Split into two categories:
 * - Integration atoms: shared with the host app (SettingsAtom, SessionTokenAtom, UserUsageAtom)
 * - Internal atoms: editor chrome state, not part of the public API
 */
import { atom, useAtomState, useAtomValue } from "@zedux/react";
import { useCallback } from "react";
import { phStorage } from "./phStorage";

// Re-export atom for use in other files
export { atom };

/**
 * Zedux doesn't have a dedicated set-only hook like Recoil's useSetRecoilState.
 * This wrapper uses useAtomState but only returns the setter, keeping the same API.
 */
export const useSetAtomState = (atomTemplate: any) => {
  const [, setState] = useAtomState(atomTemplate);
  return setState;
};

// ─── Integration atoms (host app ↔ SDK) ─────────────────────────────────

/** Site settings injected by the host app. */
export const SettingsAtom = atom("settings", null);

/** Auth token injected by the host app (nullable). */
export const SessionTokenAtom = atom("sessionToken", null);

/** AI credit usage tracking. */
export const UserUsageAtom = atom("userUsage", {
  creditBalance: 1000,
  totalTokens: 0,
  lastUsed: null,
});

// ─── Internal atoms (editor chrome state) ────────────────────────────────

export const SectionPickerDialogAtom = atom("sectionPickerDialog", {
  isOpen: false,
  nodeId: null,
  position: null,
  parent: null,
});

export const BatchOperationAtom = atom("batchOperation", false);

export const ShowGridLinesAtom = atom("showGridLines", false);

export const AssistantVisibleAtom = atom("assistantVisible", true);

export type AssistantMode = "docked" | "popout";
export const AssistantModeAtom = atom<AssistantMode>(
  "assistantMode",
  (() => {
    try {
      const saved = typeof window !== "undefined" ? phStorage.get("assistant-mode") : null;
      if (saved === "docked" || saved === "popout") return saved;
    } catch {}
    return "popout";
  })()
);
/** Save / static HTML issues (e.g. invalid tree). Dismiss sets to null. */
export const EditorSaveBannerAtom = atom("editorSaveBanner", null as null | { message: string });

/** AI assistant scope — default from entry point; user can override in UI. */
export type AssistantScope = "design" | "text";

/** Nodes pinned from the canvas or chat for the next assistant message. */
export type AiChatAttachedNode = { id: string; displayName: string };

export const AssistantOpenAtom = atom(
  "assistantOpen",
  null as null | {
    /** Node to select before chatting */
    nodeId?: string;
    /** "edit" pre-fills an edit hint; "create" is default */
    mode?: "create" | "edit";
    /** Optional prompt hint shown in the input */
    promptHint?: string;
    /** Default assistant scope for the next send (inline text / Text settings → text). */
    assistantScope?: AssistantScope;
    /**
     * When true: clear chat + stream state and pin context to a single node (copy / text flows).
     * Does not run for generic "open assistant" dispatches.
     */
    freshChat?: boolean;
    /** With `freshChat`, set pinned context to this node only (skips querying Craft). */
    contextNode?: AiChatAttachedNode;
    /** Insert position context (for add-section flows) */
    addAfter?: boolean;
    parentNodeId?: string;
    position?: "top" | "bottom";
  }
);

export const AiChatAttachedNodesAtom = atom<AiChatAttachedNode[]>("aiChatAttachedNodes", []);

/** Whether the docked Layers panel at the bottom of the sidebar is expanded. */
export const SidebarLayersPanelAtom = atom<boolean>(
  "sidebarLayersPanel",
  (() => {
    try {
      const saved = typeof window !== "undefined" ? phStorage.get("sidebar-layers-panel") : null;
      if (saved !== null) return saved === "true";
    } catch {}
    return true;
  })()
);

/** Whether the floating Layers dialog is open. Shared atom so both Header and SidebarLayersPanel can control it. */
export const LayersDialogOpenAtom = atom("layersDialogOpen", false);
