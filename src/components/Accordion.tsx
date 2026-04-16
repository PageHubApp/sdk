import { useEditor, useNode } from "@craftjs/core";
import React, { useEffect, useState } from "react";
import { Box } from "@pagehub/ui";
import { TbLayoutList } from "react-icons/tb";
import { EditorEmptyLeafHint } from "../chrome/primitives/EditorEmptyLeafHint";
import { BaseSelectorProps } from "./selectors";
import { CSStoObj } from "../utils/tailwind/tailwind";

export type AccordionAnimation = "none" | "slide" | "fade" | "slideFade";

export type AccordionEasing = "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear";

export interface AccordionProps extends BaseSelectorProps {
  multiOpen?: boolean;
  defaultOpen?: number;
  animation?: AccordionAnimation;
  animationDuration?: number;
  animationEasing?: AccordionEasing;
}

export const Accordion = ({
  children,
  ...incomingProps
}: Partial<AccordionProps> & { children?: React.ReactNode }) => {
  const props: AccordionProps = { multiOpen: false, defaultOpen: -1, animation: "slideFade", ...incomingProps };
  const { query } = useEditor();
  const {
    id,
    connectors: { connect },
  } = useNode();
  const { enabled, isActive } = useEditor((state, q) => ({
    enabled: state.options.enabled,
    isActive: q.getEvent("selected").contains(id),
  }));

  const wrapperRef = React.useRef<HTMLElement>(null);
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

  // Single-open behavior: shared `name` attribute on <details> elements
  // gives native browser exclusive toggle — no JS event needed, no flash.
  useEffect(() => {
    if (enabled || props.multiOpen) return;
    if (!isMounted) return;

    const el = wrapperRef.current;
    if (!el) return;

    const groupName = `accordion-${id}`;
    el.querySelectorAll(":scope > * > details, :scope > details").forEach(d => {
      (d as HTMLDetailsElement).setAttribute("name", groupName);
    });
  }, [enabled, isMounted, props.multiOpen, id]);

  // Default open on viewer mount
  useEffect(() => {
    if (enabled || !isMounted) return;
    if (props.defaultOpen == null || props.defaultOpen < 0) return;

    const el = wrapperRef.current;
    if (!el) return;

    const details = el.querySelectorAll(":scope > * details, :scope > details");
    if (details[props.defaultOpen]) {
      (details[props.defaultOpen] as HTMLDetailsElement).open = true;
    }
  }, [enabled, isMounted, props.defaultOpen]);

  const animClass =
    props.animation && props.animation !== "none"
      ? `ph-accordion-${props.animation === "slideFade" ? "slide-fade" : props.animation}`
      : "";

  const baseStyle = props.root?.style ? CSStoObj(props.root.style) : {};
  const animStyle: Record<string, string> = {};
  if (props.animationDuration != null) {
    animStyle["--ph-accordion-duration"] = `${props.animationDuration}s`;
  }
  if (props.animationEasing) {
    animStyle["--ph-accordion-easing"] = props.animationEasing;
  }

  const prop: any = {
    ref: (ref: any) => {
      wrapperRef.current = ref;
      connect(ref);
    },
    className: [props.className || "flex flex-col w-full", animClass].filter(Boolean).join(" "),
    style: { ...baseStyle, ...animStyle },
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
          selectedLabel="Drop items here"
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
