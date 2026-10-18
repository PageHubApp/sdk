/**
 * Top of the default layout's sidebar column.
 *
 * - The header row is `<EditorTopBarActions />` (every `useMenuItems("topbar")`
 *   button plus the BreakpointSwitcher). `features.topBar: false` drops the
 *   header and the breadcrumb's page selector so a host can render those
 *   controls in its own chrome.
 * - The breadcrumb / page selector row below the header.
 * - The Add / Theme / menu drawer (`EditorNavigation`).
 * - `--editor-nav-height` on the panel frame (0px without a header), which
 *   the drawer uses as its top edge.
 *
 * Editor-wide dialogs, the ⌘K palette and command-context sync live in
 * `EditorServices`, so they don't depend on this column being shown.
 */
import { useEditor } from "@craftjs/core";
import { useLayoutEffect, useRef } from "react";
import { useAtomState, useAtomValue } from "@zedux/react";
import { SessionTokenAtom, SettingsAtom } from "../../../utils/atoms";
import { useSDK } from "../../../core/context";
import { EditorNavigation } from "../nav/EditorNavigation";
import { EditorBreadcrumb } from "../nav/EditorBreadcrumb";
import { EditorTopBarActions } from "./EditorTopBarActions";
import { PANEL_VARS, closestPanelFrame, syncHeightToFrameVar } from "../../shell/EditorPanelFrame";

export const ViewportTopBar = () => {
  const { enabled } = useEditor(state => ({ enabled: state.options.enabled }));

  const { features } = useSDK();
  const isTenant = features.directSave;
  const showTopBar = features.topBar !== false;

  const [settings] = useAtomState(SettingsAtom);
  useAtomValue(SessionTokenAtom);

  /** Single source for overlay / flyout `top` under the icon toolbar (not page selector). */
  const editorChromeNavRef = useRef<HTMLElement>(null);
  const breadcrumbRowRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!enabled) return;
    if (showTopBar) return syncHeightToFrameVar(editorChromeNavRef.current, PANEL_VARS.navHeight);
    const frame = closestPanelFrame(breadcrumbRowRef.current);
    if (!frame) return;
    frame.style.setProperty(PANEL_VARS.navHeight, "0px");
    return () => frame.style.removeProperty(PANEL_VARS.navHeight);
  }, [enabled, showTopBar]);

  if (!enabled) return null;

  return (
    <>
      {showTopBar && (
        <header
          ref={editorChromeNavRef}
          role="banner"
          className="border-base-300 bg-base-100 text-base-content pointer-events-auto relative z-50 flex items-center border-b px-1 py-1"
          data-tutorial="header"
        >
          <EditorTopBarActions className="w-full justify-between gap-0" showPageSelector={false} />
        </header>
      )}

      {/* Combined breadcrumb / page selector row - Below Header */}
      <div ref={breadcrumbRowRef} className="bg-base-100 pointer-events-auto">
        <EditorBreadcrumb showPageSelector={showTopBar} />
      </div>

      <EditorNavigation settings={settings} isTenant={isTenant} />
    </>
  );
};
