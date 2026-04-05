// @ts-nocheck
import { useEditor, useNode } from "@craftjs/core";
import { getBackgroundUrl } from "utils/lib";
import { selectorPresets } from "utils/design/selectorPresets";
import { TailwindStyles } from "utils/tailwind";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { BackgroundFocalPointPicker } from "./BackgroundFocalPointPicker";
import { ColorInput } from "./ColorInput";
import { MediaInput } from "../media/MediaInput";
import { PresetRenderer } from "../preset/PresetRenderer";

export const BackgroundSettingsInput = () => {
  const { query } = useEditor();
  const { props } = useNode(node => ({
    props: node.data.props,
  }));

  return (
    <>
      <MediaInput
        props={props}
        propKey="backgroundImage"
        typeKey="backgroundImageType"
        contentKey="backgroundImage"
        collapsible={false}
      />

      {props?.backgroundImage && (
        <>
          <BackgroundFocalPointPicker imageUrl={getBackgroundUrl(props, query)} />

          <ToolbarSection title="Image Settings" subtitle={true}>
            <PresetRenderer preset={selectorPresets.backgroundImage.styles} inline={true} />

            <ColorInput
              propKey="backgroundPlaceholder"
              label="Loading Color"
              prefix=""
              propType="component"
              inline
            />
            <ToolbarItem
              propKey="backgroundPriority"
              propType="component"
              type="checkbox"
              option=""
              on="priority"
              cols={true}
              labelHide={true}
              label="Preload"
              labelWidth="w-full"
            />
            <ToolbarItem
              propKey="backgroundLazy"
              propType="component"
              type="checkbox"
              option=""
              on="lazy"
              cols={true}
              labelHide={true}
              label="Lazy Load"
              labelWidth="w-full"
            />
            <ToolbarItem
              propKey="backgroundFetchPriority"
              propType="component"
              type="select"
              label="Fetch Priority"
            >
              <option value="low">Low</option>
              <option value="high">High</option>
              <option value="">Auto</option>
            </ToolbarItem>

            <>
              <ToolbarItem
                propKey={"backgroundRepeat"}
                propType="class"
                type="select"
                label={"Repeat"}
              >
                <option value=""> </option>
                {TailwindStyles.backgroundRepeat.map((_, k) => (
                  <option key={_}>{_}</option>
                ))}
              </ToolbarItem>

              <ToolbarItem propKey={"backgroundSize"} propType="class" type="select" label={"Size"}>
                <option value=""> </option>
                {TailwindStyles.backgroundSize.map((_, k) => (
                  <option key={_}>{_}</option>
                ))}
              </ToolbarItem>
            </>

            <>
              <ToolbarItem
                propKey={"backgroundOrigin"}
                propType="class"
                type="select"
                label={"Origin"}
              >
                <option value=""> </option>
                {TailwindStyles.backgroundOrigin.map((_, k) => (
                  <option key={_}>{_}</option>
                ))}
              </ToolbarItem>

              <ToolbarItem
                propKey={"backgroundPosition"}
                propType="class"
                type="select"
                label={"Position"}
              >
                <option value=""> </option>
                {TailwindStyles.backgroundPosition.map((_, k) => (
                  <option key={_}>{_}</option>
                ))}
              </ToolbarItem>
            </>

            <ToolbarItem
              propKey={"backgroundAttachment"}
              propType="class"
              type="select"
              label={"Attachment"}
            >
              <option value=""> </option>
              {TailwindStyles.backgroundAttachment.map((_, k) => (
                <option key={_}>{_}</option>
              ))}
            </ToolbarItem>
          </ToolbarSection>
        </>
      )}
    </>
  );
};
