/**
 * Command / Menu / Slot / Keybinding registry types.
 *
 * Phase 1 Wave A — bedrock data shapes. See
 * `docs/internal/sdk/command-registry/architecture.md` for the spec.
 */
import type { ReactNode } from "react";
import type { PageHubFeatures } from "../types";

// ─── Context ────────────────────────────────────────────────────────────────

export interface CommandSelectionContext {
  id: string | null;
  type: string | null;
  isCanvas: boolean;
  isDeletable: boolean;
  isLinked: boolean;
  canDelete: boolean;
}

export interface CommandParentContext {
  id: string | null;
  displayName: string | null;
}

export interface CommandTiptapContext {
  active: boolean;
  selectionEmpty: boolean;
  richTextMode: "full" | "inline";
  isActive: (name: string, attrs?: unknown) => boolean;
  can: () => unknown;
  /** Currently-open inline panel (font / link / more / null). */
  activePanel: string | null;
}

export interface CommandOverlayContext {
  stackDepth: number;
  topId: string | null;
}

export interface CommandClipboardContext {
  hasNode: boolean;
  hasClasses: boolean;
}

/**
 * Inputs for `when` and `enablement` predicates. Materialized via the
 * context registry — both SDK-derived (selection, history, mode, …) and
 * host-set arbitrary keys.
 */
export interface CommandContext {
  selection: CommandSelectionContext;
  parent: CommandParentContext;
  canUndo: boolean;
  canRedo: boolean;
  mode: "editor" | "preview";
  viewMode: "page" | "canvas";
  features: Partial<Required<PageHubFeatures>> | Required<PageHubFeatures>;
  isAiEnabled: boolean;
  tiptap: CommandTiptapContext;
  overlay: CommandOverlayContext;
  clipboard: CommandClipboardContext;
  mouseOver: "canvas" | "sidebar" | "topbar" | "modal" | null;
  /** Host- or surface-set arbitrary context keys. */
  [hostKey: string]: unknown;
}

/**
 * Context passed into `run`. Adds craft `query`, `actions`, and the trigger
 * source so commands can branch on how they were invoked.
 */
export interface CommandRunContext extends CommandContext {
  query: unknown;
  actions: unknown;
  trigger: "menu" | "palette" | "keybinding" | "api" | "host";
}

// ─── Commands ───────────────────────────────────────────────────────────────

export interface CommandDef<Args = void> {
  id: string;
  title: string | ((ctx: CommandContext, args?: Args) => string);
  category?:
    | "Edit"
    | "View"
    | "File"
    | "Format"
    | "Insert"
    | "Tools"
    | "Preferences"
    | "AI"
    | "Text"
    | string;
  icon?: ReactNode | ((ctx: CommandContext) => ReactNode);
  /** Hard visibility gate — falsy hides the command from menus / palette / dispatch. */
  when?: (ctx: CommandContext, args?: Args) => boolean;
  /** Soft enablement — command is visible but disabled when false. */
  enablement?: (ctx: CommandContext, args?: Args) => boolean;
  /** Hide from the command palette even when visible elsewhere (e.g. selection-context-only). */
  paletteHide?: boolean;
  /**
   * Sentinel: command body is a placeholder (logs a warning). The keybinding
   * dispatcher skips `preventDefault()` when the matched command is stubbed,
   * so existing real handlers keep owning the chord during the Phase 2
   * migration. Phase 2 deletes the duplicates and clears this flag.
   */
  stub?: boolean;
  run: (ctx: CommandRunContext, args?: Args) => void | Promise<void>;
}

// ─── Menus ──────────────────────────────────────────────────────────────────

/**
 * Menu locations recognized by `useMenuItems(location)` consumers.
 *
 * Most locations are populated by `BUILTIN_MENUS` entries. Two are reserved
 * for host contributions only — built-ins intentionally don't populate them:
 *
 *  - `node/breadcrumb` — breadcrumb crumbs are data-driven (ancestor IDs
 *    from the live selection array), not static contributions. Reserved
 *    so hosts can append actions to a node's crumb without forking the
 *    breadcrumb component.
 *  - `empty-state/cta` — empty-state CTAs are intentionally bespoke layout
 *    (large cards with copy + illustrations), not generic menu rendering.
 *    Reserved so hosts can register additional CTAs without re-skinning
 *    the empty-state component.
 *
 * Removing either id from the union is a breaking change for hosts that
 * have already wired contributions against it.
 */
export type MenuLocation =
  | "topbar"
  | "navmenu/header"
  | "navmenu/settings"
  | "navmenu/view"
  | "navmenu/tools"
  | "navmenu/preferences"
  | "canvas/context"
  | "canvas/chip"
  | "node/breadcrumb" // host-only — see comment above
  | "tiptap/inline"
  | "tiptap/inline/font-panel"
  | "tiptap/inline/link-panel"
  | "tiptap/inline/more-panel"
  | "tiptap/inline/text-color-panel"
  | "tiptap/inline/highlight-panel"
  | "tiptap/inline/context-menu"
  | "sidebar/tabs"
  | "empty-state/cta" // host-only — see comment above
  | "palette"
  | (string & {});

export interface MenuItem<Args = unknown> {
  command: string;
  args?: Args;
  /** "groupName@order" — group ordering parsed at resolve time. */
  group?: string;
  iconOverride?: ReactNode | ((ctx: CommandContext) => ReactNode);
  titleOverride?: string | ((ctx: CommandContext) => string);
  /** Per-location additional gate; AND'd with command.when. */
  when?: (ctx: CommandContext) => boolean;
}

export interface ResolvedMenuItem<Args = unknown> {
  command: string;
  args?: Args;
  group: string;
  groupOrder: number;
  /** Resolved title (after titleOverride + dynamic title fn). */
  title: string;
  /** Resolved icon. */
  icon: ReactNode | null;
  category?: string;
  enabled: boolean;
  paletteHide: boolean;
  /** The underlying command def for downstream consumers that want it. */
  def: CommandDef<Args>;
}

// ─── Keybindings ────────────────────────────────────────────────────────────

export interface KeybindingDef<Args = unknown> {
  command: string;
  /** "cmd+z" | "shift+cmd+m" | "mod+z" | "backspace" | "escape" | "tab" | "space" | "+" | "-" | "0" */
  key: string;
  args?: Args;
  when?: (ctx: CommandContext) => boolean;
  /** Higher wins on conflict. Defaults to 0 (canvas/editor layer). */
  priority?: number;
}

// ─── Slots ──────────────────────────────────────────────────────────────────

export type SlotCardinality = "single" | "list";

export interface SlotDef {
  id: string;
  cardinality: SlotCardinality;
  /** Documents the context shape passed to renderers; for docs only. */
  contextShape?: string;
  /** Default priority used when a contribution omits one (single-cardinality). */
  defaultPriority?: number;
}

export interface SlotContribution<Ctx = unknown> {
  slot: string;
  render: (ctx: Ctx) => ReactNode;
  /** Higher wins for single-cardinality. */
  priority?: number;
  /** "groupName@order" — ordering for list-cardinality slots. */
  group?: string;
  /** Optional per-contribution gate. Args: slot ctx, command ctx. */
  when?: (ctx: Ctx, app: CommandContext) => boolean;
  /** Opaque key — pass to `slots.remove(id, key)` to remove this specific contribution. */
  key?: unknown;
}

export interface ResolvedContribution<Ctx = unknown> {
  slot: string;
  render: (ctx: Ctx) => ReactNode;
  priority: number;
  group: string;
  groupOrder: number;
  key?: unknown;
}
