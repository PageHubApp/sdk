import { useEditor, useNode } from "@craftjs/core";
import { TbSection } from "react-icons/tb";
import { SettingsAiSlot } from "../../../SettingsAiSlot";
import { BackgroundSettingsInput } from "../../Inputs/color/BackgroundSettingsInput";
import { ContainerTypeInput } from "../../Inputs/advanced/ContainerTypeInput";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { useGetNode } from "../../Tools/lib";
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
      <p className="mt-2 text-xs text-neutral-content">
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
    </ToolbarSection>
  ) : undefined;

  const isSection = props?.type === "section";

  return renderComponentSlots({
    Content: contentSlot,
    Type: (
      <ToolbarSection title="Type" icon={SECTION_ICONS["Type"]} help="HTML tag and container role (section, header, footer, etc).">
        <ContainerTypeInput hasHeader={hasHeader} hasFooter={hasFooter} />
      </ToolbarSection>
    ),
    ...(isSection ? {
      ScrollEffect: (
        <ToolbarSection title="Scroll Effect" icon={SECTION_ICONS["Type"]} help="Pin this section and scroll its children horizontally as the user scrolls down.">
          <ToolbarItem
            propKey="scrollEffect"
            propType="component"
            type="select"
            label="Effect"
          >
            <option value="">None</option>
            <option value="horizontal-scroll">Horizontal Scroll</option>
            <option value="parallax-stack">Parallax Stack</option>
            <option value="scale-reveal">Scale Reveal</option>
            <option value="stagger-cascade">Stagger Cascade</option>
          </ToolbarItem>

          {props?.scrollEffect === "horizontal-scroll" && (
            <>
              <ToolbarItem propKey="scrollDirection" propType="component" type="select" label="Direction">
                <option value="ltr">Left to Right</option>
                <option value="rtl">Right to Left</option>
              </ToolbarItem>
              <ToolbarItem propKey="scrollSnap" propType="component" type="toggle" option="Snap to panels" on={true} />
            </>
          )}

          {props?.scrollEffect && (
            <>
              <ToolbarItem propKey="scrollSpeed" propType="component" type="select" label="Speed">
                <option value="1">Fast</option>
                <option value="1.5">Normal</option>
                <option value="2">Slow</option>
                <option value="3">Very Slow</option>
              </ToolbarItem>
              <ToolbarItem propKey="scrollSmoothing" propType="component" type="select" label="Smoothing">
                <option value="0">None (instant)</option>
                <option value="0.5">Light</option>
                <option value="0.8">Normal</option>
                <option value="1.5">Heavy</option>
              </ToolbarItem>
            </>
          )}
        </ToolbarSection>
      ),
    } : {}),
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
