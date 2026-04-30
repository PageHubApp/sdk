/**
 * Form — Component definition via defineComponent()
 *
 * Toolbox: BUILTIN_COMPONENT_DEFS + buildCustomToolboxEntries (ComponentSettings).
 * Complex example: canvas component with inline tools, custom rules,
 * default breakpoint props, and preset children with nested Element trees.
 */
import React from "react";
import { Element } from "@craftjs/core";
import { TbForms, TbMail } from "react-icons/tb";
import { defineComponent } from "../define";
import { Form } from "./Form";
import { toHTML as containerToHTML } from "./Container.craft";
import type { ToHTMLFn } from "../utils/static-html";

const HONEYPOT_HTML =
  '<div aria-hidden="true" style="position:absolute;left:-9999px;top:-9999px;opacity:0;height:0;overflow:hidden"><input type="text" name="_ph_hp" autocomplete="off" tabindex="-1"/></div>';

const toHTML: ToHTMLFn = (props, children, ctx) => {
  return containerToHTML({ ...props, type: "form" }, HONEYPOT_HTML + children, ctx);
};
const FormMainTab = React.lazy(() =>
  import("../chrome/toolbar/unified-settings/mainTabs/FormMainTab").then((mod) => ({ default: mod.FormMainTab })),
);
import { HoverNodeController, DeleteNodeController } from "./editor-chrome";

// ─── Child components used in presets ──────────────────────────────────────
import { Container } from "./Container";
import { FormElement } from "./FormElement";
import { Button } from "./Button";

// ─── Shared styles for form presets ────────────────────────────────────────

const inputBaseStyles = {
  className:
    "p-(--input-padding) w-full border-solid border-(length:--border) border-(--input-border-color) rounded-field bg-(--input-bg-color) text-(--input-text-color) placeholder:text-(--input-placeholder-color)",
};

const submitButtonProps = {
  type: "submit",
  className:
    "btn btn-primary rounded-box px-space-md py-space-xs min-h-12 font-semibold w-full",
  canDelete: true,
  canEditName: true,
};

const fieldsContainerProps = {
  canDelete: true,
  canEditName: true,
  className: "flex flex-col w-full gap-container",
  custom: { displayName: "Fields" },
};

// ─── Preset child builders ─────────────────────────────────────────────────

function buildSubscribeChildren() {
  return [
    <Element key="fields" canvas is={Container} {...fieldsContainerProps}>
      <Element
        canvas
        is={FormElement}
        custom={{ displayName: "Email Input" }}
        type="email"
        placeholder="your@email.com"
        name="email"
        canDelete={true}
        canEditName={true}
        {...inputBaseStyles}
      />
    </Element>,
    <Element
      key="submit"
      canvas
      is={Button}
      custom={{ displayName: "Submit Button" }}
      text="Subscribe"
      {...submitButtonProps}
    />,
  ];
}

function buildContactChildren() {
  return [
    <Element key="fields" canvas is={Container} {...fieldsContainerProps}>
      <Element
        canvas
        is={FormElement}
        custom={{ displayName: "Name Input" }}
        type="text"
        placeholder="Your name"
        name="name"
        canDelete={true}
        canEditName={true}
        {...inputBaseStyles}
      />
      <Element
        canvas
        is={FormElement}
        custom={{ displayName: "Email Input" }}
        type="email"
        placeholder="your@email.com"
        name="email"
        canDelete={true}
        canEditName={true}
        {...inputBaseStyles}
      />
      <Element
        canvas
        is={FormElement}
        custom={{ displayName: "Message Input" }}
        type="textarea"
        placeholder="Your message..."
        name="message"
        canDelete={true}
        canEditName={true}
        {...inputBaseStyles}
      />
    </Element>,
    <Element
      key="submit"
      canvas
      is={Button}
      custom={{ displayName: "Submit Button" }}
      text="Send Message"
      {...submitButtonProps}
    />,
  ];
}

// ─── Definition ────────────────────────────────────────────────────────────

export const FormDef = defineComponent(
  {
    name: "Form",
    component: Form,
    icon: TbForms,
    category: "Forms",
    canvas: true,
    settings: FormMainTab,
    toHTML,
    disable: ["font", "opacity", "cursor", "hoverClick", "animations"],
    craftProps: {
      className: "flex flex-col items-center gap-container",
    },
    rules: {
      canDrag: () => true,
      canDelete: () => true,
      canMoveIn: nodes =>
        nodes.every(node => node.data?.type !== "Form" && node.data?.props?.type !== "form"),
    },
    tools: [],
    presets: [
      {
        label: "Subscribe Form",
        icon: TbMail,
        description: "An email-only form — newsletter sign-ups, etc.",
        props: { formType: "subscribe" },
        children: buildSubscribeChildren,
      },
      {
        label: "Contact Form",
        icon: TbForms,
        description: "A standard 'get in touch' form — name, email, message.",
        props: { formType: "contact" },
        children: buildContactChildren,
      },
    ],
  },
  { __internal: true }
);
