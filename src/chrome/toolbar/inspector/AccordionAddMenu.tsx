/**
 * AccordionAddMenu — Framer-style `+ Add` picker for non-pinned properties.
 *
 * Renders a `+` button. Click opens a searchable popover listing the section's
 * non-pinned props that don't currently have a value. Picking one writes
 * its `defaultValue` (or a sensible fallback per input type), making the row
 * appear via PropertyRow's value-gated render.
 */
import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { useEditor, useNode } from "@craftjs/core";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { useAtomValue, useAtomState } from "@zedux/react";
import { TbPlus } from "react-icons/tb";
import {
  SearchableMenuPopover,
  type SearchableMenuItem,
  type SearchableMenuPopoverHandle,
} from "../../primitives/SearchableMenuPopover";
import { changeProp } from "../../viewport/state/viewportExports";
import { propertyHasValue } from "./propertyHasValue";
import { ViewAtom } from "../../viewport/state/atoms";
import { EditModifiersAtom } from "../Label";
import { useAccordionContext } from "../AccordionContext";
import { getProperties, getSectionDef } from "./registry/propertyRegistry";
import { HiddenKeysAtom } from "./registry/atoms";
import { SessionAddedAtom, sessionKey } from "./sessionAddedAtom";
import { PopoverOpenRequestAtom, requestOpenPopover } from "./popoverOpenRequestAtom";
import { isPopoverModeComponent } from "./popoverModeRegistry";
import { resolveCustomInput } from "./customInputs";
import type { PropertyDef, SectionId } from "./registry/propertyDefs";

interface Props {
  sectionId: SectionId;
}

export interface AccordionAddMenuHandle {
  open: () => void;
}

/** Resolve a default class/value to write when a user adds this property. */
function resolveDefaultValue(def: PropertyDef): string | undefined {
  if (def.defaultValue) return def.defaultValue;
  switch (def.input.type) {
    case "checkbox":
      return def.input.on;
    case "tailwind-select":
    case "tailwind-radio": {
      // Best-effort: the first option resolved at render time. Skipping for
      // now keeps the picker safe — caller should set defaultValue explicitly.
      return undefined;
    }
    default:
      return undefined;
  }
}

export const AccordionAddMenu = React.memo(
  forwardRef<AccordionAddMenuHandle, Props>(function AccordionAddMenu({ sectionId }, ref) {
    const popoverRef = useRef<SearchableMenuPopoverHandle>(null);
    const accordionCtx = useAccordionContext();
    const sectionTitle = useMemo(() => getSectionDef(sectionId)?.title || "", [sectionId]);
    const ensureSectionOpen = () => {
      if (sectionTitle && accordionCtx?.setOpen) accordionCtx.setOpen(sectionTitle, true);
    };

    const view = useAtomValue(ViewAtom);
    const classDark = useAtomValue(EditModifiersAtom).dark ?? false;
    const hiddenKeys = useAtomValue(HiddenKeysAtom);

    const {
      actions: { setProp },
      id,
      className,
      craftName,
      componentProps,
      toolbarOrder,
    } = useNode((node: any) => ({
      className: typeof node.data?.props?.className === "string" ? node.data.props.className : "",
      craftName: (node.data?.name || node.data?.displayName || "") as string,
      componentProps: node.data?.props || {},
      toolbarOrder: Array.isArray(node.data?.props?.toolbarOrder)
        ? (node.data.props.toolbarOrder as string[])
        : [],
    }));
    const { query: editorQuery } = useEditor();
    const [sessionAdded, setSessionAdded] = useAtomState(SessionAddedAtom);
    const [popoverRequests, setPopoverRequests] = useAtomState(PopoverOpenRequestAtom);

    // showWhen receives the same shape PropertySection passes — `_craftName`
    // synthesized onto componentProps. Lets registry-level node-type / context
    // gates (e.g. scroll-effect = Container only) hide picker entries that
    // would never render in body anyway.
    const showWhenProps = useMemo(
      () => ({ ...componentProps, _craftName: craftName }),
      [componentProps, craftName]
    );

    // Context for `def.isActive` — registry-aware defs (modifiers) need the
    // CraftJS query so the picker can correctly hide already-active items.
    const activeCtx = useMemo(() => ({ query: editorQuery, nodeId: id }), [editorQuery, id]);

    const orderSet = useMemo(() => new Set(toolbarOrder), [toolbarOrder]);
    const available = useMemo<SearchableMenuItem<PropertyDef>[]>(() => {
      return (
        getProperties({ section: sectionId })
          .filter(p => !p.pinned)
          .filter(p => !p.hideKey || !hiddenKeys.has(p.hideKey))
          .filter(p => !p.showWhen || p.showWhen(className, showWhenProps))
          .filter(p => !orderSet.has(p.id))
          // Session-added rows already render in the body via `wasJustAdded` even
          // when the user hasn't set a value yet. Hide them from the picker so the
          // same row can't appear in both places (e.g. pick Align with no class
          // set → row mounts via sessionAdded → picker would still offer Align).
          .filter(p => !sessionAdded.has(sessionKey(id, p.id)))
          .filter(p => {
            // Custom isActive (e.g. popover-mode rows whose value lives on a
            // nested prop or as className tokens) — exclude active items so the
            // picker doesn't double-add. Falls through to propertyHasValue for
            // props without a custom checker.
            if (p.isActive) return !p.isActive(className, componentProps, activeCtx);
            return !propertyHasValue(p, className, componentProps, view, classDark);
          })
          .map(p => ({
            id: p.id,
            label: p.label || p.id,
            hint: p.groupLabel,
            help: p.help,
            keywords: p.keywords,
            data: p,
          }))
      );
    }, [
      sectionId,
      className,
      showWhenProps,
      componentProps,
      view,
      classDark,
      hiddenKeys,
      orderSet,
      activeCtx,
      sessionAdded,
      id,
    ]);

    useImperativeHandle(
      ref,
      () => ({
        // Imperative open from PropertySection (empty-section title click).
        // For popover-mode single-prop sections we MUST expand the accordion
        // first so the trigger row mounts; otherwise the open-request fires
        // into a void (the popover trigger lives inside the section body).
        // Search-popover sections still float over a collapsed section.
        open: () => {
          const sectionProps = getProperties({ section: sectionId }).filter(
            p => !p.pinned && (!p.hideKey || !hiddenKeys.has(p.hideKey))
          );
          if (
            sectionProps.length === 1 &&
            sectionProps[0].input.type === "custom" &&
            isPopoverModeComponent(sectionProps[0].input.component)
          ) {
            ensureSectionOpen();
            requestOpenPopover(popoverRequests, setPopoverRequests, id, sectionProps[0].id);
            return;
          }
          popoverRef.current?.open();
        },
      }),
      [sectionId, hiddenKeys, popoverRequests, setPopoverRequests, id]
    );

    // Hide entirely when there are no addable (non-pinned, non-hidden) props in this section.
    const hasAddable = useMemo(
      () =>
        getProperties({ section: sectionId }).some(
          p => !p.pinned && (!p.hideKey || !hiddenKeys.has(p.hideKey))
        ),
      [sectionId, hiddenKeys]
    );
    if (!hasAddable) return null;

    // Single non-popover-mode custom input → the property IS the section (e.g.
    // Permissions, Import/Export, AI Context, Custom CSS). Nothing to "add"; the
    // section body always renders the editor. Suppress the `+`.
    const isSingleInlineCustomSection = (() => {
      const sectionProps = getProperties({ section: sectionId }).filter(
        p => !p.pinned && (!p.hideKey || !hiddenKeys.has(p.hideKey))
      );
      if (sectionProps.length !== 1) return false;
      const only = sectionProps[0];
      return only.input.type === "custom" && !isPopoverModeComponent(only.input.component);
    })();
    if (isSingleInlineCustomSection) return null;

    // Section that owns exactly one popover-mode prop → render the popover
    // trigger inline in the header. The trigger owns its own UI (empty-state
    // `+` button OR has-value chip + X) and listens for open-requests, so
    // section title clicks and `+` clicks both route through the same atom.
    const sectionPopoverProp = (() => {
      const sectionProps = getProperties({ section: sectionId }).filter(
        p => !p.pinned && (!p.hideKey || !hiddenKeys.has(p.hideKey))
      );
      if (sectionProps.length !== 1) return null;
      const only = sectionProps[0];
      if (only.input.type !== "custom") return null;
      if (!isPopoverModeComponent(only.input.component)) return null;
      return only;
    })();
    if (sectionPopoverProp && sectionPopoverProp.input.type === "custom") {
      const PopoverComponent = resolveCustomInput(sectionPopoverProp.input.component);
      return <PopoverComponent def={sectionPopoverProp} />;
    }

    const applyDefs = (defs: PropertyDef[]) => {
      if (!defs.length) return;
      ensureSectionOpen();
      const sessionOnlyKeys: string[] = [];
      // Only fire the popover-open request for a *single* add. Multi-add
      // shouldn't cascade-open N popovers — that's just visual chaos.
      const shouldAutoOpenPopover = defs.length === 1;
      defs.forEach(def => {
        const defaultValue = resolveDefaultValue(def);
        if (defaultValue != null) {
          changeProp({
            propKey: def.propKey || def.id,
            value: defaultValue,
            propType: def.propType || "class",
            setProp,
            view,
            classDark,
          });
          // Persist click-order. hasValue keeps the row alive across reloads.
          setProp((p: any) => {
            const order: string[] = Array.isArray(p.toolbarOrder) ? p.toolbarOrder : [];
            if (!order.includes(def.id)) p.toolbarOrder = [...order, def.id];
          }, 0);
        } else {
          // No clean default — session-only. Row dies on reload if user never set a value.
          // Popover-mode rows always render via PropertyRow (see PropertyRenderer),
          // so sessionAdded is not needed to make them visible — and writing it
          // would auto-open their FloatingPanel via the legacy sessionAdded
          // effect. For multi-add (shouldAutoOpenPopover === false) that means
          // every picked popover-mode prop pops its panel at once, which is the
          // exact "cascade chaos" we're trying to avoid. Skip sessionAdded for
          // popover-mode rows during multi-add; single-add still writes it so
          // the legacy single-pick auto-open flow keeps working for non-popover
          // session-only props.
          const isPopoverModeProp =
            def.input.type === "custom" && isPopoverModeComponent(def.input.component);
          if (!(isPopoverModeProp && !shouldAutoOpenPopover)) {
            sessionOnlyKeys.push(sessionKey(id, def.id));
          }
        }
        if (
          shouldAutoOpenPopover &&
          def.input.type === "custom" &&
          isPopoverModeComponent(def.input.component)
        ) {
          requestOpenPopover(popoverRequests, setPopoverRequests, id, def.id);
        }
      });
      if (sessionOnlyKeys.length) {
        const next = new Set(sessionAdded);
        sessionOnlyKeys.forEach(k => next.add(k));
        setSessionAdded(next);
      }
    };

    const onPick = (item: SearchableMenuItem<PropertyDef>) => applyDefs([item.data!]);
    const onPickMany = (items: SearchableMenuItem<PropertyDef>[]) =>
      applyDefs(items.map(i => i.data!));

    // Single addable option → skip the search popover.
    // For popover-mode custom inputs (Action, Animations, Conditions, …) the
    // click directly opens the popover modal instead of dropping an empty chip
    // in the sidebar; the chip only appears later if the user actually saves
    // a value. For everything else, fall back to the original add-via-pick flow.
    if (available.length === 1) {
      const only = available[0];
      const onlyDef = only.data;
      const isPopoverMode =
        onlyDef?.input.type === "custom" && isPopoverModeComponent(onlyDef.input.component);
      return (
        <button
          type="button"
          onClick={() => {
            ensureSectionOpen();
            if (isPopoverMode && onlyDef) {
              requestOpenPopover(popoverRequests, setPopoverRequests, id, onlyDef.id);
            } else {
              onPick(only);
            }
          }}
          aria-label={`Add ${only.label}`}
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content={only.help}
          className="text-neutral-content hover:text-base-content hover:bg-base-200 flex size-4 shrink-0 items-center justify-center rounded-md opacity-70 transition-[color,background-color,opacity] hover:opacity-100"
        >
          <TbPlus className="size-3.5" aria-hidden />
        </button>
      );
    }

    return (
      <SearchableMenuPopover<PropertyDef>
        ref={popoverRef}
        trigger={<TbPlus className="size-3.5" aria-hidden />}
        triggerAriaLabel="Add property"
        items={available}
        onSelect={onPick}
        multiSelect
        onSelectMany={onPickMany}
        emptyMessage="All properties added"
      />
    );
  })
);
