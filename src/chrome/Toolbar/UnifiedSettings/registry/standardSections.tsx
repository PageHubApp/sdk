/**
 * Standard settings sections — registered at module load.
 * Each wraps an existing input component with the registry's SectionProps interface.
 */
import React from "react";
import { TbArrowsExchange, TbSettings, TbSparkles, TbWand } from "react-icons/tb";
import { Notice } from "../../Inputs/Notice";
import { ToolbarSection } from "../../ToolbarSection";
import { SECTION_ICONS } from "../helpers";
import { registerSection } from "./settingsRegistry";
import type { SectionProps } from "./types";

// ─── Lazy imports for standard inputs ───────────────────────────────────────
import { AccessibilityInput } from "../../Inputs/advanced/AccessibilityInput";
import { AnimationsInput } from "../../Inputs/advanced/AnimationsInput";
import { ConditionsInput } from "../../Inputs/advanced/ConditionsInput";
import { EffectsClassInput } from "../../Inputs/advanced/EffectsClassInput";
import { HoverClickInput } from "../../Inputs/advanced/HoverClickInput";
import { PropertiesInput } from "../../Inputs/advanced/PropertiesInput";
import { BackgroundInput } from "../../Inputs/color/BackgroundInput";
import { OpacityInput } from "../../Inputs/color/OpacityInput";
import { PatternInput } from "../../Inputs/color/PatternInput";
import { ShadowInput } from "../../Inputs/color/ShadowInput";
import { BorderInput } from "../../Inputs/layout/BorderInput";
import DisplaySettingsInput from "../../Inputs/layout/DisplaySettingsInput";
import { LayoutInput } from "../../Inputs/layout/LayoutInput";
import { RadiusInput } from "../../Inputs/layout/RadiusInput";
import { RingOutlineInput } from "../../Inputs/layout/RingOutlineInput";
import { AlignmentInput, SpacingInput } from "../../Inputs/layout/SpacingInput";
import { ModifiersInput } from "../../Inputs/modifiers/ModifiersInput";
import { FontInput } from "../../Inputs/typography/FontInput";
import { ContainerScrollEffectSection } from "../mainTabs/ContainerScrollEffectSection";
import { NodeAiContextSection } from "../mainTabs/NodeAiContextSection";
import "./PermissionsSection";
const ComponentImportExport = React.lazy(() =>
  import("../../Inputs/advanced/ComponentImportExport").then(m => ({
    default: m.ComponentImportExport,
  }))
);

// ─── 1. Component tab ───────────────────────────────────────────────────────

const ComponentMainSection = ({ toolbar }: SectionProps) => {
  const Settings = toolbar?.settings;
  return Settings ? <Settings /> : <Notice>Select a component to edit its settings.</Notice>;
};

registerSection({
  id: "component-main",
  title: "Component",
  tab: "component",
  keywords: ["content", "settings", "props"],
  component: ComponentMainSection,
  sortOrder: 0,
  defaultOpen: true,
});

registerSection({
  id: "modifiers",
  title: "Modifiers",
  tab: "component",
  keywords: ["modifier", "pattern", "variant", "style", "class", "toggle"],
  component: () => <ModifiersInput />,
  hideKey: "modifiers",
  sortOrder: 50,
});

// ─── 2. Layout tab ──────────────────────────────────────────────────────────

const LayoutSection = ({ toolbar }: SectionProps) => {
  const layoutConfig = toolbar?.layout;
  if (layoutConfig === "hidden") return null;
  if (layoutConfig === "spacing") return <SpacingInput />;
  if (layoutConfig) {
    return typeof layoutConfig === "function" ? layoutConfig() : <>{layoutConfig}</>;
  }
  return <LayoutInput />;
};

registerSection({
  id: "layout",
  title: "Layout",
  tab: "layout",
  keywords: ["layout", "display", "flex", "grid", "position", "overflow"],
  component: LayoutSection,
  sortOrder: 10,
  help: "Display mode, flex/grid, sizing, spacing, position, and overflow.",
});

// Spacing / Alignment — sub-sections of LayoutInput registered for search only
// (normal Layout tab shows the full LayoutInput).
registerSection({
  id: "alignment-search",
  title: "Alignment",
  tab: "layout",
  icon: SECTION_ICONS["Alignment"],
  keywords: ["gap", "gutter", "gap-x", "gap-y", "alignment", "align", "justify", "direction"],
  component: () => <AlignmentInput />,
  sortOrder: 15,
  help: "Flex/grid direction, gap, and child alignment.",
  searchOnly: true,
});

registerSection({
  id: "spacing-search",
  title: "Spacing",
  tab: "layout",
  icon: SECTION_ICONS["Spacing"],
  keywords: ["padding", "margin", "spacing", "space"],
  component: () => <SpacingInput />,
  sortOrder: 20,
  help: "Padding and margin controls.",
  searchOnly: true,
});

// ─── 3. Design tab ──────────────────────────────────────────────────────────

registerSection({
  id: "typography",
  title: "Typography",
  tab: "design",
  icon: SECTION_ICONS["Typography"],
  keywords: [
    "font",
    "text",
    "size",
    "weight",
    "line-height",
    "letter-spacing",
    "color",
    "align",
    "family",
  ],
  component: () => <FontInput />,
  hideKey: "font",
  sortOrder: 10,
  help: "Font family, size, weight, color, and text alignment.",
});

const BackgroundSection = ({ hidden }: SectionProps) => (
  <BackgroundInput>{!hidden.has("pattern") && <PatternInput />}</BackgroundInput>
);

registerSection({
  id: "background",
  title: "Background",
  tab: "design",
  icon: SECTION_ICONS["Background"],
  keywords: ["color", "image", "gradient", "pattern", "fill", "bg"],
  component: BackgroundSection,
  hideKey: "background",
  sortOrder: 20,
  help: "Background color, image, gradient, and pattern.",
});

registerSection({
  id: "border",
  title: "Border",
  tab: "design",
  icon: SECTION_ICONS["Border"],
  keywords: ["border", "stroke", "outline", "width", "style", "sides"],
  component: () => <BorderInput />,
  hideKey: "border",
  sortOrder: 30,
  help: "Border width, style, color, and radius.",
});

const DecorationSection = ({ hidden }: SectionProps) => {
  const hasAny =
    !hidden.has("radius") ||
    !hidden.has("shadow") ||
    !hidden.has("opacity") ||
    !hidden.has("ringOutline");
  if (!hasAny) return null;
  return (
    <ToolbarSection
      title="Decoration"
      icon={<TbSparkles />}
      help="Rounded corners, shadows, opacity, and ring outlines."
    >
      {!hidden.has("radius") && <RadiusInput />}
      {!hidden.has("shadow") && <ShadowInput />}
      {!hidden.has("opacity") && <OpacityInput label="Opacity" propKey="opacity" />}
      {!hidden.has("ringOutline") && <RingOutlineInput />}
    </ToolbarSection>
  );
};

registerSection({
  id: "decoration",
  title: "Decoration",
  tab: "design",
  icon: <TbSparkles />,
  keywords: ["radius", "shadow", "opacity", "ring", "outline", "rounded", "corners"],
  component: DecorationSection,
  sortOrder: 40,
  help: "Rounded corners, shadows, opacity, and ring outlines.",
});

const AdvancedSettingsSection = ({ toolbar }: SectionProps) => {
  const AdvancedSettings = toolbar?.advancedSettings;
  return AdvancedSettings ? <AdvancedSettings /> : null;
};

registerSection({
  id: "advanced-settings",
  title: "Advanced Settings",
  tab: "design",
  keywords: [],
  component: AdvancedSettingsSection,
  sortOrder: 50,
});

// ─── 4. Interactions tab ────────────────────────────────────────────────────

const HoverClickSection = ({ toolbar }: SectionProps) => (
  <HoverClickInput variant={toolbar?.hover ?? "container"} />
);

registerSection({
  id: "hover-click",
  title: "Click",
  tab: "interactions",
  icon: SECTION_ICONS["Click"],
  keywords: ["click", "hover", "action", "link", "scroll", "modal", "email", "phone"],
  component: HoverClickSection,
  hideKey: "hoverClick",
  sortOrder: 10,
});

registerSection({
  id: "conditions",
  title: "Conditions",
  tab: "interactions",
  keywords: ["condition", "visibility", "show", "hide", "url", "form"],
  component: () => <ConditionsInput />,
  sortOrder: 20,
});

registerSection({
  id: "animations",
  title: "Animation",
  tab: "interactions",
  icon: SECTION_ICONS["Animation"],
  keywords: ["animate", "motion", "entrance", "scroll", "transition", "framer"],
  component: () => <AnimationsInput />,
  hideKey: "animations",
  sortOrder: 30,
});

registerSection({
  id: "effects",
  title: "Tailwind effects",
  tab: "interactions",
  keywords: [
    "transition",
    "transform",
    "filter",
    "backdrop",
    "blur",
    "scale",
    "rotate",
    "scroll",
    "timeline",
    "horizontal",
    "pin",
  ],
  component: () => <EffectsClassInput />,
  hideKey: "effectsClass",
  sortOrder: 40,
});

/** Container only — GSAP section scroll / timeline (renders nothing for other components). */
registerSection({
  id: "container-scroll-effect",
  title: "Scroll Effect",
  tab: "interactions",
  icon: SECTION_ICONS["ScrollEffect"],
  keywords: ["scroll", "horizontal", "timeline", "pin", "gsap", "section"],
  component: () => <ContainerScrollEffectSection />,
  sortOrder: 45,
  help: "Pin-driven and horizontal scroll effects for section containers.",
});

// ─── 5. Advanced tab ────────────────────────────────────────────────────────

const PropertiesSection = () => (
  <ToolbarSection
    title="Properties"
    icon={<TbSettings />}
    help="Element ID, type, and data attributes."
  >
    <PropertiesInput />
  </ToolbarSection>
);

registerSection({
  id: "properties",
  title: "Properties",
  tab: "advanced",
  icon: SECTION_ICONS["Properties"],
  keywords: ["id", "element", "tag", "html", "data", "attribute"],
  component: PropertiesSection,
  sortOrder: 10,
});

registerSection({
  id: "aria",
  title: "ARIA",
  tab: "advanced",
  icon: SECTION_ICONS["ARIA"],
  keywords: ["accessibility", "aria", "role", "label", "tab-index", "screen-reader"],
  component: () => <AccessibilityInput />,
  hideKey: "accessibility",
  sortOrder: 20,
});

const DisplaySection = ({ hidden }: SectionProps) => (
  <DisplaySettingsInput showCursor={!hidden.has("cursor")} />
);

registerSection({
  id: "display",
  title: "Display",
  tab: "advanced",
  icon: SECTION_ICONS["Display"],
  keywords: ["visibility", "pointer", "cursor", "classname", "css"],
  component: DisplaySection,
  sortOrder: 30,
});

/** After Display (which includes Custom CSS via ClassNameInput) — see sortOrder. */
registerSection({
  id: "node-ai-context",
  title: "AI context",
  tab: "advanced",
  icon: <TbWand />,
  keywords: ["ai", "context", "description", "block", "notes", "tags", "assistant"],
  component: () => <NodeAiContextSection />,
  sortOrder: 35,
  help: "Optional notes/tags so AI understands this component. Page-wide defaults: Site Settings → AI.",
});

const ImportExportSection = () => (
  <ToolbarSection
    title="Import / Export"
    icon={<TbArrowsExchange />}
    defaultOpen={false}
    help="Copy this component as JSON or paste one in."
  >
    <ComponentImportExport />
  </ToolbarSection>
);

registerSection({
  id: "import-export",
  title: "Import / Export",
  tab: "advanced",
  icon: SECTION_ICONS["Import / Export"],
  keywords: ["json", "copy", "paste", "import", "export", "code"],
  component: ImportExportSection,
  hideKey: "importExport",
  sortOrder: 40,
});
