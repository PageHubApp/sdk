import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { checkIfAncestorLinked } from "@/utils/componentUtils";
import { useEditor, useNode } from "@craftjs/core";
import { useAtomState } from "@zedux/react";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { TbSearch, TbX } from "react-icons/tb";
import { useSetAtomState } from "../../utils/atoms";
import { EDITOR_ALL_PAGES_STORAGE, IsolateAtom } from "../../utils/lib";
import { phStorage } from "../../utils/phStorage";
import { TabAtom } from "../viewport/atoms";
import { useAccordionContext } from "./AccordionContext";
import { RenderChildren } from "./helpers/CloneHelper";
import Tab from "./Tab";
import { TabBarBreakpointPicker } from "./TabBarBreakpointPicker";
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

  const setActiveTab = useSetAtomState(TabAtom);

  const toggleSearch = useCallback(() => {
    if (searchOpen) {
      setSearchOpen(false);
      setSearchQuery("");
    } else {
      setSearchOpen(true);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [searchOpen, setSearchQuery]);

  useEffect(() => {
    const iso = phStorage.get("isolated");
    if (iso && iso !== "null" && iso !== EDITOR_ALL_PAGES_STORAGE) setIsolate(iso);
  }, [setIsolate]);

  return (
    <div className="flex h-full flex-col">
      {/* Hide settings tabs for fully linked components */}
      {!isLinked && (
        <div
          id="toolbarTabs"
          aria-label="Tabs"
          role="tablist"
          className="border-base-300 bg-secondary text-secondary-content relative flex h-10 w-full min-w-0 shrink-0 items-center gap-2 border-b px-3 py-0 text-center font-semibold"
        >
          <TabBarCollapseToggle unified={unified} accordionCtx={accordionCtx} />
          <button
            type="button"
            onClick={toggleSearch}
            className={`inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-[color,background-color,transform] active:scale-90 ${
              searchOpen ? "text-primary" : "text-secondary-content hover:text-base-content"
            }`}
            aria-label="Search settings"
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Search settings"
            data-tooltip-place="top"
            data-tooltip-offset={10}
          >
            <TbSearch className="size-4" />
          </button>
          <div className="bg-border h-4 w-px shrink-0 self-center" aria-hidden />
          <TabBarBreakpointPicker />
          <TabBarDarkModeToggle />

          <div className="min-h-px min-w-0 flex-1" aria-hidden />
          <div className="bg-border h-4 w-px shrink-0 self-center" aria-hidden />
          <div
            className="relative flex shrink-0 flex-row-reverse items-center gap-2"
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

          {searchOpen && (
            <div className="bg-secondary absolute inset-y-0 right-3 left-24 z-10 flex items-center">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Escape") toggleSearch();
                }}
                placeholder="Search settings..."
                className="border-base-300 bg-base-200 text-base-content placeholder:text-neutral-content focus:ring-primary h-9 w-full rounded-md border px-2.5 text-xs focus:ring-1 focus:outline-none"
                autoFocus
                {...toolbarInputNoAutocompleteProps}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-neutral-content hover:text-base-content absolute top-1/2 right-4 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center"
                >
                  <TbX className="size-3" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div id="toolbarItems" data-toolbar={true} className="flex min-h-0 flex-1 flex-col">
        <RenderChildren props={props} query={query} actions={actions} id={id}>
          {children}
        </RenderChildren>
      </div>

      <div
        id="toolbarFooter"
        className={
          foot
            ? "border-base-300 bg-sidebar box-border flex w-full max-w-none shrink-0 flex-row flex-nowrap items-center justify-between border-t px-2.5 py-1 text-base"
            : "box-border min-h-0 w-full max-w-none shrink-0 border-0 p-0"
        }
      >
        {foot}
      </div>
    </div>
  );
};
