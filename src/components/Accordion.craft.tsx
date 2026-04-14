/**
 * Accordion — Component definition via defineComponent()
 *
 * Uses native <details>/<summary> for zero-JS interactivity.
 * Preset builds 3 collapsible items, each using Container type="details"/"summary".
 */
import React from "react";
import { Element } from "@craftjs/core";
import { TbLayoutList } from "react-icons/tb";
import { defineComponent } from "../define";
import { Accordion } from "./Accordion";
import { Container } from "./Container";
import { Text } from "./Text";
import { staticClasses, getInlineStyle, tag, ariaAttrs, type ToHTMLFn } from "../utils/static-html";
import {
  AccordionMainTab,
  AccordionMainTabAdvanced,
} from "../chrome/Toolbar/UnifiedSettings/mainTabs/AccordionMainTab";
import { HoverNodeController, NameNodeController, DeleteNodeController } from "./editor-chrome";

const toHTML: ToHTMLFn = (props, children, ctx) => {
  const attrs: Record<string, any> = {
    class: staticClasses(props, ctx) || undefined,
    style: getInlineStyle(props) || undefined,
    ...ariaAttrs(props),
  };
  if (!props.multiOpen) attrs["data-accordion-group"] = "";

  return tag("div", attrs, children);
};

export function buildAccordionItem(index: number) {
  const title = `Accordion Item ${index + 1}`;
  const chevronSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;

  return (
    <Element
      key={`item-${index}`}
      canvas
      is={Container}
      type="details"
      custom={{ displayName: title, rules: { canMoveOut: () => false } }}
      className="border-base-300 group border-b"
    >
      <Element
        is={Container}
        type="summary"
        custom={{ displayName: `${title} Header` }}
        canDelete={true}
        canEditName={true}
        className="flex cursor-pointer list-none flex-row items-center justify-between px-4 py-3 select-none"
      >
        <Element
          is={Text}
          custom={{ displayName: "Title" }}
          text={`<p class="font-medium">${title}</p>`}
        />
        <Element
          is={Text}
          custom={{ displayName: "Chevron" }}
          text={`<span class="transition-transform duration-200 group-open:rotate-180">${chevronSvg}</span>`}
        />
      </Element>
      <Element
        canvas
        is={Container}
        custom={{ displayName: `${title} Content` }}
        canDelete={true}
        canEditName={true}
        className="gap-container flex flex-col px-4 py-3"
      >
        <Element
          is={Text}
          custom={{ displayName: "Content" }}
          text="<p>Content for this accordion item. Replace with your own content.</p>"
        />
      </Element>
    </Element>
  );
}

function buildAccordionChildren() {
  return [buildAccordionItem(0), buildAccordionItem(1), buildAccordionItem(2)];
}

export const AccordionDef = defineComponent(
  {
    name: "Accordion",
    component: Accordion,
    icon: TbLayoutList,
    category: "Interactive",
    canvas: true,
    settings: AccordionMainTab,
    advancedSettings: AccordionMainTabAdvanced,
    toHTML,
    disable: ["hoverClick"],
    rules: {
      canDrag: () => true,
      canDelete: () => true,
      canMoveIn: () => true,
      canMoveOut: () => false,
    },
    tools: () => [
      <NameNodeController
        key="accordionName"
        position="top"
        align="start"
        placement="end"
        alt={{ position: "bottom", align: "start", placement: "start" }}
      />,
      <HoverNodeController
        key="accordionHover"
        position="top"
        align="start"
        placement="end"
        alt={{ position: "bottom", align: "start", placement: "start" }}
      />,
      <DeleteNodeController key="accordionDelete" />,
    ],
    presets: [
      {
        label: "Accordion",
        props: {
          multiOpen: false,
          defaultOpen: -1,
          animation: "slideFade",
          className: "flex flex-col w-full",
          custom: {},
        },
        children: buildAccordionChildren,
      },
    ],
  },
  { __internal: true }
);
