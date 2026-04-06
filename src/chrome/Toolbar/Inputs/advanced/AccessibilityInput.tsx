import { TbAccessible } from "react-icons/tb";
import { ToolbarItem, ToolbarSection } from "../../index";

export const AccessibilityInput = () => {
  return (
    <ToolbarSection title="ARIA" icon={<TbAccessible />} help="Labels and roles for screen readers and assistive tools.">
      <ToolbarItem
        propKey="ariaLabel"
        propType="component"
        type="text"
        label="Label"
        placeholder="Descriptive label for screen readers"
        labelHide={true}
        inline
      />
      <ToolbarItem
        propKey="ariaDescribedBy"
        propType="component"
        type="text"
        label="Described By"
        placeholder="ID of element that describes this"
        labelHide={true}
        inline
      />
      <ToolbarItem
        propKey="ariaExpanded"
        propType="component"
        type="select"
        label="Expanded"
        inline
      >
        <option value=""> </option>
        <option value="true">Expanded</option>
        <option value="false">Collapsed</option>
      </ToolbarItem>
      <ToolbarItem
        propKey="ariaSelected"
        propType="component"
        type="select"
        label="Selected"
        inline
      >
        <option value=""> </option>
        <option value="true">Selected</option>
        <option value="false">Not Selected</option>
      </ToolbarItem>
      <ToolbarItem propKey="role" propType="component" type="select" label="Role" inline>
        <option value=""> </option>
        <option value="button">Button</option>
        <option value="link">Link</option>
        <option value="heading">Heading</option>
        <option value="img">Image</option>
        <option value="navigation">Navigation</option>
        <option value="main">Main</option>
        <option value="complementary">Complementary</option>
        <option value="contentinfo">Content Info</option>
        <option value="banner">Banner</option>
        <option value="search">Search</option>
        <option value="form">Form</option>
        <option value="list">List</option>
        <option value="listitem">List Item</option>
        <option value="menuitem">Menu Item</option>
        <option value="tab">Tab</option>
        <option value="tabpanel">Tab Panel</option>
        <option value="dialog">Dialog</option>
        <option value="alert">Alert</option>
        <option value="status">Status</option>
        <option value="progressbar">Progress Bar</option>
        <option value="slider">Slider</option>
        <option value="checkbox">Checkbox</option>
        <option value="radio">Radio</option>
        <option value="textbox">Textbox</option>
        <option value="combobox">Combobox</option>
        <option value="listbox">Listbox</option>
        <option value="tree">Tree</option>
        <option value="grid">Grid</option>
        <option value="table">Table</option>
        <option value="presentation">Presentation</option>
      </ToolbarItem>
      <ToolbarItem propKey="tabIndex" propType="component" type="select" label="Tab Index" inline>
        <option value="">Default</option>
        <option value="0">Focusable (0)</option>
        <option value="-1">Not Focusable (-1)</option>
        <option value="1">First Priority (1)</option>
        <option value="2">Second Priority (2)</option>
        <option value="3">Third Priority (3)</option>
      </ToolbarItem>
      <ToolbarItem propKey="ariaHidden" propType="component" type="select" label="Hidden" inline>
        <option value=""> </option>
        <option value="true">Hidden from screen readers</option>
        <option value="false">Visible to screen readers</option>
      </ToolbarItem>
      <ToolbarItem propKey="ariaLive" propType="component" type="select" label="Live" inline>
        <option value=""> </option>
        <option value="off">Off</option>
        <option value="polite">Polite</option>
        <option value="assertive">Assertive</option>
      </ToolbarItem>
    </ToolbarSection>
  );
};

export default AccessibilityInput;
