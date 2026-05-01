import { useEffect, useRef } from "react";
import { useMenuDismissal } from "./hooks/useMenuDismissal";
import { useMenuPosition } from "./hooks/useMenuPosition";
import { useToolboxMenuModel } from "./hooks/useToolboxMenuModel";
import { AiSection } from "./sections/AiSection";
import { CopyPasteSection } from "./sections/CopyPasteSection";
import { DeselectSection } from "./sections/DeselectSection";
import { DupDelSection } from "./sections/DupDelSection";
import { InsertSection } from "./sections/InsertSection";
import { NavSection } from "./sections/NavSection";

/**
 * Canvas right-click context menu. Renders Deselect / Copy+Paste / Nav /
 * Insert (submenu) / Duplicate+Delete / Add-to-AI sections gated by node
 * permissions, viewport position, and clipboard state. Mutate/clipboard
 * actions match legacy toolbar footer gates (isDeletable, not linked).
 */
export const ToolboxContextual = () => {
  const model = useToolboxMenuModel();
  const ref = useRef<HTMLDivElement>(null);

  const {
    menu,
    id,
    closeMenu,
    hasAnyMenuItems,
    showDeselect,
    showCopyPasteSection,
    showNavSection,
    hasInsertSubmenu,
    showDupDelSection,
    showAi,
    insertPanelOpen,
    componentFlyoutOpen,
    setInsertPanelOpen,
    setComponentFlyoutOpen,
    cancelInsertLeaveTimer,
    insertPanelFloating,
    componentPanelFloating,
  } = model;

  // Reset flyout state on every menu open or id change.
  useEffect(() => {
    setInsertPanelOpen(false);
    setComponentFlyoutOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu.enabled, menu.id]);

  const style = useMenuPosition({
    enabled: menu.enabled,
    x: menu.x,
    y: menu.y,
    id,
    hasAnyMenuItems,
    ref,
  });

  useMenuDismissal({
    enabled: menu.enabled,
    id,
    hasAnyMenuItems,
    ref,
    insertPanelRef: insertPanelFloating.refs.floating,
    componentPanelRef: componentPanelFloating.refs.floating,
    insertPanelOpen,
    componentFlyoutOpen,
    setInsertPanelOpen,
    setComponentFlyoutOpen,
    cancelInsertLeaveTimer,
    closeMenu,
  });

  if (!menu.enabled || !id) return null;
  if (!hasAnyMenuItems) return null;

  const dividerBeforeCopy = showDeselect;
  const dividerBeforeNav = showDeselect || showCopyPasteSection;
  const dividerBeforeInsert = dividerBeforeNav || showNavSection;
  const dividerBeforeDupDel = dividerBeforeInsert || hasInsertSubmenu;
  const dividerBeforeAi =
    showDeselect || showCopyPasteSection || showNavSection || hasInsertSubmenu || showDupDelSection;

  return (
    <div
      id="editor-node-context-menu"
      ref={ref}
      role="menu"
      aria-label="Element actions"
      style={{
        position: "fixed",
        left: (style.left as number | undefined) ?? menu.x,
        top: (style.top as number | undefined) ?? menu.y,
      }}
      className="border-base-300/50 bg-base-100 text-base-content z-10050 min-w-[12rem] overflow-visible rounded-xl border py-1 shadow-xl select-none"
    >
      <DeselectSection model={model} />
      <CopyPasteSection model={model} divider={dividerBeforeCopy} />
      <NavSection model={model} divider={dividerBeforeNav} />
      <InsertSection model={model} divider={dividerBeforeInsert} />
      <DupDelSection model={model} divider={dividerBeforeDupDel} />
      <AiSection model={model} divider={dividerBeforeAi} />
    </div>
  );
};
