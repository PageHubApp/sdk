// @ts-nocheck
import { useNode } from "@craftjs/core";
import { changeProp } from "../../Viewport/lib";
import { atom, useAtomState } from "@zedux/react";
import { ToolbarItem, ToolbarItemProps } from "../ToolbarItem";
import { Wrap } from "../ToolbarStyle";
import { ListEditor } from "../Inputs/preset/ListItemPopover";

// Create a simple state atom for managing which option is expanded
const SelectedOptionAtom = atom("selectedOption", null);

const Input = ({ options, setProp }) => {
  const [activeIndex, setActiveIndex] = useAtomState(SelectedOptionAtom);

  // Ensure options is always an array
  const optionsArray = Array.isArray(options) ? options : [];

  const saveOptions = _options => {
    changeProp({
      setProp,
      propKey: "options",
      propType: "component",
      value: _options,
    });
  };

  return (
    <ListEditor
      items={optionsArray.map((opt, i) => ({ ...opt, _index: i }))}
      activeIndex={activeIndex}
      setActiveIndex={setActiveIndex}
      addLabel="Add Option"
      renderLabel={(item, index) => item.label || `Option ${index + 1}`}
      onDelete={(item, index) => {
        const _options = [...optionsArray];
        _options.splice(index, 1);
        saveOptions(_options);
        if (activeIndex === index) setActiveIndex(null);
      }}
      onAdd={() => {
        const _options = [...optionsArray];
        _options.push({
          value: `option${optionsArray.length + 1}`,
          label: `Option ${optionsArray.length + 1}`,
          disabled: false,
        });
        setActiveIndex(optionsArray.length);
        saveOptions(_options);
      }}
      renderPopover={(item, index) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Label</label>
            <ToolbarItem
              propKey="options"
              propType="component"
              index={index}
              propItemKey="label"
              type="text"
              label=""
              placeholder="Option label"
              labelHide={true}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Value</label>
            <ToolbarItem
              propKey="options"
              propType="component"
              index={index}
              propItemKey="value"
              type="text"
              label=""
              placeholder="Option value"
              labelHide={true}
            />
          </div>
          <ToolbarItem
            propKey="options"
            propType="component"
            index={index}
            propItemKey="disabled"
            type="checkbox"
            label="Disabled"
            labelHide={false}
          />
        </div>
      )}
    />
  );
};

export const SelectOptionsItem = (__props: ToolbarItemProps) => {
  const {
    actions: { setProp },
    options,
  } = useNode(node => {
    const opts = node.data.props?.options || [];
    // Ensure options is an array
    const optionsArray = Array.isArray(opts) ? opts : Object.values(opts);
    return {
      options: optionsArray,
    };
  });

  return (
    <Wrap {...__props} props={__props}>
      <Input options={options} setProp={setProp} />
    </Wrap>
  );
};
