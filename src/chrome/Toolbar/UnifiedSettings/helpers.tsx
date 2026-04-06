/**
 * Shared helpers for the Unified Settings system.
 *
 * Extracted to avoid circular deps:
 *   UnifiedSettings → registry → MainTabs → helpers  (no cycle)
 */
import React from "react";
import {
  TbAccessible,
  TbAdjustments,
  TbAnchor,
  TbArrowsExchange,
  TbArrowsMaximize,
  TbBolt,
  TbBorderAll,
  TbBoxMargin,
  TbBoxPadding,
  TbCategory,
  TbCode,
  TbFileText,
  TbHandMove,
  TbIcons,
  TbLayoutAlignCenter,
  TbPalette,
  TbPointer,
  TbSettings2,
  TbSparkles,
  TbTypography,
} from "react-icons/tb";
import { PiImageFill } from "react-icons/pi";
import { ToolbarSection } from "../ToolbarSection";
import { PropertiesInput } from "../Inputs/advanced/PropertiesInput";

/**
 * Icon map for component sections.
 */
export const SECTION_ICONS: Record<string, React.ReactNode> = {
  // Component
  Content: <TbFileText />,
  Presets: <TbPalette />,
  Icon: <TbIcons />,
  Type: <TbCategory />,
  Properties: <TbSettings2 />,
  Anchor: <TbAnchor />,
  // Design
  Colors: <TbPalette />,
  Typography: <TbTypography />,
  Background: <PiImageFill />,
  Border: <TbBorderAll />,
  Decoration: <TbSparkles />,
  // Layout
  Alignment: <TbLayoutAlignCenter />,
  Size: <TbArrowsMaximize />,
  Spacing: <TbBoxMargin />,
  // Interactions
  Click: <TbPointer />,
  Hover: <TbHandMove />,
  Animation: <TbBolt />,
  // Advanced
  ARIA: <TbAccessible />,
  Display: <TbAdjustments />,
  "Custom Code": <TbCode />,
  "Import / Export": <TbArrowsExchange />,
};

/**
 * Renders a "not available" placeholder for a section.
 */
export const renderNA = (title: string) => (
  <ToolbarSection title={title} icon={SECTION_ICONS[title]} disabled help="Not available for this component" />
);

/**
 * Standard component section order.
 * Every MainTab MUST render these sections in this exact order.
 * Missing sections become "not available" placeholders.
 */
const COMPONENT_SECTIONS = [
  "Content",
  "Presets",
  "Type",
  "Properties",
] as const;

/**
 * Sections that render in the Advanced tab instead of the Component tab.
 */
export const ADVANCED_COMPONENT_SECTIONS = [
  "Anchor",
] as const;

export type ComponentSlotName = (typeof COMPONENT_SECTIONS)[number] | (typeof ADVANCED_COMPONENT_SECTIONS)[number];

/**
 * Renders component-specific sections in the guaranteed standard order.
 * Pass a map of slot name → ReactNode for sections you want filled.
 * Every slot not in the map gets a "not available" placeholder.
 */
export function renderComponentSlots(
  slots: Partial<Record<ComponentSlotName, React.ReactNode>>
) {
  return (
    <>
      {COMPONENT_SECTIONS.map((title) => {
        if (title === "Properties" && slots[title] === undefined) {
          return (
            <React.Fragment key={title}>
              <ToolbarSection title="Properties" icon={SECTION_ICONS["Properties"]} help="Custom properties for this component.">
                <PropertiesInput />
              </ToolbarSection>
            </React.Fragment>
          );
        }
        return (
          <React.Fragment key={title}>
            {slots[title] !== undefined ? slots[title] : renderNA(title)}
          </React.Fragment>
        );
      })}
    </>
  );
}

/**
 * Renders the advanced component sections (Icon, Anchor) for the Advanced tab.
 */
export function renderAdvancedComponentSlots(
  slots: Partial<Record<ComponentSlotName, React.ReactNode>>
) {
  return (
    <>
      {ADVANCED_COMPONENT_SECTIONS.map((title) => (
        <React.Fragment key={title}>
          {slots[title] !== undefined ? slots[title] : renderNA(title)}
        </React.Fragment>
      ))}
    </>
  );
}
