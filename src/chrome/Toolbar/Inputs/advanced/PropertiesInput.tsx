/**
 * Default Properties section — always shown in the Component tab.
 * Renders Element ID, HTML Tag (Type), and custom data attributes.
 * Component-specific Properties content renders after this.
 */
import { useNode } from "@craftjs/core";
import { useState } from "react";
import { TbPlus, TbTrash } from "react-icons/tb";
import { useAtomState } from "@zedux/react";
import { TabAtom } from "../../../viewport/atoms";
import { scrollToSection } from "../../UnifiedTab";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { toolbarInputNoAutocompleteProps } from "../../toolbarInputAttrs";
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
            Sets the HTML id for in-page links (<span className="font-mono">#…</span>) and{" "}
            <button
              type="button"
              className="text-primary inline cursor-pointer font-medium underline underline-offset-2"
              onClick={() => {
                setTab("Interactions");
                setTimeout(() => scrollToSection("Interactions"), 150);
              }}
            >
              Actions
            </button>
            ).
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
  } = useNode(node => ({
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
      props.dataAttributes = (props.dataAttributes || []).filter(
        (_: any, i: number) => i !== index
      );
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
        <div key={i} className="flex min-w-0 items-center gap-1">
          <span className="text-neutral-content shrink-0 text-xs">data-</span>
          <div className="w-20 shrink-0">
            <div className="input-wrapper w-full">
              <input
                type="text"
                value={attr.key}
                onChange={e => updateAttribute(i, "key", e.target.value)}
                className="input-plain w-full font-mono text-xs"
                placeholder="key"
                {...toolbarInputNoAutocompleteProps}
              />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="input-wrapper w-full">
              <input
                type="text"
                value={attr.value}
                onChange={e => updateAttribute(i, "value", e.target.value)}
                className="input-plain w-full font-mono text-xs"
                placeholder="value"
                {...toolbarInputNoAutocompleteProps}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => removeAttribute(i)}
            className="text-neutral-content hover:bg-error hover:text-error-content rounded p-1"
          >
            <TbTrash size={12} />
          </button>
        </div>
      ))}

      <div className="flex min-w-0 items-center gap-1">
        <span className="text-neutral-content shrink-0 text-xs">data-</span>
        <div className="w-20 shrink-0">
          <div className="input-wrapper w-full">
            <input
              type="text"
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addAttribute()}
              className="input-plain w-full font-mono text-xs"
              placeholder="key"
              {...toolbarInputNoAutocompleteProps}
            />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="input-wrapper w-full">
            <input
              type="text"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addAttribute()}
              className="input-plain w-full font-mono text-xs"
              placeholder="value"
              {...toolbarInputNoAutocompleteProps}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={addAttribute}
          className="text-neutral-content hover:bg-primary hover:text-primary-content rounded p-1"
        >
          <TbPlus size={12} />
        </button>
      </div>
    </ToolbarSection>
  );
}
