import { TbChevronRight, TbComponents, TbLayoutGridAdd, TbPlus } from "react-icons/tb";
import { createPortal } from "react-dom";
import {
  OVERLAY_Z_CONTEXT_COMPONENT_FLYOUT,
  OVERLAY_Z_CONTEXT_INSERT_PANEL,
} from "../../../overlays/overlayZIndex";
import { ContextMenuInsertComponentFlyout } from "../../ContextMenuInsertComponentFlyout";
import { CTX_MENU_ITEM, CTX_MENU_SUBMENU_TRIGGER } from "../utils/menuClasses";
import type { ToolboxMenuModel } from "../hooks/useToolboxMenuModel";

export function InsertSection({
  model,
  divider,
}: {
  model: ToolboxMenuModel;
  divider: boolean;
}) {
  if (!model.hasInsertSubmenu) return null;
  const {
    insertPanelOpen,
    setInsertPanelOpen,
    componentFlyoutOpen,
    setComponentFlyoutOpen,
    insertPanelFloating,
    componentPanelFloating,
    cancelInsertLeaveTimer,
    scheduleCloseInsertPanels,
    scheduleCloseComponentFlyoutOnly,
    showBlockInsert,
    showInsertComponentRow,
    showAddSection,
    showAddContainer,
    handleBlocksAt,
    handleAddSection,
    handleAddNestedContainer,
    closeMenu,
    id,
  } = model;

  return (
    <div className={divider ? "border-base-200 border-t pt-1" : ""}>
      <div
        ref={insertPanelFloating.refs.setReference}
        onMouseEnter={() => {
          cancelInsertLeaveTimer();
          setInsertPanelOpen(true);
        }}
        onMouseLeave={scheduleCloseInsertPanels}
      >
        <div role="menuitem" className={CTX_MENU_SUBMENU_TRIGGER}>
          <span className="flex items-center gap-2">
            <TbPlus className="size-4 shrink-0 opacity-80" aria-hidden />
            Insert
          </span>
          <TbChevronRight className="size-4 shrink-0 opacity-60" aria-hidden />
        </div>
      </div>

      {insertPanelOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={insertPanelFloating.refs.setFloating}
              style={{
                ...insertPanelFloating.floatingStyles,
                zIndex: OVERLAY_Z_CONTEXT_INSERT_PANEL,
              }}
              className="border-base-300/50 bg-base-100 text-base-content max-h-[min(70vh,28rem)] min-w-[11rem] overflow-x-visible overflow-y-auto rounded-xl border py-1 shadow-xl select-none"
              onMouseEnter={cancelInsertLeaveTimer}
              onMouseLeave={scheduleCloseInsertPanels}
            >
              {showBlockInsert && (
                <>
                  <button
                    type="button"
                    className={CTX_MENU_ITEM}
                    onClick={() => handleBlocksAt("top")}
                  >
                    <TbLayoutGridAdd className="size-4 shrink-0 opacity-80" aria-hidden />
                    Add block above
                  </button>
                  <button
                    type="button"
                    className={CTX_MENU_ITEM}
                    onClick={() => handleBlocksAt("bottom")}
                  >
                    <TbLayoutGridAdd className="size-4 shrink-0 opacity-80" aria-hidden />
                    Add block below
                  </button>
                </>
              )}
              {showInsertComponentRow && (
                <div
                  ref={componentPanelFloating.refs.setReference}
                  onMouseEnter={() => {
                    cancelInsertLeaveTimer();
                    setComponentFlyoutOpen(true);
                  }}
                  onMouseLeave={scheduleCloseComponentFlyoutOnly}
                >
                  <div className={CTX_MENU_SUBMENU_TRIGGER}>
                    <span className="flex items-center gap-2">
                      <TbComponents className="size-4 shrink-0 opacity-80" aria-hidden />
                      Insert component
                    </span>
                    <TbChevronRight className="size-4 shrink-0 opacity-60" aria-hidden />
                  </div>
                </div>
              )}
              {showAddSection && (
                <button
                  type="button"
                  className={CTX_MENU_ITEM}
                  onClick={() => void handleAddSection()}
                >
                  <TbLayoutGridAdd className="size-4 shrink-0 opacity-80" aria-hidden />
                  Add empty section
                </button>
              )}
              {showAddContainer && (
                <button
                  type="button"
                  className={CTX_MENU_ITEM}
                  onClick={() => void handleAddNestedContainer()}
                >
                  <TbLayoutGridAdd className="size-4 shrink-0 opacity-80" aria-hidden />
                  Add container
                </button>
              )}
            </div>,
            document.body
          )
        : null}

      {componentFlyoutOpen && id && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={componentPanelFloating.refs.setFloating}
              style={{
                ...componentPanelFloating.floatingStyles,
                zIndex: OVERLAY_Z_CONTEXT_COMPONENT_FLYOUT,
              }}
              onMouseEnter={cancelInsertLeaveTimer}
              onMouseLeave={scheduleCloseComponentFlyoutOnly}
            >
              <ContextMenuInsertComponentFlyout
                targetNodeId={id}
                onInserted={closeMenu}
                onOpenComponentsTab={closeMenu}
              />
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
