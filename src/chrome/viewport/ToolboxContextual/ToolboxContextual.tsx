import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { TbChevronRight, TbComponents, TbPlus } from "react-icons/tb";
import { useMenuItems, useRegistries, useSlot } from "../../../registry";
import { useAiEnabled } from "../../../utils/hooks/useAiEnabled";
import {
  OVERLAY_Z_CONTEXT_COMPONENT_FLYOUT,
  OVERLAY_Z_CONTEXT_INSERT_PANEL,
} from "../../popovers/overlayZIndex";
import { useInsertFlyout } from "../hooks/useInsertFlyout";
import { ContextMenuInsertComponentFlyout } from "../pickers/ContextMenuInsertComponentFlyout";
import { useMenuDismissal } from "./hooks/useMenuDismissal";
import { useMenuPosition } from "./hooks/useMenuPosition";
import { useToolboxMenuModel } from "./hooks/useToolboxMenuModel";
import {
  CTX_MENU_ITEM,
  CTX_MENU_SUBMENU_TRIGGER,
} from "./utils/menuClasses";

/**
 * Canvas right-click context menu — Phase 2 C2c.
 *
 * Renders flat top-level rows from `useMenuItems("canvas/context")`,
 * grouping by the resolved `group` token. The "Insert" submenu and the
 * "Insert component" sub-flyout stay as bespoke chrome (hover-opened
 * panels with bespoke layout / search UI). The "Include in AI chat" row
 * still routes through the host-supplied `renderNodeAiContextButton`
 * slot for backward compatibility.
 */
export const ToolboxContextual = () => {
  const model = useToolboxMenuModel();
  const ref = useRef<HTMLDivElement>(null);
  const { commands } = useRegistries();
  const aiEnabled = useAiEnabled();
  // useSlot with `undefined` ctx to detect contribution; per-call ctx is
  // passed at render time so we can include the onClick/label per item.
  const aiContextSlot = useSlot<{ onClick: () => void; className?: string; label?: string }>(
    "node/ai-context-button",
    undefined
  );

  const { menu, id, closeMenu } = model;

  // Build a per-id flyout so we can capture the *target node id* into the
  // dispatched commands; we still rely on the registry's `query.getEvent`
  // selection-id resolution, but selecting the target on hover ensures
  // right-click on a node → submenu fires on the right node.
  const flyout = useInsertFlyout();
  const {
    insertPanelOpen,
    setInsertPanelOpen,
    componentFlyoutOpen,
    setComponentFlyoutOpen,
    insertPanelFloating,
    componentPanelFloating,
    cancelInsertLeaveTimer,
    closeBoth: closeInsertFlyouts,
    scheduleCloseInsertPanels,
    scheduleCloseComponentFlyoutOnly,
  } = flyout;

  // Reset flyout state on every menu open or id change.
  useEffect(() => {
    setInsertPanelOpen(false);
    setComponentFlyoutOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu.enabled, menu.id]);

  // Pull all resolved canvas/context items. Visibility (`when`) is already
  // applied by the registry; we just split them into top-level rows vs the
  // insert submenu's children.
  const items = useMenuItems("canvas/context");
  const topLevel = useMemo(() => items.filter(i => i.group !== "insert"), [items]);
  const insertChildren = useMemo(
    () => items.filter(i => i.group === "insert"),
    [items]
  );
  const hasInsertSubmenu = insertChildren.length > 0;

  const closeAndExec = (command: string, args?: unknown) => {
    closeMenu();
    void commands.execute(command, args, { trigger: "menu" });
  };

  /**
   * A small handful of commands intentionally keep the menu open:
   *   - copyClasses (so the next "paste classes" sibling can be picked)
   *   - moveUp / moveDown (so authors can move multiple steps in a row)
   * Everything else closes the menu before firing.
   */
  const dontCloseOnExec = (command: string) =>
    command === "ph.node.copyClasses" ||
    command === "ph.node.moveUp" ||
    command === "ph.node.moveDown";

  const style = useMenuPosition({
    enabled: menu.enabled,
    x: menu.x,
    y: menu.y,
    id,
    hasAnyMenuItems: topLevel.length > 0 || hasInsertSubmenu,
    ref,
  });

  useMenuDismissal({
    enabled: menu.enabled,
    id,
    hasAnyMenuItems: topLevel.length > 0 || hasInsertSubmenu,
    ref,
    insertPanelRef: insertPanelFloating.refs.floating,
    componentPanelRef: componentPanelFloating.refs.floating,
    insertPanelOpen,
    componentFlyoutOpen,
    setInsertPanelOpen,
    setComponentFlyoutOpen,
    cancelInsertLeaveTimer,
    closeMenu: () => {
      closeInsertFlyouts();
      closeMenu();
    },
  });

  if (!menu.enabled || !id) return null;
  if (topLevel.length === 0 && !hasInsertSubmenu) return null;

  // Group the top-level rows by their registry group, in resolved order.
  // We insert a visible divider between consecutive groups.
  let prevGroup: string | null = null;

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
      {topLevel.map((item, idx) => {
        // The AI row is special — host slot owns rendering.
        const isAiRow = item.command === "ph.node.aiContext";
        // Detect group transition for divider.
        const showDivider = prevGroup !== null && prevGroup !== item.group;
        prevGroup = item.group;

        // Insert submenu marker — render after the `nav` group ends and
        // before the `dupDel` group starts. We hoist this purely visually
        // by inserting the submenu trigger when we encounter the first
        // dupDel item (i.e. straight after nav rows).
        const isFirstDupDel =
          item.group === "dupDel" &&
          (idx === 0 || topLevel[idx - 1]?.group !== "dupDel");

        const submenuTrigger = isFirstDupDel && hasInsertSubmenu ? (
          <InsertSubmenu
            insertChildren={insertChildren}
            divider
            insertPanelOpen={insertPanelOpen}
            setInsertPanelOpen={setInsertPanelOpen}
            componentFlyoutOpen={componentFlyoutOpen}
            setComponentFlyoutOpen={setComponentFlyoutOpen}
            cancelInsertLeaveTimer={cancelInsertLeaveTimer}
            scheduleCloseInsertPanels={scheduleCloseInsertPanels}
            scheduleCloseComponentFlyoutOnly={scheduleCloseComponentFlyoutOnly}
            insertPanelFloating={insertPanelFloating}
            componentPanelFloating={componentPanelFloating}
            targetId={id}
            closeMenu={() => {
              closeInsertFlyouts();
              closeMenu();
            }}
            commands={commands}
          />
        ) : null;

        if (isAiRow) {
          if (!aiEnabled || !aiContextSlot) return submenuTrigger;
          return (
            <div
              key={`${item.command}-${idx}`}
              className={showDivider ? "border-base-200 border-t pt-1" : ""}
              onMouseDown={e => e.stopPropagation()}
              onMouseDownCapture={e => e.stopPropagation()}
            >
              {submenuTrigger}
              {aiContextSlot.render({
                onClick: () => closeAndExec(item.command, item.args),
                className: CTX_MENU_ITEM,
                label: item.title,
              })}
            </div>
          );
        }

        const button = (
          <button
            key={`${item.command}-${idx}`}
            type="button"
            role="menuitem"
            disabled={!item.enabled}
            className={`${CTX_MENU_ITEM} ${!item.enabled ? "cursor-not-allowed opacity-50" : ""}`}
            onClick={() => {
              if (dontCloseOnExec(item.command)) {
                void commands.execute(item.command, item.args, { trigger: "menu" });
                return;
              }
              closeAndExec(item.command, item.args);
            }}
          >
            {item.icon ? <span className="contents">{item.icon}</span> : null}
            {item.title}
          </button>
        );

        if (showDivider || submenuTrigger) {
          return (
            <div
              key={`${item.command}-${idx}`}
              className={showDivider ? "border-base-200 border-t pt-1" : ""}
            >
              {submenuTrigger}
              {button}
            </div>
          );
        }
        return button;
      })}
    </div>
  );
};

// ─── Insert submenu (hover-opened) ───────────────────────────────────────

function InsertSubmenu(props: {
  insertChildren: ReturnType<typeof useMenuItems>;
  divider: boolean;
  insertPanelOpen: boolean;
  setInsertPanelOpen: (v: boolean) => void;
  componentFlyoutOpen: boolean;
  setComponentFlyoutOpen: (v: boolean) => void;
  cancelInsertLeaveTimer: () => void;
  scheduleCloseInsertPanels: () => void;
  scheduleCloseComponentFlyoutOnly: () => void;
  insertPanelFloating: ReturnType<typeof useInsertFlyout>["insertPanelFloating"];
  componentPanelFloating: ReturnType<typeof useInsertFlyout>["componentPanelFloating"];
  targetId: string;
  closeMenu: () => void;
  commands: ReturnType<typeof useRegistries>["commands"];
}) {
  const {
    insertChildren,
    divider,
    insertPanelOpen,
    setInsertPanelOpen,
    componentFlyoutOpen,
    setComponentFlyoutOpen,
    cancelInsertLeaveTimer,
    scheduleCloseInsertPanels,
    scheduleCloseComponentFlyoutOnly,
    insertPanelFloating,
    componentPanelFloating,
    targetId,
    closeMenu,
    commands,
  } = props;

  // Split insert children by which "kind" of insert they are.
  // `ph.node.insertComponent` is the hover-only nested submenu trigger.
  const blockItems = insertChildren.filter(
    i => i.command === "ph.node.addBlockAbove" || i.command === "ph.node.addBlockBelow"
  );
  const componentItem = insertChildren.find(i => i.command === "ph.node.insertComponent");
  const otherItems = insertChildren.filter(
    i =>
      i.command === "ph.node.addEmptySection" ||
      i.command === "ph.node.addContainer"
  );

  const exec = (command: string, args?: unknown) => {
    closeMenu();
    void commands.execute(command, args, { trigger: "menu" });
  };

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
              {blockItems.map(item => (
                <button
                  key={item.command}
                  type="button"
                  className={CTX_MENU_ITEM}
                  onClick={() => exec(item.command, item.args)}
                >
                  {item.icon ? <span className="contents">{item.icon}</span> : null}
                  {item.title}
                </button>
              ))}
              {componentItem ? (
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
                      {componentItem.title}
                    </span>
                    <TbChevronRight className="size-4 shrink-0 opacity-60" aria-hidden />
                  </div>
                </div>
              ) : null}
              {otherItems.map(item => (
                <button
                  key={item.command}
                  type="button"
                  className={CTX_MENU_ITEM}
                  onClick={() => exec(item.command, item.args)}
                >
                  {item.icon ? <span className="contents">{item.icon}</span> : null}
                  {item.title}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}

      {componentFlyoutOpen && targetId && typeof document !== "undefined"
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
                targetNodeId={targetId}
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
