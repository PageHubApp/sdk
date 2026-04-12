import { useEditor, useNode } from "@craftjs/core";
import React, { useEffect, useState } from "react";
import { Box } from "@pagehub/ui";
import { TbLayoutList } from "react-icons/tb";
import { EditorEmptyLeafHint } from "../chrome/shared/EditorEmptyLeafHint";
import { BaseSelectorProps } from "./selectors";
import { CSStoObj } from "../utils/tailwind/tailwind";

export interface AccordionProps extends BaseSelectorProps {
  multiOpen?: boolean;
  defaultOpen?: number;
}

export const Accordion = ({
  children,
  ...incomingProps
}: Partial<AccordionProps> & { children?: React.ReactNode }) => {
  const props: AccordionProps = { multiOpen: false, defaultOpen: -1, ...incomingProps };
  const { query } = useEditor();
  const {
    id,
    connectors: { connect },
  } = useNode();
  const { enabled, isActive } = useEditor((state, q) => ({
    enabled: state.options.enabled,
    isActive: q.getEvent("selected").contains(id),
  }));

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-wire unique IDs on first mount
  useEffect(() => {
    if (!enabled || !isMounted) return;

    const node = query.node(id).get();
    if (!node) return;

    const childIds = node.data.nodes || [];
    childIds.forEach((childId: string, idx: number) => {
      const child = query.node(childId).get();
      if (!child) return;
      // Already wired if id doesn't start with placeholder
      if (child.data.props?.id && !child.data.props.id.startsWith("accordion-item-")) return;
    });
  }, [enabled, isMounted, id]);

  // Single-open behavior: close sibling <details> when one opens
  useEffect(() => {
    if (enabled || props.multiOpen) return;
    if (!isMounted) return;

    const el = document.querySelector(`[node-id="${id}"]`) as HTMLElement;
    if (!el) return;

    const handler = (e: Event) => {
      const target = e.target as HTMLDetailsElement;
      if (target.tagName !== "DETAILS" || !target.open) return;
      el.querySelectorAll("details[open]").forEach(d => {
        if (d !== target) (d as HTMLDetailsElement).open = false;
      });
    };

    el.addEventListener("toggle", handler, true);
    return () => el.removeEventListener("toggle", handler, true);
  }, [enabled, isMounted, props.multiOpen, id]);

  // Default open on viewer mount
  useEffect(() => {
    if (enabled || !isMounted) return;
    if (props.defaultOpen == null || props.defaultOpen < 0) return;

    const el = document.querySelector(`[node-id="${id}"]`) as HTMLElement;
    if (!el) return;

    const details = el.querySelectorAll(":scope > * details, :scope > details");
    if (details[props.defaultOpen]) {
      (details[props.defaultOpen] as HTMLDetailsElement).open = true;
    }
  }, [enabled, isMounted, props.defaultOpen, id]);

  const prop: any = {
    ref: (ref: any) => connect(ref),
    className: props.className || "flex flex-col w-full",
    style: props.root?.style ? CSStoObj(props.root.style) : undefined,
  };

  if (!props.multiOpen) {
    prop["data-accordion-group"] = "";
  }

  if (enabled && isMounted) {
    prop["node-id"] = id;
    prop["data-bounding-box"] = true;
  }

  return React.createElement(
    Box,
    prop,
    children ||
      (enabled ? (
        <EditorEmptyLeafHint
          selected={isActive}
          icon={<TbLayoutList aria-hidden />}
          idleLabel="Empty accordion"
          selectedDetail="Drop items or panels here"
        />
      ) : null)
  );
};

Accordion.craft = {
  displayName: "Accordion",
  rules: {
    canDrag: () => true,
    canDelete: () => true,
    canMoveIn: () => true,
  },
};
