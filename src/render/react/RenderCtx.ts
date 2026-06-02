/**
 * Render context — the data each `<Name>Render.tsx` needs at runtime.
 * Editor wrapper builds this from `useNode()` + `useEditor()`. Walker
 * builds it from `WalkerNodeContext` + `TreeRootContext` + hardcoded
 * editor-mode flags.
 *
 * Same render body, two ctx sources. No Craft inside `*Render.tsx`.
 */
import type { PageIndex } from "../../utils/page/pageManagement";

export interface RenderCtx {
  /** Stable node id — Craft `useNode().id` in editor; `WalkerNodeCtx.id` in walker. */
  id: string;
  /** Editor mode flag. Walker always passes `false`. */
  enabled: boolean;
  /** Mount-stable flag. Walker passes `true` from the start (no hydration concern). */
  isMounted: boolean;
  /** Selection (editor only). Walker passes `false`. */
  isActive: boolean;
  /** Hover state (editor only). Walker passes `false`. */
  isHovered: boolean;
  /** Are there canvas children. Walker reads from NodeMap; editor from useNode. */
  hasChildNodes: boolean;
  /** Is this node a canvas. Walker reads from NodeMap; editor from useNode. */
  isCanvasNode: boolean;
  /** Display name (component label). */
  name: string;
  /** Drag-connector ref attach. Walker passes a no-op. */
  connect: (el: any) => void;
  /** Drag-handle ref attach. Walker passes a no-op. */
  drag: (el: any) => void;
  /** setProp — editor-only. Walker passes a no-op (walker can't write the tree). */
  setProp: (...args: any[]) => void;
  /** Tree-root data — pre-extracted, ready to feed pure helpers. */
  rootProps: Record<string, any>;
  pageMedia: any[] | null;
  pageIndex: PageIndex;
  /** Immediate parent's `props.className` — used by Image.body to infer
   *  responsive `sizes` when the image fills a fixed-width container. */
  parentClassName?: string;
  /**
   * Editor-only Craft query handle. Walker leaves undefined. Used by
   * editor-mode-only branches (TipTap, settings panel mounts) that
   * historically read raw Craft state. Body functions must NOT touch this
   * unless `ctx.enabled === true`.
   */
  query?: any;
}

const noop = () => {
  /* walker no-op */
};

/** Build a walker-mode RenderCtx from walker contexts + node info. */
export function makeWalkerCtx(args: {
  id: string;
  isCanvas: boolean;
  hasChildNodes: boolean;
  displayName: string;
  rootProps: Record<string, any>;
  pageMedia: any[] | null;
  pageIndex: PageIndex;
  parentClassName?: string;
}): RenderCtx {
  return {
    id: args.id,
    enabled: false,
    isMounted: true,
    isActive: false,
    isHovered: false,
    hasChildNodes: args.hasChildNodes,
    isCanvasNode: args.isCanvas,
    name: args.displayName,
    connect: noop,
    drag: noop,
    setProp: noop,
    rootProps: args.rootProps,
    pageMedia: args.pageMedia,
    pageIndex: args.pageIndex,
    parentClassName: args.parentClassName,
  };
}
