/** Form — presets extracted from Form.craft.tsx. */
import { Element } from "@craftjs/core";
import { TbForms, TbMail } from "react-icons/tb";
import { Container } from "../Container/Container";
import { FormElement } from "../FormElement/FormElement";
import { Button } from "../Button/Button";
import type { ComponentPreset } from "../../define/types";

const inputBaseStyles = {
  className:
    "p-(--input-padding) w-full border-solid border-(length:--border) border-(--input-border-color) rounded-field bg-(--input-bg-color) text-(--input-text-color) placeholder:text-(--input-placeholder-color)",
};

const submitButtonProps = {
  type: "submit",
  className: "btn btn-primary rounded-box px-space-md py-space-xs min-h-12 font-semibold w-full",
  canDelete: true,
  canEditName: true,
};

const fieldsContainerProps = {
  canDelete: true,
  canEditName: true,
  className: "flex flex-col w-full gap-container",
  custom: { displayName: "Fields" },
};

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

export const formPresets: ComponentPreset[] = [
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
];
