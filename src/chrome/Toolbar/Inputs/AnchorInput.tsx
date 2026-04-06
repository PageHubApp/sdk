import { ToolbarItem } from "../ToolbarItem";
import { ToolbarSection } from "../ToolbarSection";

export const AnchorInput = () => (
  <ToolbarSection
    title="Anchor"
    help="Giving this container an anchor tag will allow you to link to it with #tag"
  >
    <ToolbarItem
      propKey="anchor"
      propType="component"
      type="text"
      labelHide={true}
      placeholder="Anchor Tag"
      inline
    />
  </ToolbarSection>
);
