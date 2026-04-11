/**
 * @pagehub/sdk — Zedux atoms (canonical shared copy)
 *
 * Keys and defaults MUST match the app's utils/atoms.ts exactly,
 * otherwise state won't be shared when the app aliases to this file.
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

// ─── Atom exports (match main app's utils/atoms.ts exactly) ─────────────

export const SettingsAtom = atom("settings", null);

export const SessionTokenAtom = atom("sessionToken", null);

export const SectionPickerDialogAtom = atom("sectionPickerDialog", {
  isOpen: false,
  nodeId: null,
  position: null,
  parent: null,
});

export const UserUsageAtom = atom("userUsage", {
  creditBalance: 1000,
  totalTokens: 0,
  lastUsed: null,
});

export const BatchOperationAtom = atom("batchOperation", false);

export const ShowGridLinesAtom = atom("showGridLines", false);

export const ClippyVisibleAtom = atom("clippyVisible", true);

export type ClippyMode = "docked" | "popout";
export const ClippyModeAtom = atom<ClippyMode>(
  "clippyMode",
  (() => {
    try {
      const saved = typeof window !== "undefined" ? phStorage.get("clippy-mode") : null;
      if (saved === "docked" || saved === "popout") return saved;
    } catch {}
    return "popout";
  })(),
);

/**
 * Dispatch to open Clippy with context.
 * Set to null when consumed / closed.
 */
/** Save / static HTML issues (e.g. invalid tree). Dismiss sets to null. */
export const EditorSaveBannerAtom = atom("editorSaveBanner", null as null | { message: string });

/** Clippy + /api/ai/agent — default from entry point; user can override in UI. */
export type AssistantScope = "design" | "text";

/** Nodes pinned from the canvas or chat for the next assistant message (shared with Clippy UI). */
export type AiChatAttachedNode = { id: string; displayName: string };

export const ClippyOpenAtom = atom("clippyOpen", null as null | {
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
});

export const AiChatAttachedNodesAtom = atom<AiChatAttachedNode[]>("aiChatAttachedNodes", []);
