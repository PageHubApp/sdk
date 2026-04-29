/**
 * Default Properties section — always shown in the Component tab.
 * Renders Element ID, HTML Tag (Type), and a chip that opens the data-*
 * attributes editor in a popover. Component-specific Properties content
 * renders after this.
 */
import { ToolbarItem } from "../../ToolbarItem";
import { TypeInput } from "../typography/TypeInput";
import { DataAttributesPopover } from "./DataAttributesPopover";
import { useNode } from "@craftjs/core";

export const PropertiesInput = () => {
  const { componentName } = useNode(node => ({
    componentName: String(node.data?.name || ""),
  }));

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

      {componentName === "Image" ? (
        <>
          <ToolbarItem
            propKey="alt"
            propType="component"
            type="text"
            label="Alt Text"
            placeholder="Describe this image for screen readers"
            labelHide={false}
          />
          <ToolbarItem
            propKey="title"
            propType="component"
            type="text"
            label="Title"
            placeholder="Optional advisory title"
            labelHide={false}
          />
        </>
      ) : null}

      <DataAttributesPopover />
    </>
  );
};
