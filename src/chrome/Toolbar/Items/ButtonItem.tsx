// @ts-nocheck
import { useNode } from "@craftjs/core";
import { ViewAtom } from "../../Viewport/atoms";
import { changeProp, getProp } from "../../Viewport/lib";
import { SelectedButtonAtom } from "../../../components/settings-stub";
import { useAtomState, useAtomValue } from "@zedux/react";
import { ColorInput } from "../Inputs/color/ColorInput";
import { IconDialogInput } from "../Inputs/media/IconDialogInput";
import LinkSettingsInput from "../Inputs/preset/LinkSettingsInput";
import { ListEditor } from "../Inputs/preset/ListItemPopover";

import { ToolbarItem, ToolbarItemProps } from "../ToolbarItem";
import { ToolbarSection } from "../ToolbarSection";
import { ViewSelectionAtom } from "../Label";
import { Wrap } from "../ToolbarStyle";

const Input = ({ nodeProps, setProp }) => {
  const [activeIndex, setActiveIndex] = useAtomState(SelectedButtonAtom);

  const buttons = nodeProps.buttons ? [...nodeProps.buttons] : [];

  const saveButtons = _buttons => {
    changeProp({
      setProp,
      propKey: "buttons",
      propType: "component",
      value: _buttons,
    });
  };

  return (
    <ListEditor
      items={buttons.map((but, i) => ({ ...but, _index: i }))}
      activeIndex={activeIndex}
      setActiveIndex={setActiveIndex}
      addLabel="Add Button"
      renderLabel={(item) => item.text || "Button"}
      onDelete={(item, index) => {
        const _buttons = [...buttons];
        _buttons.splice(index, 1);
        saveButtons(_buttons);
        if (activeIndex === index) setActiveIndex(null);
      }}
      onAdd={async () => {
        const _buttons = [...buttons];

        // Fetch default icon SVG
        const defaultIconPath = "/icons/fa/solid/star.svg";
        let iconSvg = "";
        try {
          const response = await fetch(defaultIconPath);
          iconSvg = await response.text();
        } catch (error) {
          console.error("Failed to load default icon:", error);
        }

        _buttons.push({
          text: "Button",
          icon: iconSvg,
          iconOnly: true,
        });

        setActiveIndex(buttons.length);
        saveButtons(_buttons);
      }}
      renderPopover={(item, index) => (
        <div className="flex flex-col gap-3">
          <ToolbarItem
            propKey="buttons"
            propType="component"
            index={index}
            propItemKey="text"
            type="text"
            label="Text"
            placeholder="Enter text"
            labelHide={false}
          />

          <LinkSettingsInput
            propKey="buttons"
            index={index}
            showAnchor={false}
            suggestedPageName={item.text}
          />

          <ToolbarSection full={2}>
            <IconDialogInput
              propKey="buttons"
              propType="component"
              index={index}
              propItemKey="icon"
              label="Icon"
            />
            <ToolbarItem
              propKey="buttons"
              propType="component"
              index={index}
              propItemKey="iconOnly"
              type="checkbox"
              label="Icon Only"
              on={true}
              labelHide
            />
          </ToolbarSection>

          <ToolbarSection full={1}>
            <ToolbarItem
              propKey="buttons"
              propType="component"
              index={index}
              propItemKey="type"
              type="select"
              label="Type"
            >
              <option value="button">Button</option>
              <option value="submit">Submit</option>
            </ToolbarItem>
          </ToolbarSection>

          <ToolbarSection full={1}>
            <ColorInput
              propKey="buttons"
              propType="component"
              index={index}
              propItemKey="background"
              label="Background"
              prefix="bg"
            />
            <ColorInput
              propKey="buttons"
              propType="component"
              index={index}
              propItemKey="color"
              label="Text"
              prefix="text"
            />
          </ToolbarSection>
        </div>
      )}
    />
  );
};

export const ButtonItem = (__props: ToolbarItemProps) => {
  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;

  const { full = false, propKey, type, onChange, index, propItemKey, ...props } = __props;

  const {
    actions: { setProp },
    nodeProps,
  } = useNode(node => ({
    nodeProps: node.data.props,
  }));

  const value = getProp(__props, view, nodeProps, classDark);

  let lab = value || "";

  if (props.valueLabels && props.valueLabels[value]) {
    lab = props.valueLabels[value];
  }

  return (
    <Wrap props={props} lab={lab} propKey={propKey}>
      <Input nodeProps={nodeProps} setProp={setProp} />
    </Wrap>
  );
};
