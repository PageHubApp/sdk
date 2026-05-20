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
import { TbBoxPadding, TbBrush, TbMouse, TbSettings } from "react-icons/tb";
import { useSDK } from "../../../core/context";
import { useDefaultTab } from "../../../utils/hooks/useDefaultTab";
import { useScrollToActiveTab } from "../../../utils/hooks/useScrollToActiveTab";
import { registerInspector } from "./InspectorRegistry";
import { useSetAtomState } from "../../../utils/atoms";
import { ToolboxMenu, toolboxMenuInitialState } from "../../rendering/toolboxMenuAtom";
import { resolveToolboxIcon } from "../../viewport/toolbox/resolveToolboxIcon";
import { TabAtom } from "../../viewport/state/atoms";
import { TBWrap } from "../primitives/tableBodyControls";
import { InspectorBody } from "../InspectorTab";
import { AccordionProvider, useAccordionContext } from "../AccordionContext";
import { Notice } from "../inputs/Notice";
import { ToolbarSection } from "../ToolbarSection";
import { AutoChildListGroups } from "./AutoChildListGroups";
import { PropertyRenderer } from "./PropertyRenderer";
import { PropertySection } from "./PropertySection";
import { InspectorPinProvider } from "./inspectorPin/InspectorPinContext";

import type { HideKey, ToolbarConfig } from "./types";
import { SettingsSearchAtom, HiddenKeysAtom } from "./registry/atoms";
import { getSectionDefs, searchProperties, getSectionDef } from "./registry/propertyRegistry";

// Ensure property definitions are registered
import "./registry/properties/register";

// ─── Fixed tab structure ───────────────────────────────────────────────────

type TabId = "component" | "layout" | "design" | "interactions" | "advanced";
type TabDef = { id: TabId; title: string; icon: React.ReactNode };

const TABS: TabDef[] = [
  { id: "component", title: "Component", icon: null },
  { id: "interactions", title: "Interactions", icon: <TbMouse /> },
  { id: "layout", title: "Layout", icon: <TbBoxPadding /> },
  { id: "design", title: "Design", icon: <TbBrush /> },
  { id: "advanced", title: "Advanced", icon: <TbSettings /> },
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
  return (
    <>
      <AutoChildListGroups />
      {Settings ? (
        <React.Suspense fallback={null}>
          <Settings />
        </React.Suspense>
      ) : null}
    </>
  );
}

function AdvancedSettingsSection() {
  const { query } = useEditor();
  const { id } = useNode();
  const nodeData = query.node(id).get().data;
  const toolbar = getToolbarConfig(query, nodeData);
  const Adv = toolbar?.advancedSettings;
  // advancedSettings components render their own ToolbarSection wrappers — no outer wrapper needed
  return Adv ? (
    <React.Suspense fallback={null}>
      <Adv />
    </React.Suspense>
  ) : null;
}

// ─── Static tab content — renders all sections, never rebuilds ─────────────

const StaticTabContent = React.memo(function StaticTabContent({ tabId }: { tabId: TabId }) {
  const sections = SECTIONS_BY_TAB[tabId];

  return (
    <>
      {sections.map(section => {
        switch (section.id) {
          case "component":
            return <ComponentSection key={section.id} />;
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

// ─── Main shell ────────────────────────────────────────────────────────────

export const RegistrySettings = () => {
  const { id } = useNode();
  const { query, actions } = useEditor();
  const { config } = useSDK();
  const inspectorTabsConfig = config.features?.inspectorTabs;

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

  // Per-component tab allowlist (host feature). Falls back to all tabs when unset.
  // Keyed by displayName so the host can constrain Button/Text/etc. independently.
  // Memoized so stable array identity flows through visibleHead / visibleSections.
  const allowedTabIds = inspectorTabsConfig?.[displayName];
  const filteredTabs = useMemo(() => {
    if (!allowedTabIds || allowedTabIds.length === 0) return TABS;
    const allowed = new Set(allowedTabIds);
    return TABS.filter(t => allowed.has(t.id));
  }, [allowedTabIds]);

  const iconRef = toolbar?.icon;
  const visibleHead = useMemo(() => {
    const NodeIcon = resolveToolboxIcon(iconRef);
    return filteredTabs.map(t =>
      t.id === "component"
        ? { title: displayName || "Component", icon: <NodeIcon /> }
        : { title: t.title, icon: t.icon }
    );
  }, [filteredTabs, displayName, iconRef]);

  const visibleSections = useMemo(
    () =>
      filteredTabs.map(t => ({
        title: t.id === "component" ? displayName || "Component" : t.title,
        children: <StaticTabContent tabId={t.id} />,
      })),
    [filteredTabs, displayName]
  );

  useDefaultTab(visibleHead, activeTab, setActiveTab);

  const isSearching = search.length > 0;

  return (
    <AccordionProvider>
      <InspectorPinProvider>
        <SearchEffects search={search} />
        <TBWrap head={visibleHead} unified={true} activeSection={activeTab}>
          <InspectorBody
            sections={
              isSearching
                ? [
                    {
                      title: `Results for "${search}"`,
                      children: <SearchResults search={search} />,
                    },
                  ]
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
// Injected here (not in styles.css) so Turbopack/lightningcss does not choke on `::highlight()`.
const SETTINGS_SEARCH_HIGHLIGHT_STYLE_ID = "ph-settings-search-highlight-css";
function ensureSettingsSearchHighlightStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(SETTINGS_SEARCH_HIGHLIGHT_STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = SETTINGS_SEARCH_HIGHLIGHT_STYLE_ID;
  el.textContent =
    "@supports selector(::highlight(x)){" +
    "::highlight(settings-search){" +
    "background-color:oklch(0.8 0.15 85);" +
    "color:oklch(0.25 0.05 85);" +
    "border-radius:2px;" +
    "}}";
  document.head.appendChild(el);
}

function SearchEffects({ search }: { search: string }) {
  const accordionCtx = useAccordionContext();
  const accordionCtxRef = React.useRef(accordionCtx);
  accordionCtxRef.current = accordionCtx;

  useEffect(() => {
    if (search) accordionCtxRef.current?.openAll?.();
  }, [search]);

  useEffect(() => {
    ensureSettingsSearchHighlightStyles();
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
registerInspector(RegistrySettings);
