/**
 * AccordionAddMenu — Framer-style `+ Add` picker for non-pinned properties.
 *
 * Renders a `+` button. Click opens a searchable popover listing the section's
 * non-pinned props that don't currently have a value. Picking one writes
 * its `defaultValue` (or a sensible fallback per input type), making the row
 * appear via PropertyRow's value-gated render.
 */
import React, { forwardRef, useImperativeHandle, useMemo, useState, useRef, useEffect } from "react";
import { useEditor, useNode } from "@craftjs/core";
import { useAtomValue, useAtomState } from "@zedux/react";
import { TbPlus, TbSearch, TbX } from "react-icons/tb";
import { changeProp } from "../../viewport/viewportExports";
import { propertyHasValue } from "./propertyHasValue";
import { ViewAtom } from "../../viewport/atoms";
import { ViewSelectionAtom } from "../Label";
import { useAccordionContext } from "../AccordionContext";
import { getProperties, getSectionDef } from "./registry/propertyRegistry";
import { HiddenKeysAtom } from "./registry/atoms";
import { SessionAddedAtom, sessionKey } from "./sessionAddedAtom";
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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const accordionCtx = useAccordionContext();
  const sectionTitle = useMemo(() => getSectionDef(sectionId)?.title || "", [sectionId]);
  const ensureSectionOpen = () => {
    if (sectionTitle && accordionCtx?.setOpen) accordionCtx.setOpen(sectionTitle, true);
  };

  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;
  const hiddenKeys = useAtomValue(HiddenKeysAtom);

  const {
    actions: { setProp },
    id,
    className,
    componentProps,
    toolbarOrder,
  } = useNode((node: any) => ({
    className: typeof node.data?.props?.className === "string" ? node.data.props.className : "",
    componentProps: node.data?.props || {},
    toolbarOrder: Array.isArray(node.data?.props?.toolbarOrder)
      ? (node.data.props.toolbarOrder as string[])
      : [],
  }));
  const { query: editorQuery } = useEditor();
  const [sessionAdded, setSessionAdded] = useAtomState(SessionAddedAtom);

  const orderSet = useMemo(() => new Set(toolbarOrder), [toolbarOrder]);
  const available = useMemo(() => {
    return getProperties({ section: sectionId })
      .filter(p => !p.pinned)
      .filter(p => !p.hideKey || !hiddenKeys.has(p.hideKey))
      .filter(p => !orderSet.has(p.id))
      .filter(p => !propertyHasValue(p, className, componentProps, view, classDark))
      .filter(p => {
        if (!query) return true;
        const q = query.toLowerCase();
        return (
          p.label.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.keywords.some(kw => kw.includes(q))
        );
      });
  }, [sectionId, className, componentProps, view, classDark, query, hiddenKeys, orderSet]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: PointerEvent) => {
      if (!popoverRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", handleClick);
    return () => window.removeEventListener("pointerdown", handleClick);
  }, [open]);

  // Focus search on open
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useImperativeHandle(
    ref,
    () => ({
      // Imperative open from PropertySection (empty-section title click) — does NOT
      // expand the accordion. The picker floats over a still-collapsed section.
      open: () => setOpen(true),
    }),
    []
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

  const onPick = (def: PropertyDef) => {
    ensureSectionOpen();
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
      const next = new Set(sessionAdded);
      next.add(sessionKey(id, def.id));
      setSessionAdded(next);
    }
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          ensureSectionOpen();
          setOpen(o => !o);
        }}
        className="text-base-content hover:bg-base-200 flex size-4 shrink-0 items-center justify-center rounded transition-colors"
        aria-label="Add property"
      >
        <TbPlus className="size-3.5" aria-hidden />
      </button>
      {open && (
        <div
          ref={popoverRef}
          onClick={e => e.stopPropagation()}
          className="border-base-300/60 bg-base-100 absolute right-0 top-full z-50 mt-1 max-h-72 w-64 overflow-hidden rounded border shadow-lg"
        >
          <div className="border-base-300/60 flex items-center gap-1.5 border-b px-2 py-1.5">
            <TbSearch className="text-neutral-content size-3.5 shrink-0" aria-hidden />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Type to search..."
              className="text-base-content placeholder:text-neutral-content min-w-0 flex-1 bg-transparent text-xs outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-neutral-content hover:text-base-content shrink-0"
              >
                <TbX className="size-3" />
              </button>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto">
            {available.length === 0 ? (
              <div className="text-neutral-content px-3 py-4 text-center text-xs italic">
                {query ? `No matches for "${query}"` : "All properties added"}
              </div>
            ) : (
              available.map(def => (
                <button
                  key={def.id}
                  type="button"
                  onClick={() => onPick(def)}
                  className="text-base-content hover:bg-base-200 flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs"
                  title={def.help}
                >
                  <span>{def.label || def.id}</span>
                  {def.groupLabel && (
                    <span className="text-neutral-content text-[10px]">{def.groupLabel}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
  })
);
