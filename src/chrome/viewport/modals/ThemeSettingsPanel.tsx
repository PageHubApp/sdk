import { AutoHideScrollbar } from "../../primitives/layout/AutoHideScrollbar";
import { StylesTab } from "../design-system/components/StylesTab";
import { useDesignSystem } from "../design-system/hooks/useDesignSystem";

/**
 * ThemeSettingsPanel — sidebar panel for global design tokens.
 *
 * Colors editing now lives inside the color picker popover via DesignSystemPalette
 * (Light/Dark toggle, search, edit/create/delete in one place). This panel is now
 * just the Styles surface — radii, spacing scale, density, padding, shadow, form/link
 * defaults. Heading/Body fonts moved to the Text Styles popover via theme.typography[].
 */
export function ThemeSettingsPanel() {
  const ds = useDesignSystem(true);
  return (
    <AutoHideScrollbar className="bg-base-100 text-base-content h-full min-h-0 flex-1">
      <StylesTab ds={ds} />
    </AutoHideScrollbar>
  );
}
