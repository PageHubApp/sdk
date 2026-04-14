import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots, renderAdvancedComponentSlots, SECTION_ICONS } from "../helpers";

export const CookieConsentMainTab = () => {
  return renderComponentSlots({
    Content: (
      <ToolbarSection
        title="Content"
        icon={SECTION_ICONS["Content"]}
        help="Cookie consent banner behavior and positioning."
      >
        <ToolbarItem propKey="position" propType="component" type="select" label="Position">
          <option value="bottom">Bottom</option>
          <option value="top">Top</option>
        </ToolbarItem>

        <ToolbarItem
          propKey="showCloseButton"
          propType="component"
          type="toggle"
          label="Close Button"
          option="Show Close Button"
          on={true}
        />

        <ToolbarItem
          propKey="closeOnEscape"
          propType="component"
          type="toggle"
          label="Escape Close"
          option="Close on Escape Key"
          on={true}
        />

        <ToolbarItem
          propKey="blockScroll"
          propType="component"
          type="toggle"
          label="Block Scrolling"
          option="Block Page Scroll"
          on={true}
        />
        <SettingsAiSlot />
      </ToolbarSection>
    ),
    Type: (
      <ToolbarSection
        title="Type"
        icon={SECTION_ICONS["Type"]}
        help="Animation and backdrop settings."
      >
        <ToolbarItem propKey="animation" propType="component" type="select" label="Animation">
          <option value="slide-up">Slide Up</option>
          <option value="slide-down">Slide Down</option>
          <option value="fade">Fade</option>
          <option value="none">None</option>
        </ToolbarItem>

        <ToolbarItem
          propKey="showBackdrop"
          propType="component"
          type="toggle"
          label="Show Backdrop"
          option="Show Backdrop"
          on={true}
        />

        <ToolbarItem
          propKey="backdropBlur"
          propType="component"
          type="toggle"
          label="Backdrop Blur"
          option="Backdrop Blur"
          on={true}
        />
      </ToolbarSection>
    ),
  });
};

export const CookieConsentMainTabAdvanced = () => {
  return (
    <>
      {renderAdvancedComponentSlots({})}
      <ToolbarSection
        title="Consent Key"
        icon={SECTION_ICONS["ModalTarget"]}
        help="localStorage key used to remember consent. Change this to create separate consent banners."
      >
        <ToolbarItem
          propKey="consentKey"
          propType="component"
          type="text"
          labelHide={true}
          placeholder="cookie-consent"
          inline
          description="Unique key for storing consent state in the browser"
          label="Consent Key"
        />
      </ToolbarSection>
    </>
  );
};
