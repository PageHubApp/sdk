/**
 * UnifiedSettings — single settings shell for ALL node types.
 *
 * Reads toolbar config from .craft.toolbar on the selected node's component.
 * Sections come from the settings registry — no hardcoded JSX.
 * Everything is ON by default — components only declare what to hide.
 */

import { useEditor, useNode } from "@craftjs/core";
import { useAtomState, useAtomValue } from "@zedux/react";
import React, { useEffect, useMemo } from "react";
import { BiPaint } from "react-icons/bi";
import { TbBoxPadding, TbMouse, TbSettings } from "react-icons/tb";
import { useDefaultTab, useScrollToActiveTab } from "utils/lib";
import { registerUnifiedSettings } from "../../../components/LazyUnifiedSettings";
import { useSetAtomState } from "../../../utils/atoms";
import { ToolboxMenu, toolboxMenuInitialState } from "../../RenderNode";
import { TabAtom } from "../../Viewport/atoms";
import { TBWrap } from "../Helpers/SettingsHelper";
import { UnifiedTabBody } from "../UnifiedTab";
import { AccordionProvider, useAccordionContext } from "../AccordionContext";

import type { HideKey, ToolbarConfig } from "./types";
import { getSections, SettingsSearchAtom } from "./registry";
import { RegistrySectionList } from "./RegistrySectionList";

// Ensure standard sections are registered
import "./registry";

// Re-export for consumers
export { renderNA } from "./helpers";

// ─── Fixed tab structure — never changes ────────────────────────────────────

const FIXED_HEAD = [
  { title: "Component", icon: null },
  { title: "Layout", icon: <TbBoxPadding /> },
  { title: "Design", icon: <BiPaint /> },
  { title: "Interactions", icon: <TbMouse /> },
  { title: "Advanced", icon: <TbSettings /> },
];

const TAB_IDS = ["component", "layout", "design", "interactions", "advanced"] as const;

// ─── Helper: resolve toolbar config from craft node ─────────────────────────

function getToolbarConfig(query: any, nodeData: any): ToolbarConfig | undefined {
  const fromType = nodeData.type?.craft?.toolbar;
  if (fromType) return fromType;
  const resolver = query.getOptions().resolver;
  const component = resolver?.[nodeData.name || nodeData.displayName];
  return component?.craft?.toolbar;
}

// ─── Shell ───────────────────────────────────────────────────────────────────

export const UnifiedSettings = () => {
  const { query } = useEditor();
  const { id } = useNode();

  const nodeData = query.node(id).get().data;
  const displayName = nodeData.displayName || nodeData.name || "";
  const toolbar = getToolbarConfig(query, nodeData);

  // ── Hooks ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useAtomState(TabAtom);
  const setMenu = useSetAtomState(ToolboxMenu);
  const search = useAtomValue(SettingsSearchAtom);

  useEffect(() => {
    setMenu({ ...toolboxMenuInitialState });
  }, [setMenu]);

  const isInitialMount = useScrollToActiveTab(activeTab, setActiveTab, id);

  // Build head — always 5 tabs
  const icon = toolbar?.icon;
  const resolvedIcon = icon
    ? typeof icon === "function"
      ? React.createElement(icon as React.ComponentType)
      : React.isValidElement(icon)
        ? icon
        : null
    : null;
  const head = useMemo(
    () => [{ title: displayName || "Component", icon: resolvedIcon }, ...FIXED_HEAD.slice(1)],
    [displayName, resolvedIcon]
  );

  useDefaultTab(head, activeTab, setActiveTab);

  // ── Hidden set ──────────────────────────────────────────────────────
  const hidden = useMemo(() => new Set<HideKey>(toolbar?.hide ?? []), [toolbar?.hide]);

  const override = toolbar?.override;

  // ── Registry-driven sections ────────────────────────────────────────

  // When searching, get ALL sections matching the query (flat, cross-tab)
  // When not searching, build the normal 5-tab structure
  const isSearching = search.length > 0;

  const sections = useMemo(() => {
    if (isSearching) {
      // Flat search: all matching sections across all tabs
      return [
        {
          title: `Results for "${search}"`,
          children: (
            <RegistrySectionList
              sections={getSections({ search, hidden })}
              toolbar={toolbar}
              hidden={hidden}
              override={override}
            />
          ),
        },
      ];
    }

    // Normal tab structure
    return TAB_IDS.map((tabId, i) => {
      const tabSections = getSections({ tab: tabId, hidden });
      return {
        title: i === 0 ? displayName || "Component" : head[i].title,
        children: (
          <RegistrySectionList
            sections={tabSections}
            toolbar={toolbar}
            hidden={hidden}
            override={override}
          />
        ),
      };
    });
  }, [search, isSearching, hidden, toolbar, override, displayName, head]);

  return (
    <AccordionProvider>
      <SearchEffects search={search} />
      <TBWrap head={head} unified={true} activeSection={activeTab}>
        {toolbar?.toolbarExtra ? (
          <div className="border-base-300 border-b px-2 py-2 empty:hidden">
            {toolbar.toolbarExtra}
          </div>
        ) : null}
        <UnifiedTabBody sections={sections} isInitialMount={isInitialMount} />
      </TBWrap>
    </AccordionProvider>
  );
};

/**
 * Side-effect component that lives inside AccordionProvider.
 * When search is active: opens all accordion sections + highlights matching text via CSS Highlight API.
 * When search clears: restores previous accordion state.
 */
function SearchEffects({ search }: { search: string }) {
  const accordionCtx = useAccordionContext();
  const accordionCtxRef = React.useRef(accordionCtx);
  accordionCtxRef.current = accordionCtx;

  useEffect(() => {
    if (search) {
      accordionCtxRef.current?.openAll?.();
    }
  }, [search]);

  // CSS Custom Highlight API for text highlighting
  useEffect(() => {
    if (typeof CSS === "undefined" || !("highlights" in CSS)) return;

    const highlightName = "settings-search";
    (CSS as any).highlights.delete(highlightName);

    if (!search) return;

    const q = search.toLowerCase().trim();
    if (!q) return;

    // Walk the toolbar DOM for text nodes matching the query
    const container = document.getElementById("toolbarContents");
    if (!container) return;

    const ranges: Range[] = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);

    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      const text = node.textContent?.toLowerCase() ?? "";
      let idx = text.indexOf(q);
      while (idx >= 0) {
        const range = new Range();
        range.setStart(node, idx);
        range.setEnd(node, idx + q.length);
        ranges.push(range);
        idx = text.indexOf(q, idx + q.length);
      }
    }

    if (ranges.length > 0) {
      (CSS as any).highlights.set(highlightName, new (window as any).Highlight(...ranges));
    }

    return () => {
      (CSS as any).highlights.delete(highlightName);
    };
  }, [search]);

  return null;
}

// Self-register so LazyUnifiedSettings can find us without require()
registerUnifiedSettings(UnifiedSettings);
