/**
 * Shared helpers for the Unified Settings system.
 *
 * Extracted to avoid circular deps:
 *   UnifiedSettings → registry → MainTabs → helpers  (no cycle)
 */
import React from "react";
import { useEditor, useNode } from "@craftjs/core";
import {
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
  TbLock,
  TbLockOpen,
  TbPalette,
  TbPhotoFilled,
  TbPointFilled,
  TbPointer,
  TbSettings2,
  TbChevronsDown,
  TbSparkles,
  TbTypography,
} from "react-icons/tb";
import { ToolbarSection } from "../ToolbarSection";
import { PropertiesInput } from "../inputs/advanced/PropertiesInput";

/**
 * Icon map for component sections.
 */
export const SECTION_ICONS: Record<string, React.ReactNode> = {
  // Component
  Content: <TbFileText />,
  Icon: <TbIcons />,
  Type: <TbCategory />,
  Marker: <TbPointFilled />,
  Attributes: <TbSettings2 />,
  /** Modal open-target id (Actions); not a generic "anchor" section */
  ModalTarget: <TbAnchor />,
  // Design
  Colors: <TbPalette />,
  Typography: <TbTypography />,
  Background: <TbPhotoFilled />,
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
  /** Interactions registry section (Container scroll / timeline) */
  ScrollEffect: <TbChevronsDown />,
  // Advanced
  Display: <TbAdjustments />,
  "Custom Code": <TbCode />,
  "Import / Export": <TbArrowsExchange />,
};

/**
 * Standard component section order.
 * Every MainTab MUST render these sections in this exact order.
 * Missing sections are skipped entirely.
 */
const COMPONENT_SECTIONS = ["Content", "Type", "Marker"] as const;

/**
 * Sections that render in the Advanced tab instead of the Component tab.
 */
export const ADVANCED_COMPONENT_SECTIONS = ["Attributes"] as const;

export type ComponentSlotName =
  | (typeof COMPONENT_SECTIONS)[number]
  | (typeof ADVANCED_COMPONENT_SECTIONS)[number];

/**
 * Renders component-specific sections in the guaranteed standard order.
 * Pass a map of slot name → ReactNode for sections you want filled.
 * Slots not in the map are skipped entirely.
 */
export function renderComponentSlots(slots: Partial<Record<ComponentSlotName, React.ReactNode>>) {
  return (
    <>
      {COMPONENT_SECTIONS.map(title =>
        slots[title] !== undefined ? (
          <React.Fragment key={title}>{slots[title]}</React.Fragment>
        ) : null
      )}
    </>
  );
}

/**
 * Renders the advanced component sections (Properties) for the Advanced tab.
 */
export function renderAdvancedComponentSlots(
  slots: Partial<Record<ComponentSlotName, React.ReactNode>>
) {
  return (
    <>
      {ADVANCED_COMPONENT_SECTIONS.map(title => {
        if (title === "Attributes" && slots[title] === undefined) {
          return (
            <React.Fragment key={title}>
              <ToolbarSection
                title="Attributes"
                icon={SECTION_ICONS["Attributes"]}
                help="HTML tag, ID, data attributes, and ARIA / accessibility."
              >
                <PropertiesInput />
              </ToolbarSection>
            </React.Fragment>
          );
        }
        if (slots[title] === undefined) return null;
        return <React.Fragment key={title}>{slots[title]}</React.Fragment>;
      })}
    </>
  );
}

/**
 * Toggle button for sealing/unsealing compound components in the layer tree.
 * Sealed components hide their internal node structure from the layer panel.
 */
export function SealToggle() {
  const { id } = useNode();
  const { actions, query } = useEditor();
  const isSealed = query.node(id).get()?.data?.custom?.sealed ?? false;

  return (
    <button
      className="border-base-300 hover:bg-neutral flex w-full items-center gap-1.5 rounded border px-3 py-2 text-xs transition-colors"
      onClick={() => {
        actions.setCustom(id, (custom: any) => {
          custom.sealed = !custom.sealed;
        });
      }}
    >
      {isSealed ? <TbLockOpen className="h-3.5 w-3.5" /> : <TbLock className="h-3.5 w-3.5" />}
      {isSealed ? "Unseal — show child layers" : "Seal — hide child layers"}
    </button>
  );
}
