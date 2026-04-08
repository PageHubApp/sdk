import { TbForms, TbMail } from "react-icons/tb";
import { Element } from "@craftjs/core";
import { Form } from "../../../components/Form";
import { Container } from "../../../components/Container";
import { FormElement } from "../../../components/FormElement";
import { Button } from "../../../components/Button";
import { RenderToolComponent, ToolboxItemDisplay } from "./lib";

// Shared input styles — single className string
const inputBaseStyles = {
  className:
    "w-full border-solid border-(length:--border) border-(--input-border-color) rounded-field bg-(--input-bg-color) text-(--input-text-color) p-(--input-padding) placeholder:text-(--input-placeholder-color) focus:ring-(length:--input-focus-ring) focus:ring-(--input-focus-ring-color) focus:outline-none",
};

const submitButtonProps = {
  type: "submit",
  className:
    "flex w-full items-center justify-center gap-2 border border-primary bg-transparent px-(--button-padding-x) py-(--button-padding-y) text-center font-bold text-primary rounded-box",
  canDelete: true,
  canEditName: true,
};

const fieldsContainerProps = {
  canDelete: true,
  canEditName: true,
  className: "flex w-full flex-col gap-container",
  custom: { displayName: "Fields" },
};

// Build subscribe form fields: email input + submit
// Returned as a flat array — CraftJS toNodeTree cannot handle React Fragments as child wrappers.
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

// Build contact form fields: name + email + message + submit
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

export const RenderFormComponent = ({ text, formType, ...props }) => (
  <RenderToolComponent
    element={Form}
    formType={formType}
    display={<ToolboxItemDisplay icon={formType === "subscribe" ? TbMail : TbForms} label={text} />}
    {...props}
  >
    {formType === "contact" ? buildContactChildren() : buildSubscribeChildren()}
  </RenderToolComponent>
);

export const FormToolbox = {
  title: "Forms",
  content: [
    <RenderFormComponent key="1" text="Subscribe Form" formType="subscribe" />,
    <RenderFormComponent key="2" text="Contact Form" formType="contact" />,
  ],
};
