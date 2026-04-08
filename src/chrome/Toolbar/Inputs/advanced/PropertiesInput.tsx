/**
 * Default Properties section — always shown in the Component tab.
 * Renders Element ID, HTML Tag (Type), and custom data attributes.
 * Component-specific Properties content renders after this.
 */
import { useNode } from "@craftjs/core";
import { useState } from "react";
import { TbPlus, TbTrash } from "react-icons/tb";
import { useAtomState } from "@zedux/react";
import { TabAtom } from "../../../Viewport/atoms";
import { scrollToSection } from "../../UnifiedTab";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
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

      <DataAttributesEditor />
    </>
  );
};

function DataAttributesEditor() {
  const {
    dataAttributes,
    actions: { setProp },
  } = useNode((node) => ({
    dataAttributes: (node.data.props.dataAttributes || []) as Array<{ key: string; value: string }>,
  }));

  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const addAttribute = () => {
    const key = newKey.trim().replace(/^data-/, "");
    if (!key) return;
    setProp((props: any) => {
      if (!props.dataAttributes) props.dataAttributes = [];
      props.dataAttributes.push({ key, value: newValue });
    });
    setNewKey("");
    setNewValue("");
  };

  const removeAttribute = (index: number) => {
    setProp((props: any) => {
      props.dataAttributes = (props.dataAttributes || []).filter((_: any, i: number) => i !== index);
    });
  };

  const updateAttribute = (index: number, field: "key" | "value", val: string) => {
    setProp((props: any) => {
      if (props.dataAttributes?.[index]) {
        props.dataAttributes[index][field] = field === "key" ? val.replace(/^data-/, "") : val;
      }
    });
  };

  return (
    <ToolbarSection title="Data Attributes" nested collapsible defaultOpen={false}>
      {dataAttributes.map((attr, i) => (
        <div key={i} className="flex items-center gap-1">
          <span className="text-xs text-neutral-content">data-</span>
          <input
            type="text"
            value={attr.key}
            onChange={(e) => updateAttribute(i, "key", e.target.value)}
            className="input-plain w-20 font-mono text-xs"
            placeholder="key"
          />
          <input
            type="text"
            value={attr.value}
            onChange={(e) => updateAttribute(i, "value", e.target.value)}
            className="input-plain flex-1 font-mono text-xs"
            placeholder="value"
          />
          <button
            type="button"
            onClick={() => removeAttribute(i)}
            className="rounded p-1 text-neutral-content hover:bg-error hover:text-error-content"
          >
            <TbTrash size={12} />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-1">
        <span className="text-xs text-neutral-content">data-</span>
        <input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addAttribute()}
          className="input-plain w-20 font-mono text-xs"
          placeholder="key"
        />
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addAttribute()}
          className="input-plain flex-1 font-mono text-xs"
          placeholder="value"
        />
        <button
          type="button"
          onClick={addAttribute}
          className="rounded p-1 text-neutral-content hover:bg-primary hover:text-primary-content"
        >
          <TbPlus size={12} />
        </button>
      </div>
    </ToolbarSection>
  );
}
