/**
 * PropertySection — renders a section declaratively from PropertyDefs.
 *
 * Reads the current node's className via useNode() to evaluate showWhen
 * conditions. When a section's hideKey is in the hidden set or it has no
 * visible properties, the section renders nothing.
 */
import React, { useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { ItemAdvanceToggle } from "../helpers/ItemSelector";
import { ToolbarSection } from "../ToolbarSection";
import { PropertyRenderer, PropertyRow } from "./PropertyRenderer";
import { AccordionAddMenu, type AccordionAddMenuHandle } from "./AccordionAddMenu";
import { propertyHasValue } from "./propertyHasValue";
import { resolveSectionIcon } from "./sectionIcons";
import { SessionAddedAtom, sessionKey } from "./sessionAddedAtom";
import { ViewAtom } from "../../viewport/atoms";
import { ViewSelectionAtom } from "../Label";
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
  const addMenuRef = useRef<AccordionAddMenuHandle>(null);
  const { isPinned, getSlotNode } = useInspectorPin();
  const pinned = isPinned(sectionId);
  const pinSlotNode = pinned ? getSlotNode(sectionId) : null;

  const { id, className, craftName, toolbarOrder, componentProps } = useNode((node: any) => ({
    className: typeof node.data?.props.className === "string" ? node.data.props.className : "",
    craftName: (node.data.name || node.data.displayName || "") as string,
    toolbarOrder: Array.isArray(node.data?.props?.toolbarOrder)
      ? (node.data.props.toolbarOrder as string[])
      : [],
    componentProps: node.data?.props || {},
  }));
  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;
  const sessionAdded = useAtomValue(SessionAddedAtom);

  // Stable props object for showWhen — only include metadata showWhen needs
  const nodeProps = useMemo(() => ({ _craftName: craftName }), [craftName]);

  const editorMode = useAtomValue(EditorModeAtom);

  // Properties are static per section — no per-node filtering needed (mode strips advanced ones)
  const properties = useMemo(() => {
    const all = getProperties({ section: sectionId });
    return editorMode === "design" ? all : all.filter(p => !p.advanced);
  }, [sectionId, editorMode]);

  // Split into:
  //  - `main`: pinned (always-visible) in registry sortOrder
  //  - `added`: everything else, sorted by per-node toolbarOrder so user-added
  //    rows stack at the bottom in click-order. PropertyRow gates on hasValue.
  const { main, added } = useMemo(() => {
    const visible = properties.filter(p => !p.showWhen || p.showWhen(className, nodeProps));
    const mainProps: PropertyDef[] = [];
    const candidates: PropertyDef[] = [];
    for (const p of visible) {
      (p.pinned ? mainProps : candidates).push(p);
    }
    // Two groups: pre-existing (already had a value before +Add existed) sort by
    // registry sortOrder. User-added (in toolbarOrder) get APPENDED after, in
    // exact click sequence. Pre-existing always renders before added.
    const orderIndex = new Map<string, number>(toolbarOrder.map((id, i) => [id, i]));
    const addedSorted = [...candidates].sort((a, b) => {
      const aInOrder = orderIndex.has(a.id);
      const bInOrder = orderIndex.has(b.id);
      if (aInOrder && bInOrder) return orderIndex.get(a.id)! - orderIndex.get(b.id)!;
      if (aInOrder) return 1; // user-added → after
      if (bInOrder) return -1;
      return (a.sortOrder ?? 100) - (b.sortOrder ?? 100);
    });
    return { main: mainProps, added: addedSorted };
  }, [properties, className, nodeProps, toolbarOrder]);
  const advancedGroups = new Map<string, PropertyDef[]>();

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
  const visibleAddedCount = useMemo(
    () =>
      added.filter(
        p =>
          toolbarOrder.includes(p.id) ||
          sessionAdded.has(sessionKey(id, p.id)) ||
          propertyHasValue(p, className, componentProps, view, classDark)
      ).length,
    [added, toolbarOrder, sessionAdded, id, className, componentProps, view, classDark]
  );
  const noVisibleContent = main.length === 0 && visibleAddedCount === 0;
  const isEmpty = main.length === 0 && added.length === 0 && advancedGroups.size === 0;
  if (isHidden || isAdvancedHidden || isEmpty) return null;

  const renderFlatAdvanced = () => (
    <ToolbarSection full={section.advancedColumns ?? 1} collapsible={false} nested>
      {[...advancedGroups.values()].flat().map(prop => (
        <PropertyRow key={prop.id} def={prop} />
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
              <PropertyRow key={prop.id} def={prop} />
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
              <PropertyRow key={prop.id} def={prop} />
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
        <PropertyRow key={prop.id} def={prop} />
      ))}
      {added.map(prop => (
        <PropertyRow key={prop.id} def={prop} />
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
        icon={resolveSectionIcon(section.icon)}
        help={section.help}
        defaultOpen={section.defaultOpen && !noVisibleContent}
        enabled={!noVisibleContent}
        onClick={e => {
          // Empty section (no pinned, no visible added): bypass toggle, open picker.
          if (noVisibleContent) {
            e.preventDefault();
            addMenuRef.current?.open();
          }
        }}
        header={
          <>
            <SectionPinButton sectionId={sectionId} />
            <AccordionAddMenu ref={addMenuRef} sectionId={sectionId} />
          </>
        }
      >
        {scrollBody}
      </ToolbarSection>
      {pinned && pinSlotNode ? createPortal(bodyContent, pinSlotNode) : null}
    </>
  );
});
