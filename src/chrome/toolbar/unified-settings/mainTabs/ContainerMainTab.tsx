import { TbSection } from "react-icons/tb";
import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { LayoutPresetInput } from "../../inputs/layout/LayoutPresetInput";
import { useLayoutPreset } from "../../inputs/layout/hooks/useLayoutPreset";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { useGetNode } from "../../dialogs/toolHooks";
import { renderComponentSlots } from "../helpers";
import { PropertyRow } from "../PropertyRenderer";
import { backgroundProperties } from "../registry/properties/background";

import { useNodeTypeHelpers } from "@/chrome/canvas/hooks/useNodeType";
import { useEditor } from "@craftjs/core";

const bgImageDef = backgroundProperties.find(p => p.id === "bgImage")!;

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
  const props = node.data?.props;
  const layoutPreset = useLayoutPreset({ propKey: "layoutPreset" });

  // imageContainer keeps its background-image content panel; layout preset
  // for all other containers now lives in the Layout tab > Alignment section
  // (registered via LayoutPresetSlot).
  if (props?.type === "imageContainer") {
    return (
      <>
        {renderComponentSlots({
          Content: (
            <ToolbarSection collapsible={false}>
              <SettingsAiSlot />
              {/* Render through registry so the popover trigger lazy-loads via
                  customInputs.tsx (chip skeleton fallback) — same pipeline the
                  Design tab Background section uses. Direct imports would
                  bypass code-splitting + Suspense. */}
              <PropertyRow def={bgImageDef} />
            </ToolbarSection>
          ),
          Type: <LayoutPresetInput lp={layoutPreset} />,
        })}
      </>
    );
  }

  return null;
};

