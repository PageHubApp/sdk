/**
 * Default Properties section — always shown in the Component tab.
 * Renders Element ID and HTML Tag (Type).
 * Component-specific Properties content renders after this.
 */
import { ToolbarItem } from "../../ToolbarItem";
import { TypeInput } from "../typography/TypeInput";

export const PropertiesInput = () => (
  <>
    <ToolbarItem
      propKey="id"
      propType="component"
      type="text"
      label="Element ID"
      placeholder="myComponent"
      labelHide={false}
      description="Assign a unique id to the element. Can be used in Hover & Click settings."
    />

    <TypeInput />
  </>
);
