import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { checkIfAncestorLinked } from "@/utils/componentUtils";
import { useEditor, useNode } from "@craftjs/core";
import { useAtomState } from "@zedux/react";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { TbAdjustments, TbEdit, TbSearch, TbX } from "react-icons/tb";
import { useSetAtomState } from "../../utils/atoms";
import { EDITOR_ALL_PAGES_STORAGE, IsolateAtom } from "../../utils/lib";
import { phStorage } from "../../utils/phStorage";
import { EditorModeAtom } from "../viewport/atoms";
import { TabAtom } from "../viewport/atoms";
import { useAccordionContext } from "./AccordionContext";
import { RenderChildren } from "./helpers/CloneHelper";
import Tab from "./Tab";
import { TabBarCollapseToggle } from "./TabBarCollapseToggle";
import { TabBarDarkModeToggle } from "./TabBarDarkModeToggle";
import { toolbarInputNoAutocompleteProps } from "./toolbarInputAttrs";
import { SettingsSearchAtom, SettingsSearchOpenAtom } from "./unified-settings/registry/atoms";
import { UnifiedTab, scrollToSection, setActiveTabFromClick, toSectionId } from "./UnifiedTab";

export const ToolbarWrapper = ({
  children = null,
  head,
  foot = "",
  unified = false,
  activeSection = "",
}) => {
  const { query, actions } = useEditor();
  const { id, props } = useNode(node => ({
    id: node.id,
    props: node.data?.props,
  }));
  const isLinked = checkIfAncestorLinked(id, query);

  const tablistRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{
    width: number;
    height: number;
    top: number;
    left: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!unified || !tablistRef.current) return;
    const activeTab = tablistRef.current.querySelector(
      '[aria-selected="true"]'
    ) as HTMLElement | null;
    if (!activeTab) return;
    const containerRect = tablistRef.current.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    setIndicatorStyle({
      width: tabRect.width,
      height: tabRect.height,
      top: tabRect.top - containerRect.top,
      left: tabRect.left - containerRect.left,
    });
  }, [activeSection, head, unified]);

  const [isolate, setIsolate] = useAtomState(IsolateAtom);
  const accordionCtx = useAccordionContext();
  const [searchQuery, setSearchQuery] = useAtomState(SettingsSearchAtom);
  const [searchOpen, setSearchOpen] = useAtomState(SettingsSearchOpenAtom);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchPopupRef = useRef<HTMLDivElement>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const mouseInsideSidebarRef = useRef(false);
  const [searchPos, setSearchPos] = useState<{ x: number; y: number } | null>(null);

  const setActiveTab = useSetAtomState(TabAtom);
  const [editorMode, setEditorMode] = useAtomState(EditorModeAtom);

  const SEARCH_POPUP_WIDTH = 280;
  const SEARCH_POPUP_HEIGHT = 40;
  const SEARCH_POPUP_PAD = 8;

  // Closing the popup keeps the active query so search results persist in the
  // sidebar. To clear, the user reopens cmd+f (input shows the existing query)
  // and either submits with an empty input or hits the X button in the popup.
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchPos(null);
  }, [setSearchOpen]);

  const openSearchAtMouse = useCallback(() => {
    const { x: mx, y: my } = mousePosRef.current;
    const x = Math.min(
      Math.max(mx - SEARCH_POPUP_WIDTH / 2, SEARCH_POPUP_PAD),
      window.innerWidth - SEARCH_POPUP_WIDTH - SEARCH_POPUP_PAD
    );
    const y = Math.min(
      Math.max(my + SEARCH_POPUP_PAD, SEARCH_POPUP_PAD),
      window.innerHeight - SEARCH_POPUP_HEIGHT - SEARCH_POPUP_PAD
    );
    setSearchPos({ x, y });
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [setSearchOpen]);

  const toggleSearch = useCallback(() => {
    if (searchOpen) closeSearch();
    else openSearchAtMouse();
  }, [searchOpen, closeSearch, openSearchAtMouse]);

  const toggleEditorMode = useCallback(() => {
    const next = editorMode === "content" ? "design" : "content";
    setEditorMode(next);
    try {
      phStorage.set("editor-mode", next);
    } catch {}
  }, [editorMode, setEditorMode]);

  useEffect(() => {
    const iso = phStorage.get("isolated");
    if (iso && iso !== "null" && iso !== EDITOR_ALL_PAGES_STORAGE) setIsolate(iso);
  }, [setIsolate]);

  // Track mouse position + hover state for the sidebar so Cmd/Ctrl+F can pop the
  // search wherever the user is currently looking.
  useEffect(() => {
    const toolbar = document.getElementById("toolbar");
    if (!toolbar) return;
    const handleMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    const handleEnter = () => {
      mouseInsideSidebarRef.current = true;
    };
    const handleLeave = () => {
      mouseInsideSidebarRef.current = false;
    };
    toolbar.addEventListener("mousemove", handleMove);
    toolbar.addEventListener("mouseenter", handleEnter);
    toolbar.addEventListener("mouseleave", handleLeave);
    return () => {
      toolbar.removeEventListener("mousemove", handleMove);
      toolbar.removeEventListener("mouseenter", handleEnter);
      toolbar.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  // Cmd/Ctrl+F → open settings search at the mouse. Fires when the mouse is
  // hovering the sidebar OR focus is inside it; otherwise native browser find runs.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "f") return;
      if (!(e.metaKey || e.ctrlKey)) return;
      const target = e.target as HTMLElement | null;
      const focusInSidebar = !!target?.closest?.("#toolbar");
      if (!focusInSidebar && !mouseInsideSidebarRef.current) return;
      e.preventDefault();
      toggleSearch();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggleSearch]);

  // Close the floating search popup when the user clicks outside of it.
  useEffect(() => {
    if (!searchOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (searchPopupRef.current && target && searchPopupRef.current.contains(target)) return;
      closeSearch();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [searchOpen, closeSearch]);

  return (
    <div className="flex h-full flex-col">
      {/* Hide settings tabs for fully linked components */}
      {!isLinked && (
        <>
        <div
          id="toolbarTabs"
          aria-label="Tabs"
          role="tablist"
          className="border-base-300/60 bg-base-100 text-base-content relative flex h-10 w-full min-w-0 shrink-0 items-center gap-2 border-b px-3 py-0 text-center font-semibold"
        >
          <TabBarCollapseToggle unified={unified} accordionCtx={accordionCtx} />
          <button
            type="button"
            onClick={toggleEditorMode}
            className={`inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md transition-[color,background-color,transform] active:scale-90 ${
              editorMode === "design"
                ? "text-primary"
                : "text-secondary-content hover:text-base-content"
            }`}
            aria-label={
              editorMode === "content" ? "Switch to Design mode" : "Switch to Content mode"
            }
            aria-pressed={editorMode === "design"}
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content={
              editorMode === "content"
                ? "Content mode — click for full Design controls"
                : "Design mode — click for simplified Content controls"
            }
            data-tooltip-place="top"
            data-tooltip-offset={10}
          >
            {editorMode === "content" ? (
              <TbEdit className="size-4" />
            ) : (
              <TbAdjustments className="size-4" />
            )}
          </button>
          <div className="bg-border h-4 w-px shrink-0 self-center" aria-hidden />
          <TabBarDarkModeToggle />

          <div className="min-h-px min-w-0 flex-1" aria-hidden />
          <div className="bg-border h-4 w-px shrink-0 self-center" aria-hidden />
          <div
            className="relative flex min-w-48 shrink-0 flex-row-reverse items-center gap-2 pr-3"
            ref={tablistRef}
          >
            {indicatorStyle && (
              <div
                className="bg-primary absolute bottom-0 h-0.5 rounded-full"
                style={{
                  width: indicatorStyle.width,
                  left: 0,
                  transform: `translateX(${indicatorStyle.left}px)`,
                  transition:
                    "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), width 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  zIndex: 0,
                  pointerEvents: "none",
                }}
              />
            )}
            {head.map((_, key) => {
              // If activeSection doesn't match any tab title (stale from previous node), default to tab 0
              const sectionMatchesAny = unified && head.some(h => h.title === activeSection);
              const isActive = unified
                ? sectionMatchesAny
                  ? activeSection === _.title
                  : key === 0
                : false;
              return unified ? (
                <UnifiedTab
                  key={key}
                  title={_.title}
                  icon={_.icon}
                  isActive={isActive}
                  onClick={() => {
                    setActiveTabFromClick(_.title, setActiveTab);
                    scrollToSection(_.title, key);
                    if (accordionCtx?.openOnly) {
                      // Find all accordion section titles within this tab's DOM section (stable stack id — title can duplicate display names)
                      const sectionEl = document.getElementById(toSectionId(`stack-${key}`));
                      if (sectionEl) {
                        const buttons = sectionEl.querySelectorAll(
                          "[role='button'][aria-label]"
                        );
                        const titles: string[] = [];
                        buttons.forEach(btn => {
                          const label = btn.getAttribute("aria-label");
                          if (label) titles.push(label);
                        });
                        if (titles.length > 0) {
                          accordionCtx.openOnly(titles);
                        }
                      }
                    }
                  }}
                />
              ) : (
                <Tab key={key} title={_.title} tabId={_.title} icon={_.icon} />
              );
            })}
          </div>

        </div>

        {searchOpen && searchPos && (
          <div
            ref={searchPopupRef}
            className="border-base-300 bg-base-100 fixed z-[100] flex items-center gap-2 rounded-xl border px-2 py-1.5 shadow-xl"
            style={{ left: searchPos.x, top: searchPos.y, width: SEARCH_POPUP_WIDTH }}
          >
            <TbSearch className="text-neutral-content size-4 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Escape" || e.key === "Enter") {
                  e.preventDefault();
                  closeSearch();
                }
              }}
              placeholder="Search settings..."
              className="text-base-content placeholder:text-neutral-content min-w-0 flex-1 bg-transparent text-xs outline-none"
              autoFocus
              {...toolbarInputNoAutocompleteProps}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-neutral-content hover:text-base-content flex size-5 shrink-0 cursor-pointer items-center justify-center"
                aria-label="Clear search"
              >
                <TbX className="size-3" />
              </button>
            )}
          </div>
        )}
        </>
      )}

      <div id="toolbarItems" data-toolbar={true} className="flex min-h-0 flex-1 flex-col bg-base-100">
        <RenderChildren props={props} query={query} actions={actions} id={id}>
          {children}
        </RenderChildren>
      </div>

      <div
        id="toolbarFooter"
        className={
          foot
            ? "border-base-300 box-border flex w-full max-w-none shrink-0 flex-row flex-nowrap items-center justify-between border-t px-2.5 py-1 text-base"
            : "box-border min-h-0 w-full max-w-none shrink-0 border-0 p-0"
        }
      >
        {foot}
      </div>
    </div>
  );
};
