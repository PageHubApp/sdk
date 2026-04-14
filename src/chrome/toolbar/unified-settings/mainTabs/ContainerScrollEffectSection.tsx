import { useEditor, useNode } from "@craftjs/core";
import { ToolbarDashedButton } from "../../helpers/ToolbarDashedButton";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { SECTION_ICONS } from "../helpers";

/**
 * GSAP scroll effects for Container — Interactions tab, after Tailwind effects (registry).
 * Renders nothing for non-Container nodes.
 */
export function ContainerScrollEffectSection() {
  /** Primitives only — Craft mutates `props` in place; `useNode(() => ({ props }))` does not re-render (lodash isEqual short-circuits on same ref). */
  const { id, craftName, containerType, scrollEffect } = useNode(node => {
    const p = node.data.props || {};
    const meta = node.data;
    return {
      id: node.id,
      craftName: meta.name || meta.displayName,
      containerType: p.type,
      scrollEffect: p.scrollEffect,
    };
  });
  const { actions } = useEditor();

  if (craftName !== "Container") return null;

  const isSection = containerType === "section";

  const scrollEffectBlockedRoles = ["header", "footer", "page", "component"] as const;
  const canSetSectionType =
    !isSection &&
    !scrollEffectBlockedRoles.includes(containerType as (typeof scrollEffectBlockedRoles)[number]);

  const sectionHelp = "Pin this section and animate children as the user scrolls.";
  const nonSectionHelp =
    "Scroll-driven effects need a container whose type is Section. Headers, footers, and page shells cannot use this block.";

  const sectionInner = (
    <>
      <ToolbarItem
        propKey="scrollEffect"
        propType="component"
        type="select"
        label="Effect"
        onChange={val => {
          if (val === "horizontal-scroll") {
            actions.setProp(id, (p: any) => {
              if (p.scrollDirection == null || p.scrollDirection === "") p.scrollDirection = "ltr";
              if (p.scrollSpeed == null) p.scrollSpeed = 1.5;
            });
          }
        }}
      >
        <option value="">None</option>
        <option value="horizontal-scroll">Horizontal Scroll</option>
        <option value="scroll-timeline">Scroll Timeline</option>
      </ToolbarItem>

      {scrollEffect === "horizontal-scroll" && (
        <>
          <ToolbarItem
            propKey="scrollDirection"
            propType="component"
            type="select"
            label="Direction"
            valueCoalesce="ltr"
          >
            <option value="ltr">Left to Right</option>
            <option value="rtl">Right to Left</option>
          </ToolbarItem>
          <ToolbarItem
            propKey="scrollSnap"
            propType="component"
            type="toggle"
            label="Snap to panels"
            on={true}
          />
          <ToolbarItem
            propKey="scrollSpeed"
            propType="component"
            type="select"
            label="Speed"
            valueCoalesce={1.5}
          >
            <option value="1">Fast</option>
            <option value="1.5">Normal</option>
            <option value="2">Slow</option>
            <option value="3">Very Slow</option>
          </ToolbarItem>
        </>
      )}

      {scrollEffect === "scroll-timeline" && (
        <ToolbarItem
          propKey="scrollTimelineRunway"
          propType="component"
          type="select"
          label="Runway"
        >
          <option value="2">Short</option>
          <option value="3">Normal</option>
          <option value="5">Long</option>
          <option value="8">Epic</option>
        </ToolbarItem>
      )}

      {scrollEffect && (
        <ToolbarItem propKey="scrollSmoothing" propType="component" type="select" label="Smoothing">
          <option value="0">None (instant)</option>
          <option value="0.5">Light</option>
          <option value="0.8">Normal</option>
          <option value="1.5">Heavy</option>
        </ToolbarItem>
      )}
    </>
  );

  const nonSectionInner = (
    <>
      {canSetSectionType ? (
        <>
          <p className="text-neutral-content text-xs leading-relaxed">
            Scroll effects only run when this container is a{" "}
            <span className="text-base-content font-medium">section</span>. Use the button, or set
            this container&apos;s type to Section in component settings.
          </p>
          <ToolbarDashedButton
            className="mt-2"
            icon={null}
            onClick={() =>
              actions.setProp(id, (p: any) => {
                p.type = "section";
              })
            }
          >
            Use section type
          </ToolbarDashedButton>
        </>
      ) : (
        <p className="text-neutral-content text-xs leading-relaxed">
          Scroll effects are not available for this container role (e.g. header, footer, or page).
          Use a section block inside this area if you need scroll effects.
        </p>
      )}
    </>
  );

  return (
    <ToolbarSection
      title="Scroll Effect"
      icon={SECTION_ICONS["ScrollEffect"]}
      help={isSection ? sectionHelp : nonSectionHelp}
    >
      {isSection ? sectionInner : nonSectionInner}
    </ToolbarSection>
  );
}
