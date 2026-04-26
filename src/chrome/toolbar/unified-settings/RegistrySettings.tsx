/**
 * RegistrySettings — renders the entire settings sidebar from the property registry.
 *
 * The toolbar structure is STATIC — tabs, sections, accordions render once and never
 * unmount. Only the content inside each section reacts to the selected node via CraftJS
 * hooks (useNode, useEditor). Switching nodes does NOT rebuild the tree.
 *
 * Hidden sections return null content — they stay in the tree at stable key positions.
 */
import { useEditor, useNode } from "@craftjs/core";
import { useAtomState, useAtomValue } from "@zedux/react";
import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { BiPaint } from "react-icons/bi";
import { TbBoxPadding, TbMouse, TbSettings } from "react-icons/tb";
import { useDefaultTab, useScrollToActiveTab } from "../../../utils/lib";
import { registerUnifiedSettings } from "../../../components/LazyUnifiedSettings";
import { useSetAtomState } from "../../../utils/atoms";
import { ToolboxMenu, toolboxMenuInitialState } from "../../rendering/toolboxMenuAtom";
import { resolveToolboxIcon } from "../../viewport/toolbox/resolveToolboxIcon";
import { EditorModeAtom, TabAtom } from "../../viewport/atoms";
import { TBWrap } from "../helpers/SettingsHelper";
import { UnifiedTabBody } from "../UnifiedTab";
import { AccordionProvider, useAccordionContext } from "../AccordionContext";
import { Notice } from "../inputs/Notice";
import { ToolbarSection } from "../ToolbarSection";
import { ModifiersInput } from "../inputs/modifiers/ModifiersInput";
import { PropertyRenderer } from "./PropertyRenderer";
import { PropertySection } from "./PropertySection";
import { InspectorPinProvider } from "./inspectorPin/InspectorPinContext";

import type { HideKey, ToolbarConfig } from "./types";
import {
  SettingsSearchAtom,
  HiddenKeysAtom,
  getSectionDefs,
  searchProperties,
  getSectionDef,
} from "./registry";

// Ensure property definitions are registered
import "./registry";

// ─── Fixed tab structure ───────────────────────────────────────────────────

type TabId = "component" | "layout" | "design" | "interactions" | "advanced";
type TabDef = { id: TabId; title: string; icon: React.ReactNode; advanced?: boolean };

const TABS: TabDef[] = [
  { id: "component", title: "Component", icon: null },
  { id: "layout", title: "Layout", icon: <TbBoxPadding /> },
  { id: "design", title: "Design", icon: <BiPaint /> },
  { id: "interactions", title: "Interactions", icon: <TbMouse />, advanced: true },
  { id: "advanced", title: "Advanced", icon: <TbSettings />, advanced: true },
];

const TAB_IDS = TABS.map(t => t.id) as readonly TabId[];

// ─── Static section lists per tab (computed once at module load) ────────────

const SECTIONS_BY_TAB = Object.fromEntries(
  TAB_IDS.map(tabId => [tabId, getSectionDefs({ tab: tabId }).filter(s => !s.searchOnly)])
) as Record<TabId, ReturnType<typeof getSectionDefs>>;

// ─── Helper ────────────────────────────────────────────────────────────────

function getToolbarConfig(query: any, nodeData: any): ToolbarConfig | undefined {
  const fromType = nodeData.type?.craft?.toolbar;
  if (fromType) return fromType;
  const resolver = query.getOptions().resolver;
  const component = resolver?.[nodeData.name || nodeData.displayName];
  return component?.craft?.toolbar;
}

// ─── Component section — reads toolbar from CraftJS context ────────────────

function ComponentSection() {
  const { query } = useEditor();
  const { id } = useNode();
  const nodeData = query.node(id).get().data;
  const toolbar = getToolbarConfig(query, nodeData);
  const Settings = toolbar?.settings;
  return Settings ? <Settings /> : null;
}

function AdvancedSettingsSection() {
  const { query } = useEditor();
  const { id } = useNode();
  const nodeData = query.node(id).get().data;
  const toolbar = getToolbarConfig(query, nodeData);
  const Adv = toolbar?.advancedSettings;
  // advancedSettings components render their own ToolbarSection wrappers — no outer wrapper needed
  return Adv ? <Adv /> : null;
}

// ─── Static tab content — renders all sections, never rebuilds ─────────────

const StaticTabContent = React.memo(function StaticTabContent({
  tabId,
}: {
  tabId: TabId;
}) {
  const mode = useAtomValue(EditorModeAtom);
  const sections = useMemo(() => {
    const all = SECTIONS_BY_TAB[tabId];
    return mode === "design" ? all : all.filter(s => !s.advanced);
  }, [tabId, mode]);

  return (
    <>
      {sections.map(section => {
        switch (section.id) {
          case "component":
            return <ComponentSection key={section.id} />;
          case "modifiers":
            return <ModifiersInput key={section.id} />;
          case "advanced-settings":
            return <AdvancedSettingsSection key={section.id} />;
          default:
            return <PropertySection key={section.id} sectionId={section.id} />;
        }
      })}
    </>
  );
});

// ─── Search results ────────────────────────────────────────────────────────

function SearchResults({ search }: { search: string }) {
  const results = useMemo(() => searchProperties(search), [search]);

  if (results.size === 0) {
    return <Notice>No results for &ldquo;{search}&rdquo;</Notice>;
  }

  return (
    <>
      {[...results.entries()].map(([sectionId, props]) => {
        const sectionDef = getSectionDef(sectionId);
        if (!sectionDef) return null;
        return (
          <ToolbarSection
            key={sectionId}
            title={sectionDef.title}
            icon={sectionDef.icon}
            help={sectionDef.help}
            defaultOpen={true}
          >
            {props.map(prop => (
              <PropertyRenderer key={prop.id} def={prop} />
            ))}
          </ToolbarSection>
        );
      })}
    </>
  );
}

// ─── Static sections array (built once, never changes) ─────────────────────

const STATIC_SECTIONS = TABS.map(tab => ({
  id: tab.id,
  title: tab.title,
  advanced: tab.advanced,
  children: <StaticTabContent tabId={tab.id} />,
}));

// ─── Main shell ────────────────────────────────────────────────────────────

export const RegistrySettings = () => {
  const { id } = useNode();
  const { query, actions } = useEditor();

  // Force CraftJS store subscribers to re-collect after node context changes.
  // Without this, useNode(collector) in child components returns stale data
  // because collectors only re-run on store events, not React context changes.
  // useLayoutEffect so it fires before paint — children see fresh data on first render.
  const prevIdRef = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (prevIdRef.current !== null && prevIdRef.current !== id) {
      actions.selectNode(id);
    }
    prevIdRef.current = id;
  }, [id, actions]);

  const nodeData = query.node(id).get().data;
  const displayName = nodeData.displayName || nodeData.name || "";

  const [activeTab, setActiveTab] = useAtomState(TabAtom);
  const setMenu = useSetAtomState(ToolboxMenu);
  const search = useAtomValue(SettingsSearchAtom);
  const editorMode = useAtomValue(EditorModeAtom);

  const setHiddenKeys = useSetAtomState(HiddenKeysAtom);
  const toolbar = getToolbarConfig(query, nodeData);

  useEffect(() => {
    setMenu({ ...toolboxMenuInitialState });
  }, [setMenu]);

  // Sync toolbar.hide[] → HiddenKeysAtom on node change
  // Stringify for stable dependency — hide arrays are small static lists
  const hideKey = toolbar?.hide?.join(",") ?? "";
  useEffect(() => {
    setHiddenKeys(hideKey ? new Set(hideKey.split(",") as HideKey[]) : new Set());
  }, [id, hideKey, setHiddenKeys]);

  const isInitialMount = useScrollToActiveTab(activeTab, setActiveTab, id);

  // Head: update component tab title + icon via ref mutation — no new array
  const headRef = useRef(TABS.map(t => ({ title: t.title, icon: t.icon, advanced: t.advanced })));
  headRef.current[0].title = displayName || "Component";
  const NodeIcon = resolveToolboxIcon(toolbar?.icon);
  headRef.current[0].icon = <NodeIcon />;

  // Filter tabs + sections by editor mode. In Content mode, advanced tabs disappear.
  const visibleHead = useMemo(
    () => (editorMode === "design" ? headRef.current : headRef.current.filter(h => !h.advanced)),
    [editorMode, displayName, toolbar?.icon]
  );
  const visibleSections = useMemo(
    () =>
      (editorMode === "design" ? STATIC_SECTIONS : STATIC_SECTIONS.filter(s => !s.advanced)).map(
        (s, i) => ({
          title: i === 0 ? displayName || "Component" : s.title,
          children: s.children,
        })
      ),
    [editorMode, displayName]
  );

  useDefaultTab(visibleHead, activeTab, setActiveTab);

  const isSearching = search.length > 0;

  return (
    <AccordionProvider>
      <InspectorPinProvider>
        <SearchEffects search={search} />
        <TBWrap head={visibleHead} unified={true} activeSection={activeTab}>
          <UnifiedTabBody
            sections={
              isSearching
                ? [{ title: `Results for "${search}"`, children: <SearchResults search={search} /> }]
                : visibleSections
            }
            isInitialMount={isInitialMount}
          />
        </TBWrap>
      </InspectorPinProvider>
    </AccordionProvider>
  );
};

// ─── Search effects ────────────────────────────────────────────────────────

function SearchEffects({ search }: { search: string }) {
  const accordionCtx = useAccordionContext();
  const accordionCtxRef = React.useRef(accordionCtx);
  accordionCtxRef.current = accordionCtx;

  useEffect(() => {
    if (search) accordionCtxRef.current?.openAll?.();
  }, [search]);

  useEffect(() => {
    if (typeof CSS === "undefined" || !("highlights" in CSS)) return;
    const highlightName = "settings-search";
    (CSS as any).highlights.delete(highlightName);
    if (!search) return;
    const q = search.toLowerCase().trim();
    if (!q) return;
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

// Register as the settings component
registerUnifiedSettings(RegistrySettings);
