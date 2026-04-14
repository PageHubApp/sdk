import { useEditor } from "@craftjs/core";
import { TbSection } from "react-icons/tb";
import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { BackgroundSettingsInput } from "../../inputs/color/BackgroundSettingsInput";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { useGetNode } from "../../dialogs/toolHooks";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

import { useNodeTypeHelpers } from "@/chrome/canvas/hooks/useNodeType";

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
    <ToolbarSection
      title="Container Role"
      icon={<TbSection />}
      help="Mark this as the site header or footer."
    >
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
      <p className="text-neutral-content mt-2 text-xs">
        Headers and footers are special containers that appear on all pages.
      </p>
    </ToolbarSection>
  );
};

export const ContainerMainTab = () => {
  const node = useGetNode();
  const props = node.data.props;

  const contentSlot =
    props?.type === "imageContainer" ? (
      <ToolbarSection
        title="Content"
        icon={SECTION_ICONS["Content"]}
        help="Background image and overlay for this container."
      >
        <SettingsAiSlot />
        <BackgroundSettingsInput />
      </ToolbarSection>
    ) : undefined;

  return (
    <>
      {renderComponentSlots({
        Content: contentSlot,
        /** Add nested container lives under Layout (after presets), dashed control — see LayoutPresetInput. */
        Type: null,
      })}
    </>
  );
};
