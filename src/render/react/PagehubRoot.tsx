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
import { InWalkerProvider } from "../../utils/runtimeMode";
import { EditorStoreProvider } from "../../core/store";
import type { PageIndex } from "../../utils/page/pageManagement";
import { AuthStateProvider } from "../../utils/conditions/authState";
import type { AuthState } from "../../utils/design/variables";

export interface PagehubRootProps {
  rootProps: Record<string, any>;
  pageMedia?: any[] | null;
  pageIndex?: PageIndex;
  callbacks?: UiCallbacks;
  /**
   * The visitor's auth for THIS request (e.g. read from an HttpOnly cookie in
   * getServerSideProps). `auth` conditions evaluate against it on the server
   * and during hydration, so both sides render the same tree. Omit / `null`
   * when unknown (ISR): those conditions stay indeterminate until the client
   * calls `setAuthState`.
   */
  auth?: AuthState | null;
  children: React.ReactNode;
}

export function PagehubRoot({
  rootProps,
  pageMedia,
  pageIndex,
  callbacks,
  auth,
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
          <UiCallbacksProvider value={callbacks ?? null}>
            <AuthStateProvider value={auth}>{children}</AuthStateProvider>
          </UiCallbacksProvider>
        </TreeRootProvider>
      </EditorStoreProvider>
    </InWalkerProvider>
  );
}
