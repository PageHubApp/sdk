/**
 * PropertySection — renders a section declaratively from PropertyDefs.
 *
 * Reads the current node's className via useNode() to evaluate showWhen
 * conditions. When a section's hideKey is in the hidden set or it has no
 * visible properties, the section renders nothing.
 */
import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { ItemAdvanceToggle } from "../helpers/ItemSelector";
import { ToolbarSection } from "../ToolbarSection";
import { PropertyRenderer } from "./PropertyRenderer";
import { getSectionDef, getProperties } from "./registry/propertyRegistry";
import { HiddenKeysAtom } from "./registry/atoms";
import type { PropertyDef, SectionId } from "./registry/propertyDefs";
import { useInspectorPin } from "./inspectorPin/InspectorPinContext";
import { SectionPinButton } from "./inspectorPin/SectionPinButton";
import { EditorModeAtom } from "../../viewport/atoms";

interface Props {
  sectionId: SectionId;
}

/**
 * Renders a section from PropertyDefs.
 * Always renders the accordion wrapper — disabled when hidden or empty.
 */
export const PropertySection = React.memo(function PropertySection({ sectionId }: Props) {
  const section = getSectionDef(sectionId);
  const hiddenKeys = useAtomValue(HiddenKeysAtom);
  const { isPinned, getSlotNode } = useInspectorPin();
  const pinned = isPinned(sectionId);
  const pinSlotNode = pinned ? getSlotNode(sectionId) : null;

  const { className, craftName } = useNode(node => ({
    className: typeof node.data?.props.className === "string" ? node.data.props.className : "",
    craftName: (node.data.name || node.data.displayName || "") as string,
  }));

  // Stable props object for showWhen — only include metadata showWhen needs
  const nodeProps = useMemo(() => ({ _craftName: craftName }), [craftName]);

  const editorMode = useAtomValue(EditorModeAtom);

  // Properties are static per section — no per-node filtering needed (mode strips advanced ones)
  const properties = useMemo(() => {
    const all = getProperties({ section: sectionId });
    return editorMode === "design" ? all : all.filter(p => !p.advanced);
  }, [sectionId, editorMode]);

  // Split into main vs advanced, evaluate showWhen against current className
  const { main, advancedGroups } = useMemo(() => {
    const mainProps: PropertyDef[] = [];
    const grouped = new Map<string, PropertyDef[]>();

    for (const prop of properties) {
      if (prop.showWhen && !prop.showWhen(className, nodeProps)) continue;

      if (prop.advancedGroup) {
        const group = grouped.get(prop.advancedGroup);
        if (group) group.push(prop);
        else grouped.set(prop.advancedGroup, [prop]);
      } else {
        mainProps.push(prop);
      }
    }

    return { main: mainProps, advancedGroups: grouped };
  }, [properties, className, nodeProps]);

  // Pre-compute sub-section render data when the section opts into grouped advanced (must run before any early return — hooks order)
  const subsectionRender = useMemo(() => {
    if (!section?.advancedSubsections || advancedGroups.size === 0) return null;
    const known = new Set(section.advancedSubsections.map(s => s.id));
    const orphans: PropertyDef[] = [];
    advancedGroups.forEach((props, groupId) => {
      if (!known.has(groupId)) orphans.push(...props);
    });
    return {
      subsections: section.advancedSubsections
        .map(s => ({ ...s, props: advancedGroups.get(s.id) ?? [] }))
        .filter(s => s.props.length > 0),
      orphans,
    };
  }, [section, advancedGroups]);

  if (!section) return null;

  // Section renders nothing when its hideKey is active OR it's marked advanced in content mode
  // OR it has no visible content
  const isHidden = !!(section.hideKey && hiddenKeys.has(section.hideKey));
  const isAdvancedHidden = !!section.advanced && editorMode === "content";
  const isEmpty = main.length === 0 && advancedGroups.size === 0;
  if (isHidden || isAdvancedHidden || isEmpty) return null;

  const renderFlatAdvanced = () => (
    <ToolbarSection full={section.advancedColumns ?? 1} collapsible={false} nested>
      {[...advancedGroups.values()].flat().map(prop => (
        <PropertyRenderer key={prop.id} def={prop} />
      ))}
    </ToolbarSection>
  );

  const renderGroupedAdvanced = () => {
    if (!subsectionRender) return null;
    return (
      <>
        {subsectionRender.subsections.map(s => (
          <ToolbarSection
            key={s.id}
            title={s.title}
            nested
            collapsible
            defaultOpen={s.defaultOpen ?? true}
            accordionPassive
            full={s.columns ?? 1}
          >
            {s.props.map(prop => (
              <PropertyRenderer key={prop.id} def={prop} />
            ))}
          </ToolbarSection>
        ))}
        {subsectionRender.orphans.length > 0 && (
          <ToolbarSection
            title="Other"
            nested
            collapsible
            defaultOpen={false}
            accordionPassive
            full={section.advancedColumns ?? 1}
          >
            {subsectionRender.orphans.map(prop => (
              <PropertyRenderer key={prop.id} def={prop} />
            ))}
          </ToolbarSection>
        )}
      </>
    );
  };

  const useGrouped = !!subsectionRender;
  const skipOuterToggle = useGrouped && section.skipAdvancedToggle;

  const bodyContent = (
    <>
      {main.map(prop => (
        <PropertyRenderer key={prop.id} def={prop} />
      ))}
      {advancedGroups.size > 0 &&
        (skipOuterToggle ? (
          renderGroupedAdvanced()
        ) : (
          <ItemAdvanceToggle
            propKey={sectionId}
            title={`More ${section.title.toLowerCase()} properties`}
          >
            {useGrouped ? renderGroupedAdvanced() : renderFlatAdvanced()}
          </ItemAdvanceToggle>
        ))}
    </>
  );

  const scrollBody = pinned ? (
    <div className="text-neutral-content border-base-300/60 border-t border-dashed px-3 py-2 text-xs italic">
      Properties for this section are pinned below.
    </div>
  ) : (
    bodyContent
  );

  return (
    <>
      <ToolbarSection
        title={section.title}
        icon={section.icon}
        help={section.help}
        defaultOpen={section.defaultOpen}
        header={<SectionPinButton sectionId={sectionId} />}
      >
        {scrollBody}
      </ToolbarSection>
      {pinned && pinSlotNode ? createPortal(bodyContent, pinSlotNode) : null}
    </>
  );
});
