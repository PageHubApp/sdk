/**
 * Default Properties section — always shown in the Component tab.
 * Renders Element ID, HTML Tag (Type), and a chip that opens the data-*
 * attributes editor in a popover. Component-specific Properties content
 * renders after this.
 */
import { ToolbarItem } from "../../ToolbarItem";
import { TypeInput } from "../typography/TypeInput";
import { DataAttributesPopover } from "./DataAttributesPopover";

export const PropertiesInput = () => {
  return (
    <>
      <ToolbarItem
        propKey="id"
        propType="component"
        type="text"
        label="Element ID"
        placeholder="myComponent"
        labelHide={false}
      />

      <TypeInput />

      <DataAttributesPopover />
    </>
  );
};
