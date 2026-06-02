/**
 * Walker contexts — provided by `<PagehubRoot>`, consumed by `*Render.tsx`
 * components. The walker is the Craft-free path: instead of `useNode()` /
 * `useEditor()`, components inside the walker read node info + tree-root
 * data from these contexts.
 *
 * `<Name>Render.tsx` files MUST NOT import `@craftjs/core`. They read
 * everything they need from here, from explicit props passed by the walker,
 * and from existing pure contexts (ItemContext, AnchorContext,
 * IconSvgMapContext, RouteParamsContext, RuntimeVarsContext).
 */
import { createContext, useContext } from "react";
import type { PageIndex } from "../../utils/page/pageManagement";

/**
 * Tree-root data — what `query.node(ROOT_NODE)` would have returned in
 * editor mode. Walker callers populate this once at the page boundary;
 * helpers (`replaceVariables`, `actionToHref`, `useResolvedIcon`, …) read
 * from here.
 */
export interface TreeRootCtx {
  rootProps: Record<string, any>;
  pageMedia: any[] | null;
  pageIndex: PageIndex;
}

const TreeRootContext = createContext<TreeRootCtx | null>(null);

export const TreeRootProvider = TreeRootContext.Provider;

export function useTreeRoot(): TreeRootCtx | null {
  return useContext(TreeRootContext);
}

/**
 * Per-node walker data — what `useNode()` would have returned. Set by the
 * walker as it descends; descendants read for `id`, `isCanvas`, displayName.
 * Components in the editor read from `useNode()` directly and ignore this.
 */
export interface WalkerNodeCtx {
  id: string;
  isCanvas: boolean;
  displayName?: string;
  /** Pre-computed children node ids (canvas + linkedNodes order). */
  childIds: string[];
  /** Immediate parent's `props.className` — used by Image.body to infer
   *  responsive `sizes` when the image fills a fixed-width container. */
  parentClassName?: string;
}

const WalkerNodeContext = createContext<WalkerNodeCtx | null>(null);

export const WalkerNodeProvider = WalkerNodeContext.Provider;

export function useWalkerNode(): WalkerNodeCtx | null {
  return useContext(WalkerNodeContext);
}

/** Re-export the runtime walker flag — lives in `utils/` to avoid render→utils circular deps. */
export { InWalkerProvider, useInWalker } from "../../utils/runtimeMode";

/**
 * Callbacks the editor used to expose via `useSDKSafe().config.callbacks` —
 * cart, submission, agent, router-push handlers. Walker callers wire these
 * from app-level providers (CartWrapper, etc.) so cart Buttons in the
 * walker still dispatch `onAddToCart`.
 */
export interface UiCallbacks {
  onAddToCart?: (...args: any[]) => any;
  onSubmit?: (...args: any[]) => any;
  routerPush?: (path: string) => any;
}

const UiCallbacksContext = createContext<UiCallbacks | null>(null);

export const UiCallbacksProvider = UiCallbacksContext.Provider;

export function useUiCallbacks(): UiCallbacks | null {
  return useContext(UiCallbacksContext);
}
