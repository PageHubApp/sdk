/**
 * Provider stack for the walker. Replaces what `<Editor enabled={false}>`
 * used to set up: tree-root data (replacing `query.node(ROOT)` reads),
 * UI callbacks (cart, submission, agent), and the `inWalker` flag.
 *
 * Existing app-level providers (IconSvgMapProvider, RouteParamsProvider,
 * CartWrapper) wrap *outside* `<PagehubRoot>` — same as today around
 * `<Editor>`, no change. The walker's contribution is: skip Craft.
 */
import React from "react";
import {
  TreeRootProvider,
  UiCallbacksProvider,
  type TreeRootCtx,
  type UiCallbacks,
} from "./contexts";
import { InWalkerProvider } from "../utils/runtimeMode";
import { EditorStoreProvider } from "../core/store";

export interface PagehubRootProps {
  rootProps: Record<string, any>;
  pageMedia?: any[] | null;
  pageIndex?: Record<string, { isHomePage?: boolean; displayName: string }>;
  callbacks?: UiCallbacks;
  children: React.ReactNode;
}

export function PagehubRoot({
  rootProps,
  pageMedia,
  pageIndex,
  callbacks,
  children,
}: PagehubRootProps) {
  const tree = React.useMemo<TreeRootCtx>(
    () => ({
      rootProps: rootProps ?? {},
      pageMedia: pageMedia ?? (Array.isArray(rootProps?.pageMedia) ? rootProps.pageMedia : null),
      pageIndex: pageIndex ?? rootProps?._pageIndex ?? {},
    }),
    [rootProps, pageMedia, pageIndex]
  );

  return (
    <InWalkerProvider value={true}>
      <EditorStoreProvider initialPreview={true}>
        <TreeRootProvider value={tree}>
          <UiCallbacksProvider value={callbacks ?? null}>{children}</UiCallbacksProvider>
        </TreeRootProvider>
      </EditorStoreProvider>
    </InWalkerProvider>
  );
}
