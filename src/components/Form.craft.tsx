/**
 * Form — Component definition via defineComponent()
 *
 * Replaces Form.craft.tsx and the toolbox entries in formComponents.tsx.
 * Complex example: canvas component with inline tools, custom rules,
 * default breakpoint props, and preset children with nested Element trees.
 */
import React from "react";
import { Element } from "@craftjs/core";
import { defineComponent } from "../define";
import { Form } from "./Form";
import { toHTML as containerToHTML } from "./Container.craft";
import type { ToHTMLFn } from "../utils/static-html";

const HONEYPOT_HTML = '<div aria-hidden="true" style="position:absolute;left:-9999px;top:-9999px;opacity:0;height:0;overflow:hidden"><input type="text" name="_ph_hp" autocomplete="off" tabindex="-1"/></div>';

const toHTML: ToHTMLFn = (props, children, ctx) => {
  return containerToHTML({ ...props, type: "form" }, HONEYPOT_HTML + children, ctx);
};
import { FormMainTab } from "../chrome/Toolbar/UnifiedSettings/mainTabs/FormMainTab";
import { HoverNodeController, DeleteNodeController } from "./editor-chrome";

// ─── Child components used in presets ──────────────────────────────────────
import { Container } from "./Container";
import { FormElement } from "./FormElement";
import { Button } from "./Button";

// ─── Shared styles for form presets ────────────────────────────────────────

const inputBaseStyles = {
  className: "p-(--input-padding) w-full border-solid border-(length:--input-border-width) border-(--input-border-color) rounded-(--input-border-radius) bg-(--input-bg-color) text-(--input-text-color) placeholder:text-(--input-placeholder-color)",
};

const submitButtonProps = {
  type: "submit",
  className: "px-(--button-padding-x) py-(--button-padding-y) font-bold text-center flex justify-center items-center gap-2 w-full md:w-full bg-transparent text-(--primary) rounded-(--radius) border border-(--primary)",
  canDelete: true,
  canEditName: true,
};

const fieldsContainerProps = {
  canDelete: true,
  canEditName: true,
  className: "flex flex-col w-full gap-(--container-gap)",
  custom: { displayName: "Fields" },
};

// ─── Preset child builders ─────────────────────────────────────────────────

function buildSubscribeChildren() {
  return [
    <Element key="fields" canvas is={Container} {...fieldsContainerProps}>
      <Element
        canvas is={FormElement}
        custom={{ displayName: "Email Input" }}
        type="email" placeholder="your@email.com" name="email"
        canDelete={true} canEditName={true} {...inputBaseStyles}
      />
    </Element>,
    <Element key="submit" canvas is={Button}
      custom={{ displayName: "Submit Button" }}
      text="Subscribe" {...submitButtonProps}
    />,
  ];
}

function buildContactChildren() {
  return [
    <Element key="fields" canvas is={Container} {...fieldsContainerProps}>
      <Element
        canvas is={FormElement}
        custom={{ displayName: "Name Input" }}
        type="text" placeholder="Your name" name="name"
        canDelete={true} canEditName={true} {...inputBaseStyles}
      />
      <Element
        canvas is={FormElement}
        custom={{ displayName: "Email Input" }}
        type="email" placeholder="your@email.com" name="email"
        canDelete={true} canEditName={true} {...inputBaseStyles}
      />
      <Element
        canvas is={FormElement}
        custom={{ displayName: "Message Input" }}
        type="textarea" placeholder="Your message..." name="message"
        canDelete={true} canEditName={true} {...inputBaseStyles}
      />
    </Element>,
    <Element key="submit" canvas is={Button}
      custom={{ displayName: "Submit Button" }}
      text="Send Message" {...submitButtonProps}
    />,
  ];
}

// ─── Definition ────────────────────────────────────────────────────────────

export const FormDef = defineComponent({
  name: "Form",
  component: Form,
  icon: "TbForms",
  category: "Forms",
  canvas: true,
  settings: FormMainTab,
  toHTML,
  disable: ["font", "opacity", "cursor", "hoverClick", "animations"],
  craftProps: {
    className: "flex flex-col items-center gap-(--container-gap)",
  },
  rules: {
    canDrag: () => true,
    canDelete: () => true,
    canMoveIn: (nodes) =>
      nodes.every(node => node.data?.type !== "Form" && node.data?.props?.type !== "form"),
  },
  tools: () => [
    <HoverNodeController
      key="formHoverController"
      position="top"
      align="start"
      placement="end"
      alt={{
        position: "bottom",
        align: "start",
        placement: "start",
      }}
    />,
    <DeleteNodeController key="formDelete" />,
  ],
  presets: [
    {
      label: "Subscribe Form",
      icon: "TbMail",
      props: { formType: "subscribe" },
      children: buildSubscribeChildren,
    },
    {
      label: "Contact Form",
      icon: "TbForms",
      props: { formType: "contact" },
      children: buildContactChildren,
    },
  ],
}, { __internal: true });
