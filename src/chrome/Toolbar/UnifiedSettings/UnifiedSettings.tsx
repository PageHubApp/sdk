/**
 * UnifiedSettings — single settings shell for ALL node types.
 *
 * Reads toolbar config from .craft.toolbar on the selected node's component.
 * Everything is ON by default — components only declare what to disable.
 * The accordion list is ALWAYS the same: same count, same order, same titles.
 */

import { useEditor, useNode } from "@craftjs/core";
import { useAtomState } from "@zedux/react";
import React, { useEffect, useMemo } from "react";
import { BiPaint } from "react-icons/bi";
import { FaFont } from "react-icons/fa";
import { RxButton } from "react-icons/rx";
import {
  TbArrowsExchange,
  TbBoxPadding,
  TbCode,
  TbContainer,
  TbForms,
  TbInputSearch,
  TbLayoutNavbar,
  TbMap,
  TbMapPin,
  TbMinus,
  TbMouse,
  TbMusic,
  TbPalette,
  TbPhoto,
  TbSettings,
  TbSpace,
  TbSparkles,
  TbVideo,
} from "react-icons/tb";
import { useDefaultTab, useScrollToActiveTab } from "utils/lib";
import { registerUnifiedSettings } from "../../../components/LazyUnifiedSettings";
import { useSetAtomState } from "../../../utils/atoms";
import { ToolboxMenu } from "../../RenderNode";
import { TabAtom } from "../../Viewport/atoms";
import { TBWrap } from "../Helpers/SettingsHelper";
import { UnifiedTabBody } from "../UnifiedTab";

const ICON_MAP = {
  TbContainer, TbCode, TbForms, TbInputSearch, TbLayoutNavbar, TbMap, TbMapPin,
  TbMinus, TbMusic, TbPhoto, TbSpace, TbVideo,
  FaFont, RxButton,
};

import { AccordionProvider } from "../AccordionContext";
import { Notice } from "../Inputs/Notice";
import { ToolbarSection } from "../ToolbarSection";
import { renderNA } from "./helpers";

import type { DisableKey, ToolbarConfig } from "./types";

// Re-export so existing imports from ./UnifiedSettings still work
export { renderNA } from "./helpers";

// ─── Standard input components ───────────────────────────────────────────────
import { AccessibilityInput } from "../Inputs/advanced/AccessibilityInput";
import { AnimationsInput } from "../Inputs/advanced/AnimationsInput";
import { EffectsClassInput } from "../Inputs/advanced/EffectsClassInput";
import { HoverClickInput } from "../Inputs/advanced/HoverClickInput";
import { BackgroundInput } from "../Inputs/color/BackgroundInput";
import { ColorInput } from "../Inputs/color/ColorInput";
import { OpacityInput } from "../Inputs/color/OpacityInput";
import { PatternInput } from "../Inputs/color/PatternInput";
import { ShadowInput } from "../Inputs/color/ShadowInput";
import { BorderInput } from "../Inputs/layout/BorderInput";
import DisplaySettingsInput from "../Inputs/layout/DisplaySettingsInput";
import { LayoutInput } from "../Inputs/layout/LayoutInput";
import { RadiusInput } from "../Inputs/layout/RadiusInput";
import { RingOutlineInput } from "../Inputs/layout/RingOutlineInput";
import { SpacingInput } from "../Inputs/layout/SpacingInput";
import { ModifiersInput } from "../Inputs/modifiers/ModifiersInput";
import { FontInput } from "../Inputs/typography/FontInput";
const ComponentImportExport = React.lazy(() => import("../Inputs/advanced/ComponentImportExport").then(m => ({ default: m.ComponentImportExport })));

// ─── Fixed tab structure — never changes ────────────────────────────────────

const FIXED_HEAD = [
  { title: "Component", icon: null },
  { title: "Design", icon: <BiPaint /> },
  { title: "Layout", icon: <TbBoxPadding /> },
  { title: "Interactions", icon: <TbMouse /> },
  { title: "Advanced", icon: <TbSettings /> },
];

// ─── Helper: resolve toolbar config from craft node ─────────────────────────

function getToolbarConfig(query: any, nodeData: any): ToolbarConfig | undefined {
  // Try node.data.type.craft.toolbar first
  const fromType = nodeData.type?.craft?.toolbar;
  if (fromType) return fromType;

  // Fallback: resolver lookup
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

  // DEBUG: Form toolbar loading
  if (nodeData.name === "Form" || nodeData.displayName === "Form") {
    console.log("[UnifiedSettings] Form selected", {
      displayName,
      hasToolbar: !!toolbar,
      toolbarKeys: toolbar ? Object.keys(toolbar) : null,
      hasMainTab: !!toolbar?.mainTab,
      craftKeys: nodeData.type?.craft ? Object.keys(nodeData.type.craft) : null,
      craftToolbar: nodeData.type?.craft?.toolbar,
    });
  }

  // ── All hooks run unconditionally ────────────────────────────────────
  const [activeTab, setActiveTab] = useAtomState(TabAtom);
  const setMenu = useSetAtomState(ToolboxMenu);

  useEffect(() => { setMenu({ enabled: false }); }, [setMenu]);

  const isInitialMount = useScrollToActiveTab(activeTab, setActiveTab, id);

  // Build head — always 5 tabs. Tab 0 title & icon comes from the selected node.
  const iconName = toolbar?.icon;
  const IconComponent = iconName && ICON_MAP[iconName];
  // Support direct icon elements from defineComponent() (non-string icons)
  const iconElement = toolbar?.iconElement;
  const resolvedIcon = IconComponent ? <IconComponent />
    : React.isValidElement(iconElement) ? iconElement
      : typeof iconElement === "function" ? React.createElement(iconElement)
        : null;
  const head = useMemo(() => [
    { title: displayName || "Component", icon: resolvedIcon },
    ...FIXED_HEAD.slice(1),
  ], [displayName, resolvedIcon]);

  useDefaultTab(head, activeTab, setActiveTab);

  // ── Disabled set ────────────────────────────────────────────────────
  const disabled = useMemo(
    () => new Set<DisableKey>(toolbar?.disable ?? []),
    [toolbar?.disable]
  );
  const off = (key: DisableKey) => disabled.has(key);
  const override = toolbar?.override;

  // ── Helper: render section content with override support ────────────
  const section = (title: string, content: React.ReactNode) => ({
    title,
    children: override?.[title] !== undefined ? override[title] : content,
  });

  // ── MainTab ─────────────────────────────────────────────────────────
  const MainTab = toolbar?.mainTab;
  const MainTabAdvanced = toolbar?.mainTabAdvanced;

  // ── Layout resolution ───────────────────────────────────────────────
  const layoutConfig = toolbar?.layout;
  const layoutContent = (() => {
    if (layoutConfig === "hidden") return renderNA("Layout");
    if (layoutConfig === "spacing") return <SpacingInput />;
    if (layoutConfig) {
      return typeof layoutConfig === "function" ? layoutConfig() : <>{layoutConfig}</>;
    }
    // Default fallback: show full layout engine (for containers with no config)
    return <LayoutInput />;
  })();

  // ── Build the MASTER section list — 5 groups ──────────────────────

  const sections = [
    // ───── 1. Component ──────────────────────────────────────────────
    {
      title: head[0].title,
      children: MainTab
        ? <MainTab />
        : <Notice>Select a component to edit its settings.</Notice>,
    },

    // ───── 2. Design ─────────────────────────────────────────────────
    {
      title: "Design",
      children: (
        <>
          {section("Colors",
            (!off("textColor") || !off("bgColor") || (nodeData.name === "FormElement" && !off("placeholderColor"))) ? (
              <ToolbarSection title="Colors" icon={<TbPalette />} full={1} help="Text and background colors for this element.">
                {!off("textColor") && <ColorInput propKey="color" label="Text" prefix="text" inline />}
                {!off("bgColor") && <ColorInput propKey="background" label="Background" prefix="bg" inline />}
                {nodeData.name === "FormElement" && !off("placeholderColor") && (
                  <ColorInput propKey="placeholderColor" label="Placeholder" prefix="placeholder:text" inline />
                )}
              </ToolbarSection>
            ) : renderNA("Colors")
          ).children}

          {!off("modifiers") && <ModifiersInput />}

          {section("Typography",
            !off("font") ? <FontInput /> : renderNA("Typography")
          ).children}

          {section("Background",
            !off("background") ? <BackgroundInput>{!off("pattern") && <PatternInput />}</BackgroundInput> : renderNA("Background")
          ).children}

          {section("Border",
            !off("border") ? <BorderInput /> : renderNA("Border")
          ).children}

          {section("Decoration",
            (!off("radius") || !off("shadow") || !off("opacity") || !off("ringOutline")) ? (
              <ToolbarSection title="Decoration" icon={<TbSparkles />} help="Rounded corners, shadows, opacity, and ring outlines.">
                {!off("radius") && <RadiusInput />}
                {!off("shadow") && <ShadowInput />}
                {!off("opacity") && <OpacityInput label="Opacity" propKey="opacity" />}
                {!off("ringOutline") && <RingOutlineInput />}
              </ToolbarSection>
            ) : renderNA("Decoration")
          ).children}

          {MainTabAdvanced && <MainTabAdvanced />}
        </>
      ),
    },

    // ───── 3. Layout ─────────────────────────────────────────────────
    {
      title: "Layout",
      children: layoutContent,
    },

    // ───── 4. Interactions ───────────────────────────────────────────
    {
      title: "Interactions",
      children: (
        <>
          {section("Click",
            !off("hoverClick")
              ? <HoverClickInput variant={toolbar?.hoverClickVariant ?? "container"} />
              : <>{renderNA("Click")}{renderNA("Hover")}</>
          ).children}

          {section("Animation",
            !off("animations") ? <AnimationsInput /> : renderNA("Animation")
          ).children}

          {section("Tailwind effects",
            !off("effectsClass") ? <EffectsClassInput /> : renderNA("Tailwind effects")
          ).children}
        </>
      ),
    },

    // ───── 5. Advanced ───────────────────────────────────────────────
    {
      title: "Advanced",
      children: (
        <>
          {section("ARIA",
            !off("accessibility") ? <AccessibilityInput /> : renderNA("ARIA")
          ).children}
          <DisplaySettingsInput showCursor={!off("cursor")} />
          {section("Import / Export",
            !off("importExport")
              ? <ToolbarSection title="Import / Export" icon={<TbArrowsExchange />} defaultOpen={false} help="Copy this component as JSON or paste one in."><ComponentImportExport /></ToolbarSection>
              : renderNA("Import / Export")
          ).children}
          {toolbar?.styleExtra}
        </>
      ),
    },
  ];

  return (
    <AccordionProvider>
      <TBWrap head={head} unified={true} activeSection={activeTab}>
        <UnifiedTabBody sections={sections} isInitialMount={isInitialMount} />
      </TBWrap>
    </AccordionProvider>
  );
};

// Self-register so LazyUnifiedSettings can find us without require()
registerUnifiedSettings(UnifiedSettings);
