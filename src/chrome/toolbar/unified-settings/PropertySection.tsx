/**
 * PropertySection — renders a section declaratively from PropertyDefs.
 *
 * Reads the current node's className via useNode() to evaluate showWhen
 * conditions. When a section's hideKey is in the hidden set or it has no
 * visible properties, the section renders nothing.
 */
import React, { useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useEditor, useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { ToolbarSection } from "../ToolbarSection";
import { PropertyRenderer, PropertyRow } from "./PropertyRenderer";
import { AccordionAddMenu, type AccordionAddMenuHandle } from "./AccordionAddMenu";
import { propertyHasValue } from "./propertyHasValue";
import { SessionAddedAtom, sessionKey } from "./sessionAddedAtom";
import { isPopoverModeComponent } from "./popoverModeRegistry";
import { ViewAtom } from "../../viewport/atoms";
import { ViewSelectionAtom } from "../Label";
import { getSectionDef, getProperties } from "./registry/propertyRegistry";
import { HiddenKeysAtom } from "./registry/atoms";
import type { PropertyDef, SectionId } from "./registry/propertyDefs";
import { useInspectorPin } from "./inspectorPin/InspectorPinContext";
import { SectionPinButton } from "./inspectorPin/SectionPinButton";

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
  const { query } = useEditor();

  // Stable props object for showWhen — only include metadata showWhen needs
  const nodeProps = useMemo(() => ({ _craftName: craftName }), [craftName]);

  // Context handed to `def.isActive` — registry-aware defs (e.g. modifiers)
  // need the CraftJS query to read `node.data.type.craft.*` for state that
  // can't be derived from className/props alone.
  const activeCtx = useMemo(() => ({ query, nodeId: id }), [query, id]);

  // Properties filtered by property-level hideKey
  const properties = useMemo(() => {
    const all = getProperties({ section: sectionId });
    return all.filter(p => {
      if (p.hideKey && hiddenKeys.has(p.hideKey)) return false;
      return true;
    });
  }, [sectionId, hiddenKeys]);

  // Split: pinned → main (always-visible), rest → candidates (gated below).
  // Pinned props can opt into a value-gate via `isActive` — when defined and
  // returning false, the row is excluded from `main` (so list-style pinned
  // props like Conditions don't keep the section in expanded mode while empty).
  const { main, candidates } = useMemo(() => {
    const visible = properties.filter(p => !p.showWhen || p.showWhen(className, nodeProps));
    const mainProps: PropertyDef[] = [];
    const rest: PropertyDef[] = [];
    for (const p of visible) {
      if (p.pinned) {
        if (p.isActive && !p.isActive(className, componentProps, activeCtx)) continue;
        mainProps.push(p);
      } else {
        rest.push(p);
      }
    }
    return { main: mainProps, candidates: rest };
  }, [properties, className, nodeProps, componentProps, activeCtx]);

  // Sections whose only non-pinned property is a single non-popover-mode custom
  // input (Permissions, Import/Export, AI Context, Custom CSS) are "the section
  // IS the input" — always render the body, no `+`, normal accordion toggle.
  // There's nothing to "add"; the header just expands/collapses the editor.
  const isSingleCustomSection =
    candidates.length === 1 &&
    candidates[0].input.type === "custom" &&
    !isPopoverModeComponent(candidates[0].input.component);

  // Visibility gate (mirrors PropertyRow). Pre-filter so empty sections don't render a body.
  // Popover-mode customs default to ALWAYS visible — they own their own empty
  // state (chip hidden when no value) and the section is the user's only entry
  // point to the popover trigger row. EXCEPT: when a popover-mode prop sets
  // `def.isActive`, it opts into value-gated visibility (used by stacked-row
  // sections like Effects where 6 popover-mode props share one section and we
  // only want the active ones to render in body).
  const isPropVisible = (p: PropertyDef) => {
    if (p.input.type === "custom" && isPopoverModeComponent(p.input.component)) {
      if (p.isActive) {
        return (
          p.isActive(className, componentProps, activeCtx) ||
          toolbarOrder.includes(p.id) ||
          sessionAdded.has(sessionKey(id, p.id))
        );
      }
      return true;
    }
    if (isSingleCustomSection && p === candidates[0]) return true;
    return (
      toolbarOrder.includes(p.id) ||
      sessionAdded.has(sessionKey(id, p.id)) ||
      propertyHasValue(p, className, componentProps, view, classDark)
    );
  };

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
  const isEmpty = main.length === 0 && candidates.length === 0;
  if (isHidden || isEmpty) return null;

  // Sections whose ONLY prop is a single popover-mode custom render the trigger
  // in the header (via AccordionAddMenu) — so skip the body and disable accordion
  // collapse. The header IS the section. Multi-prop popover-mode sections (e.g.
  // Effects with 6 popover-mode rows) fall through to a regular accordion: the
  // `+` shows AccordionAddMenu's search picker, the body lists active rows.
  const isPopoverOnlySection =
    properties.length === 1 &&
    properties[0].input.type === "custom" &&
    isPopoverModeComponent(properties[0].input.component);
  // Mixed pattern (Conditions): a single non-pinned popover-mode picker
  // alongside other body props. AccordionAddMenu's `sectionPopoverProp`
  // path mounts the picker in the section header; without filtering it out
  // of the body it would also render as a row inside (duplicate `+`), AND
  // it would keep `noVisibleContent` false even when no real body content
  // exists — preventing the section from collapsing into its empty state.
  const nonPinnedProps = properties.filter(p => !p.pinned);
  const headerMountsPopoverPicker =
    !isPopoverOnlySection &&
    nonPinnedProps.length === 1 &&
    nonPinnedProps[0].input.type === "custom" &&
    isPopoverModeComponent(nonPinnedProps[0].input.component);
  const filterPopoverModeProps = (p: PropertyDef) =>
    !(p.input.type === "custom" && isPopoverModeComponent(p.input.component));
  const shouldFilterPopover = isPopoverOnlySection || headerMountsPopoverPicker;
  const visibleMain = shouldFilterPopover ? main.filter(filterPopoverModeProps) : main;
  const visibleAdded = shouldFilterPopover ? added.filter(filterPopoverModeProps) : added;
  // Use the post-filter counts so a header-mounted popover picker doesn't
  // count as body content. Otherwise the empty-state `+` click handler
  // (line below) wouldn't fire and the section would expand into a blank body.
  const noVisibleContent = visibleMain.length === 0 && visibleAdded.length === 0;

  // Single-custom sections bypass PropertyRow's value gate — the custom input
  // IS the section content, so it always renders.
  const Row = isSingleCustomSection ? PropertyRenderer : PropertyRow;
  const bodyContent = (
    <>
      {visibleMain.map(prop => (
        <Row key={prop.id} def={prop} />
      ))}
      {visibleAdded.map(prop => (
        <Row key={prop.id} def={prop} />
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
        // Popover-only sections render header-only. collapsible=false bypasses
        // the accordion atom (so previously-persisted open state can't leak
        // back in) and defaultOpen=false keeps the un-managed body hidden.
        defaultOpen={
          isPopoverOnlySection ? false : (section.defaultOpen ?? false) && !noVisibleContent
        }
        enabled={!noVisibleContent}
        collapsible={!isPopoverOnlySection}
        // collapsible=false drops cursor-pointer. We DO want pointer here
        // because the header is the popover trigger.
        className={isPopoverOnlySection ? "cursor-pointer!" : ""}
        onClick={e => {
          // Popover-only section → click anywhere on the header opens the popover.
          // Empty regular section (with addable props) → open the picker.
          // Single-custom sections fall through to normal accordion toggle —
          // their body is always rendered so there's nothing to "add".
          if (isPopoverOnlySection || (noVisibleContent && !isSingleCustomSection)) {
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
