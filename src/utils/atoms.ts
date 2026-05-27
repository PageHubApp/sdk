/**
 * @pagehub/sdk — Zedux atoms
 *
 * Split into two categories:
 * - Integration atoms: shared with the host app (SettingsAtom, SessionTokenAtom, UserUsageAtom)
 * - Internal atoms: editor chrome state, not part of the public API
 */
import { atom, useAtomState, useAtomValue } from "@zedux/react";
import { useCallback } from "react";
import { EDITOR_ALL_PAGES_STORAGE } from "./page/pageManagement";
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
export type SiteSettings = {
  _id?: string;
  draftId?: string;
  name?: string;
  [key: string]: any;
};
export const SettingsAtom = atom("settings", null as SiteSettings | null);

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

/** AI assistant scope — resolved per request from pins / media task / chips (client sends to agent). */
export type AssistantScope = "design" | "text" | "media";

export type AssistantMediaIntent = "generate-image" | "analyze-metadata";
export type AssistantMediaContext = {
  intent: AssistantMediaIntent;
  mediaId?: string;
  imageUrl?: string;
  filename?: string;
};

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
    /**
     * When true: user explicitly requested the assistant panel (nav, wand, pin, etc.).
     * If the user previously closed Clippy (`ph-clippy-open` is "false"), the panel still opens.
     * Omit or false when the dispatch must not override a dismissed panel.
     */
    revealPanel?: boolean;
    /** Optional media context for media-scope assistant actions. */
    mediaContext?: AssistantMediaContext;
  }
);

/**
 * Media metadata suggestion emitted by Clippy media actions.
 * The media manager listens and applies this into the edit modal state.
 */
type AssistantMediaMetadataResult = null | {
  mediaId: string;
  title?: string;
  alt?: string;
  description?: string;
  requestId?: string;
};
export const AssistantMediaMetadataResultAtom = atom(
  "assistantMediaMetadataResult",
  null as AssistantMediaMetadataResult
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

/** Whether the pinned inspector sections dock (above Layers) is expanded. */
export const InspectorPinDockOpenAtom = atom<boolean>(
  "inspectorPinDockOpen",
  (() => {
    try {
      const saved =
        typeof window !== "undefined" ? phStorage.get("sidebar-inspector-pin-dock") : null;
      if (saved !== null) return saved === "true";
    } catch {}
    return true;
  })()
);

/** Whether the floating Layers dialog is open. Shared atom so both Header and SidebarLayersPanel can control it. */
export const LayersDialogOpenAtom = atom("layersDialogOpen", false);

// ─── Registry-driven UI atoms (lifted in Phase 1 Wave A) ────────────────
// These were previously `useState` inside `ViewportTopBar` and prop-drilled
// into `EditorNavigation`. Lifting them to atoms is a Phase 1 prerequisite
// so the command registry can drive them from anywhere (palette, keybindings,
// host code). The topbar surface still owns the actual modal mounts; Wave A
// only ADDS the atoms, Phase 2 wires the topbar to consume them.

/** Whether the Media Manager modal is currently open. */
export const MediaManagerModalAtom = atom("mediaManagerModal", false);

/** Whether the Modifiers modal is currently open. */
export const ModifiersModalAtom = atom("modifiersModal", false);

/** Show or hide nodes whose visibility was authored as "hidden". Default true. */
export const ShowHiddenAtom = atom("showHidden", true);

// ─── Editor canvas atoms (formerly utils/lib.ts) ─────────────────────────

export const IsolateAtom = atom<string>("isolate", EDITOR_ALL_PAGES_STORAGE);
export const ComponentsAtom = atom<any[]>("components", []);
export const OnlineAtom = atom<boolean>("online", true);
export const ScreenshotAtom = atom<boolean>("ss", false);
export const SideBarAtom = atom<boolean>("sidebar", true);
export const SideBarOpen = atom<boolean>(
  "sidebaropen",
  (() => {
    if (typeof window === "undefined") return true;
    try {
      return !window.matchMedia("(max-width: 767px)").matches;
    } catch {
      return true;
    }
  })()
);

/**
 * `true` = main editor settings toolbar is docked to the **left** of the canvas; `false` = docked to the **right**.
 * Use for chrome that should align with the toolbar side (e.g. Site Settings docks the same way).
 */
export function useEditorSidebarDockLeft(): boolean {
  return useAtomValue(SideBarAtom);
}

/** Canvas scope for component editor — not the same as responsive viewport `ViewMode` in store.tsx */
export type EditorCanvasViewMode = "page" | "preview" | "canvas";
export const ViewModeAtom = atom<EditorCanvasViewMode>("viewMode", "page");
export const LastActiveAtom = atom<string>("lastActive", "");
export const ActiveAtom = atom<string>("active", "");
export const SelectedSectionAtom = atom<string | null>("selectedSection", null);
