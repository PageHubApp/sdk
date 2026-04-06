import { useEditor, useNode } from "@craftjs/core";
import { TbSection } from "react-icons/tb";
import { SettingsAiSlot } from "../../../SettingsAiSlot";
import { BackgroundSettingsInput } from "../../Inputs/color/BackgroundSettingsInput";
import { ContainerTypeInput } from "../../Inputs/advanced/ContainerTypeInput";
import { LayoutPresetInput } from "../../Inputs/layout/LayoutPresetInput";
import { PresetRenderer } from "../../Inputs/preset/PresetRenderer";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { useGetNode } from "../../Tools/lib";
import { selectorPresets } from "utils/design/selectorPresets";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

import { useNodeTypeHelpers } from "../../../../chrome/NodeControllers/hooks/useNodeType";

export const HeaderFooterToggles = () => {
  const { isHeader, isFooter, isPage, isComponent } = useNodeTypeHelpers();
  const { query } = useEditor();

  const rootNode = query.node("ROOT").get();
  const rootChildren = rootNode?.data?.nodes || [];

  const hasHeader = rootChildren.some((nodeId: string) => {
    const n = query.node(nodeId).get();
    return n?.data?.props?.type === "header";
  });
  const hasFooter = rootChildren.some((nodeId: string) => {
    const n = query.node(nodeId).get();
    return n?.data?.props?.type === "footer";
  });

  const showHeaderOption = !isPage && !isComponent && !isFooter && (!hasHeader || isHeader);
  const showFooterOption = !isPage && !isComponent && !isHeader && (!hasFooter || isFooter);

  if (!showHeaderOption && !showFooterOption) return null;

  return (
    <ToolbarSection title="Container Role" icon={<TbSection />} help="Mark this as the site header or footer.">
      {showHeaderOption && (
        <ToolbarItem
          propKey="type"
          propType="component"
          type="toggle"
          option={isHeader ? "This is the Header" : "Make this the Header"}
          on="header"
        />
      )}
      {showFooterOption && (
        <ToolbarItem
          propKey="type"
          propType="component"
          type="toggle"
          option={isFooter ? "This is the Footer" : "Make this the Footer"}
          on="footer"
        />
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Headers and footers are special containers that appear on all pages.
      </p>
    </ToolbarSection>
  );
};

export const ContainerMainTab = () => {
  const { id } = useNode();
  const node = useGetNode();
  const props = node.data.props;
  const { query } = useEditor();

  // Check if header/footer already exist at root level
  const rootNode = query.node("ROOT").get();
  const rootChildren = rootNode?.data?.nodes || [];

  const hasHeader = rootChildren.some((nodeId: string) => {
    const n = query.node(nodeId).get();
    return n?.data?.props?.type === "header";
  });

  const hasFooter = rootChildren.some((nodeId: string) => {
    const n = query.node(nodeId).get();
    return n?.data?.props?.type === "footer";
  });

  const contentSlot = props?.type === "imageContainer" ? (
    <ToolbarSection title="Content" icon={SECTION_ICONS["Content"]} help="Background image and overlay for this container.">
      <SettingsAiSlot />
      <BackgroundSettingsInput />
      <ToolbarSection title="Background Image Presets" subtitle={true}>
        <PresetRenderer
          preset={selectorPresets.backgroundImage.layouts}
          inputWidth="w-2/3"
          labelWidth="w-1/3"
          inline
        />
        <PresetRenderer
          preset={selectorPresets.backgroundImage.overlays}
          inputWidth="w-2/3"
          labelWidth="w-1/3"
          inline
        />
        <PresetRenderer
          preset={selectorPresets.backgroundImage.content}
          inputWidth="w-2/3"
          labelWidth="w-1/3"
          inline
        />
      </ToolbarSection>
    </ToolbarSection>
  ) : undefined;

  return renderComponentSlots({
    Content: contentSlot,
    Presets: (
      <ToolbarSection title="Presets" icon={SECTION_ICONS["Presets"]} help="Quick-apply layout and spacing presets.">
        <PresetRenderer
          preset={selectorPresets.container.layouts}
          inputWidth="w-2/3"
          labelWidth="w-1/3"
          inline
        />
        <PresetRenderer
          preset={selectorPresets.container.spacing}
          inputWidth="w-2/3"
          labelWidth="w-1/3"
          inline
        />
        <PresetRenderer
          preset={selectorPresets.backgroundImage.overlays}
          inputWidth="w-2/3"
          labelWidth="w-1/3"
          inline
        />
      </ToolbarSection>
    ),
    Type: (
      <ToolbarSection title="Type" icon={SECTION_ICONS["Type"]} help="HTML tag and container role (section, header, footer, etc).">
        <ContainerTypeInput hasHeader={hasHeader} hasFooter={hasFooter} />
      </ToolbarSection>
    ),
  });
};

export const ContainerMainTabAdvanced = () => (
  <ToolbarSection title="Anchor" icon={SECTION_ICONS["Anchor"]} help="ID for linking directly to this section with #tag.">
    <ToolbarItem
      propKey="anchor"
      propType="component"
      type="text"
      labelHide={true}
      placeholder="Anchor Tag"
      inline
      description="Link to this section with #tag"
      label="Anchor Tag"
    />
  </ToolbarSection>
);
