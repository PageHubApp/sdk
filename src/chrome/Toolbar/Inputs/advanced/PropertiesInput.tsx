/**
 * Default Properties section — always shown in the Component tab.
 * Renders Element ID and HTML Tag (Type).
 * Component-specific Properties content renders after this.
 */
import { useAtomState } from "@zedux/react";
import { TabAtom } from "../../../Viewport/atoms";
import { scrollToSection } from "../../UnifiedTab";
import { ToolbarItem } from "../../ToolbarItem";
import { TypeInput } from "../typography/TypeInput";

export const PropertiesInput = () => {
  const [, setTab] = useAtomState(TabAtom);

  return (
    <>
      <ToolbarItem
        propKey="id"
        propType="component"
        type="text"
        label="Element ID"
        placeholder="myComponent"
        labelHide={false}
        description={
          <>
            Give this element a name so you can target it in{" "}
            <button
              type="button"
              className="inline cursor-pointer font-medium text-primary underline underline-offset-2"
              onClick={() => {
                setTab("Interactions");
                setTimeout(() => scrollToSection("Interactions"), 150);
              }}
            >
              Actions
            </button>
            .
          </>
        }
      />

      <TypeInput />
    </>
  );
};
