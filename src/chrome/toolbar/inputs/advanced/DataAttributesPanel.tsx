/**
 * DataAttributesPanel — lazy chunk: FloatingPanel hosting the data-attributes
 * editor (key/value rows + add/remove).
 */
import { useNode } from "@craftjs/core";
import { useState } from "react";
import { TbPlus, TbTrash } from "react-icons/tb";
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { toolbarInputNoAutocompleteProps } from "../../toolbarInputAttrs";

interface PanelProps {
  initialPosition?: { x: number; y: number };
  onClose: () => void;
  defaultWidth: number;
  defaultHeight: number;
}

export default function DataAttributesPanel({
  initialPosition,
  onClose,
  defaultWidth,
  defaultHeight,
}: PanelProps) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Data Attributes"
      storageKey="data-attributes"
      defaultWidth={defaultWidth}
      defaultHeight={defaultHeight}
      minWidth={300}
      maxWidth={520}
      minHeight={220}
      initialPosition={initialPosition}
      persistSize={false}
      zIndex={1100}
    >
      <div className="text-base-content flex flex-1 flex-col gap-2 overflow-y-auto p-3 text-xs">
        <DataAttributesEditor />
      </div>
    </FloatingPanel>
  );
}

function DataAttributesEditor() {
  const {
    dataAttributes,
    actions: { setProp },
  } = useNode(node => ({
    dataAttributes: (node.data?.props?.dataAttributes || []) as Array<{
      key: string;
      value: string;
    }>,
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
    <>
      {dataAttributes.map((attr, i) => (
        <div key={i} className="flex min-w-0 items-center gap-1">
          <span className="text-neutral-content shrink-0">data-</span>
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
        <span className="text-neutral-content shrink-0">data-</span>
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
    </>
  );
}
