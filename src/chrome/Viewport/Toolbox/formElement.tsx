import { TbAt, TbChevronDown, TbInputSearch, TbTextCaption } from "react-icons/tb";
import { FormElement } from "../../../components/FormElement";
import { RenderToolComponent, ToolboxItemDisplay } from "./lib";

export const RenderFormElementComponent = ({ text, ...props }) => (
  <RenderToolComponent element={FormElement} text="" display={text} {...props} />
);

// Base styles for all form elements — single className string
const formElementBaseStyles = {
  className:
    "w-full border-solid border-(length:--input-border-width) border-(--input-border-color) rounded-(--input-border-radius) bg-(--input-bg-color) text-(--input-text-color) p-(--input-padding) placeholder:text-(--input-placeholder-color) focus:ring-(length:--input-focus-ring) focus:ring-(--input-focus-ring-color) focus:outline-none",
};

export const FormElementToolbox = {
  title: "Form Elements",
  content: [
    <RenderFormElementComponent
      key="1"
      type="textarea"
      placeholder="Enter your message..."
      name="message"
      {...formElementBaseStyles}
      text={<ToolboxItemDisplay icon={TbTextCaption} label="Textarea" />}
    />,
    <RenderFormElementComponent
      key="2"
      type="text"
      placeholder="Enter text..."
      name="text"
      {...formElementBaseStyles}
      text={<ToolboxItemDisplay icon={TbInputSearch} label="Input" />}
    />,
    <RenderFormElementComponent
      key="3"
      type="email"
      placeholder="your@email.com"
      name="email"
      {...formElementBaseStyles}
      text={<ToolboxItemDisplay icon={TbAt} label="Email" />}
    />,
    <RenderFormElementComponent
      key="4"
      type="select"
      placeholder="Choose an option..."
      name="select"
      {...formElementBaseStyles}
      text={<ToolboxItemDisplay icon={TbChevronDown} label="Select" />}
    />,
  ],
};
