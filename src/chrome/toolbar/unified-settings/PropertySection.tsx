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
import { ToolbarSection } from "../ToolbarSection";
import { PropertyRow } from "./PropertyRenderer";
import { AccordionAddMenu, type AccordionAddMenuHandle } from "./AccordionAddMenu";
import { propertyHasValue } from "./propertyHasValue";
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

  // Properties filtered by editor mode + property-level hideKey
  const properties = useMemo(() => {
    const all = getProperties({ section: sectionId });
    return all.filter(p => {
      if (editorMode !== "design" && p.advanced) return false;
      if (p.hideKey && hiddenKeys.has(p.hideKey)) return false;
      return true;
    });
  }, [sectionId, editorMode, hiddenKeys]);

  // Split: pinned → main (always-visible), rest → candidates (gated below).
  const { main, candidates } = useMemo(() => {
    const visible = properties.filter(p => !p.showWhen || p.showWhen(className, nodeProps));
    const mainProps: PropertyDef[] = [];
    const rest: PropertyDef[] = [];
    for (const p of visible) {
      (p.pinned ? mainProps : rest).push(p);
    }
    return { main: mainProps, candidates: rest };
  }, [properties, className, nodeProps]);

  // Visibility gate (mirrors PropertyRow). Pre-filter so empty sections don't render a body.
  const isPropVisible = (p: PropertyDef) =>
    toolbarOrder.includes(p.id) ||
    sessionAdded.has(sessionKey(id, p.id)) ||
    propertyHasValue(p, className, componentProps, view, classDark);

  const added = useMemo(() => {
    const visible = candidates.filter(isPropVisible);
    // Pre-existing (sortOrder) before user-added (toolbarOrder click sequence).
    const orderIndex = new Map<string, number>(toolbarOrder.map((id, i) => [id, i]));
    return [...visible].sort((a, b) => {
      const aInOrder = orderIndex.has(a.id);
      const bInOrder = orderIndex.has(b.id);
      if (aInOrder && bInOrder) return orderIndex.get(a.id)! - orderIndex.get(b.id)!;
      if (aInOrder) return 1;
      if (bInOrder) return -1;
      return (a.sortOrder ?? 100) - (b.sortOrder ?? 100);
    });
  }, [candidates, toolbarOrder, sessionAdded, id, className, componentProps, view, classDark]);

  if (!section) return null;

  const isHidden = !!(section.hideKey && hiddenKeys.has(section.hideKey));
  const isAdvancedHidden = !!section.advanced && editorMode === "content";
  const noVisibleContent = main.length === 0 && added.length === 0;
  const isEmpty = main.length === 0 && candidates.length === 0;
  if (isHidden || isAdvancedHidden || isEmpty) return null;

  const bodyContent = (
    <>
      {main.map(prop => (
        <PropertyRow key={prop.id} def={prop} />
      ))}
      {added.map(prop => (
        <PropertyRow key={prop.id} def={prop} />
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
