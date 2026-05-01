import React from "react";
import { Element } from "@craftjs/core";
import { TbChevronDown } from "react-icons/tb";
import { Container } from "../Container";
import { Button } from "../../Button/Button";
import { Icon } from "../../Icon/Icon";
import { Text } from "../../Text/Text";

export function buildModalChildren() {
  // Generate a unique anchor per insert so dropping multiple Modal presets on
  // one page doesn't collide. Trigger and backdrop share this closure value.
  const anchor = `modal-${Math.random().toString(36).slice(2, 8)}`;
  return [
    <Element
      key="trigger"
      is={Button}
      custom={{ displayName: "Open Modal" }}
      text="Open Modal"
      url=""
      action={{
        type: "show-hide",
        target: anchor,
        direction: "show",
        trigger: "click",
        method: "class",
      }}
      className="btn btn-primary rounded-box px-space-md py-space-xs min-h-12 font-semibold"
    />,
    <Element
      key="overlay"
      canvas
      is={Container}
      custom={{ displayName: "Modal Backdrop" }}
      canDelete={true}
      canEditName={true}
      anchor={anchor}
      className="fixed top-0 left-0 z-[1200] hidden h-screen w-screen flex-col items-center justify-center bg-black/50 px-4 py-4"
      action={
        {
          type: "show-hide",
          target: anchor,
          direction: "hide",
          trigger: "click",
          method: "class",
        } as any
      }
    >
      <Element
        canvas
        is={Container}
        custom={{ displayName: "Modal Content" }}
        canDelete={true}
        canEditName={true}
        className="gap-container px-container-x py-container-y bg-base-100 rounded-box relative flex w-full max-w-lg flex-col shadow-xl"
        handlers={{ onClick: "event.stopPropagation()" }}
      >
        <Element
          is={Text}
          custom={{ displayName: "Title" }}
          tagName="h3"
          text='<h3 class="text-xl font-bold font-heading">Modal Title</h3>'
          canDelete={true}
          canEditName={true}
        />
        <Element
          is={Text}
          custom={{ displayName: "Body" }}
          text='<p class="text-base-content/80">Your modal content goes here.</p>'
          canDelete={true}
          canEditName={true}
        />
        <Element
          is={Button}
          custom={{ displayName: "Close" }}
          text="Got it"
          url=""
          action={{
            type: "show-hide",
            target: anchor,
            direction: "hide",
            trigger: "click",
            method: "class",
          }}
          className="btn btn-primary rounded-box px-space-md py-space-xs min-h-12 self-end font-semibold"
        />
      </Element>
    </Element>,
  ];
}

export function buildTabsChildren() {
  // Unique group + panel ids per insert so multiple Tabs presets on one page
  // don't collide. Buttons compose two actions on click: `show-hide` direction
  // tab swaps which panel is visible; `set-state` writes the selected panel
  // id under the group key so the active-styling stateModifier on each button
  // can read it. The first panel fires a load-trigger `set-state` so the
  // registry seeds before first paint — no flash of "no tab active".
  const suffix = Math.random().toString(36).slice(2, 8);
  const group = `tabs-${suffix}`;
  const panel = (i: number) => `tab-${suffix}-${i}`;
  const tabBtn = (i: number, label: string) => (
    <Element
      key={`tab-${i}`}
      is={Button}
      custom={{ displayName: `Tab ${i + 1}` }}
      text={label}
      url=""
      action={[
        {
          type: "show-hide",
          target: panel(i),
          direction: "tab",
          trigger: "click",
          method: "class",
          group,
        },
        {
          type: "set-state",
          key: group,
          kind: "selection",
          value: panel(i),
          trigger: "click",
        },
      ]}
      stateModifiers={[
        {
          conditions: [
            {
              logic: "all",
              conditions: [{ type: "state", key: group, operator: "equals", value: panel(i) }],
            },
          ],
          modifiers: ["tab-active"],
        },
      ]}
      className="text-base-content rounded-none border-b-2 border-transparent px-4 py-2 text-sm font-medium"
    />
  );
  const tabPanel = (i: number, body: string, hidden: boolean) => {
    const isFirst = !hidden;
    const props: Record<string, any> = {
      canvas: true,
      is: Container,
      custom: { displayName: `Tab Panel ${i + 1}` },
      canDelete: true,
      canEditName: true,
      id: panel(i),
      tabGroup: group,
      className: `gap-container px-container-x py-container-y flex flex-col${hidden ? " hidden" : ""}`,
    };
    if (isFirst) {
      props.action = [
        {
          type: "set-state",
          key: group,
          kind: "selection",
          value: panel(i),
          trigger: "load",
        },
      ];
    }
    return (
      <Element key={`panel-${i}`} {...props}>
        <Element
          is={Text}
          custom={{ displayName: "Content" }}
          text={body}
          canDelete={true}
          canEditName={true}
        />
      </Element>
    );
  };
  return [
    <Element
      key="bar"
      canvas
      is={Container}
      custom={{ displayName: "Tab Bar" }}
      canDelete={true}
      canEditName={true}
      className="border-base-300 flex flex-row gap-0 border-b"
    >
      {tabBtn(0, "Overview")}
      {tabBtn(1, "Features")}
      {tabBtn(2, "Pricing")}
    </Element>,
    tabPanel(
      0,
      "<p>Overview content goes here. This is the first tab panel, visible by default.</p>",
      false
    ),
    tabPanel(
      1,
      "<p>Features content goes here. This panel is hidden until Tab 2 is clicked.</p>",
      true
    ),
    tabPanel(
      2,
      "<p>Pricing content goes here. This panel is hidden until Tab 3 is clicked.</p>",
      true
    ),
  ];
}

/**
 * Builds one accordion item — a `<details>` Container with a summary
 * (header + chevron) and a body Container. Factored out so the
 * Accordion preset's `addChild.template` reuses the exact shape.
 *
 * The shared `name` attribute (single-open exclusive toggle) is supplied
 * by the caller — the initial 3-item drop uses one shared group; new
 * items appended later inherit the same group via the wrapper's first
 * child for consistency, but the simplest correct path is to always
 * generate a fresh group when the user drops the preset and let new
 * items reuse that string. The wrapper's modifier (`accordion-slide-fade`)
 * carries the animation regardless.
 */
export function buildAccordionItem(opts: {
  index: number;
  groupName: string;
  question: string;
  answer: string;
  open?: boolean;
}) {
  const { index, groupName, question, answer, open } = opts;
  return (
    <Element
      key={`item-${index}`}
      canvas
      is={Container}
      custom={{ displayName: `Accordion Item ${index + 1}` }}
      canDelete={true}
      canEditName={true}
      type="details"
      open={open || undefined}
      attrs={{ name: groupName }}
      className="border-base-300 group border-b"
    >
      <Element
        canvas
        is={Container}
        custom={{ displayName: "Header" }}
        canDelete={true}
        canEditName={true}
        type="summary"
        className="flex cursor-pointer list-none flex-row items-center justify-between px-4 py-3 select-none"
      >
        <Element
          is={Text}
          custom={{ displayName: "Title" }}
          text={`<p class="font-medium">${question}</p>`}
          canDelete={true}
          canEditName={true}
        />
        <Element
          is={Icon}
          custom={{ displayName: "Chevron" }}
          value="ref-icon:tb/TbChevronDown"
          className="h-5 w-5 transition-transform duration-200 group-open:rotate-180"
          canDelete={true}
          canEditName={true}
        />
      </Element>
      <Element
        canvas
        is={Container}
        custom={{ displayName: "Body" }}
        canDelete={true}
        canEditName={true}
        className="text-base-content/80 px-4 pb-4"
      >
        <Element
          is={Text}
          custom={{ displayName: "Answer" }}
          text={`<p>${answer}</p>`}
          canDelete={true}
          canEditName={true}
        />
      </Element>
    </Element>
  );
}

/** Used for new items appended via the Component-tab "Add Item" affordance. */
export function buildAccordionItemTemplate() {
  // Group name doesn't really matter for new items — the existing initial
  // children carry the original group; new items share their open-state
  // exclusivity with siblings only if the user manually copies the `name`
  // attr. Default to a fresh group so the new item starts independent.
  const groupName = `accordion-${Math.random().toString(36).slice(2, 8)}`;
  return buildAccordionItem({
    index: 0,
    groupName,
    question: "New question",
    answer: "Replace this with your answer.",
  });
}

export function buildAccordionChildren() {
  // Native <details> + shared `name` attr gives single-open exclusive toggle
  // with zero JS. Drop the `name` attr to allow multiple panels open at once.
  // Container renders `props.type: "details"` → <details>, "summary" → <summary>.
  const groupName = `accordion-${Math.random().toString(36).slice(2, 8)}`;
  return [
    buildAccordionItem({
      index: 0,
      groupName,
      question: "How does the accordion work?",
      answer:
        "Native <details> elements share a name attribute, giving single-open exclusive toggle with zero JavaScript.",
      open: true,
    }),
    buildAccordionItem({
      index: 1,
      groupName,
      question: "Can I have multiple panels open?",
      answer: "Remove the name attr from each item to allow multiple panels open at once.",
    }),
    buildAccordionItem({
      index: 2,
      groupName,
      question: "How do I customize the chevron?",
      answer:
        "Use the Modifiers Modal to author your own animation classes — or swap the Chevron icon to any other ref-icon ref.",
    }),
  ];
}

export function buildDropdownChildren() {
  return [
    <Element
      key="trigger"
      is={Button}
      custom={{ displayName: "Dropdown Trigger" }}
      text="Menu"
      url=""
      icon={{ value: "ref-icon:tb/TbChevronDown", position: "right", only: false, size: "w-5 h-5" }}
      canDelete={true}
      canEditName={true}
      className="btn btn-primary rounded-box px-space-md py-space-xs min-h-12 font-semibold"
    />,
    <Element
      key="panel"
      canvas
      is={Container}
      custom={{ displayName: "Dropdown Panel" }}
      canDelete={true}
      canEditName={true}
      handlers={{
        onClick:
          "if (event.currentTarget.closest('[tabindex]')) event.currentTarget.closest('[tabindex]').blur()",
      }}
      className="bg-base-200 text-base-content rounded-box border-base-300 py-space-xs absolute top-full left-0 z-50 mt-1 hidden min-w-48 flex-col overflow-hidden border shadow-lg group-focus-within:flex"
    >
      <Element
        is={Button}
        custom={{ displayName: "Option 1" }}
        text="Option 1"
        url="#"
        canDelete={true}
        canEditName={true}
        className="hover:bg-neutral px-space-sm py-space-xs w-full rounded-none border-0 text-left text-sm"
      />
      <Element
        is={Button}
        custom={{ displayName: "Option 2" }}
        text="Option 2"
        url="#"
        canDelete={true}
        canEditName={true}
        className="hover:bg-neutral px-space-sm py-space-xs w-full rounded-none border-0 text-left text-sm"
      />
      <Element
        is={Button}
        custom={{ displayName: "Option 3" }}
        text="Option 3"
        url="#"
        canDelete={true}
        canEditName={true}
        className="hover:bg-neutral px-space-sm py-space-xs w-full rounded-none border-0 text-left text-sm"
      />
    </Element>,
  ];
}
