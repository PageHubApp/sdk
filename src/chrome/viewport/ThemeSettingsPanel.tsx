import { useEffect, type ReactNode } from "react";
import { TbPalette, TbRuler, TbTypography } from "react-icons/tb";
import { AutoHideScrollbar } from "@/chrome/primitives/layout";
import { usePanelUrl } from "../../utils/usePanelUrl";
import { SidebarTabsPane } from "../primitives/SidebarTabsPane";
import { ColorsTab } from "./design-system/components/ColorsTab";
import { StylesTab } from "./design-system/components/StylesTab";
import { TypographyTab } from "./design-system/components/TypographyTab";
import { useDesignSystem } from "./design-system/hooks/useDesignSystem";

const THEME_TABS = ["colors", "styles", "typography"] as const;
type ThemeTabId = (typeof THEME_TABS)[number];

function parseThemeTab(cat: string | null): ThemeTabId {
  if (cat === "styles" || cat === "typography") return cat;
  return "colors";
}

export function ThemeSettingsPanel() {
  const { state, navigate, update } = usePanelUrl();
  const ds = useDesignSystem(true);
  const { setActiveTab } = ds;

  const urlTab = parseThemeTab(state.cat);

  useEffect(() => {
    if (state.panel !== "theme") return;
    const t = state.cat;
    if (t === "colors" || t === "styles" || t === "typography") return;
    update({ cat: "colors" });
  }, [state.panel, state.cat, update]);

  useEffect(() => {
    setActiveTab(urlTab);
  }, [urlTab, setActiveTab]);

  const tabs: { id: ThemeTabId; label: string; icon: ReactNode; content: ReactNode }[] = [
    {
      id: "colors",
      label: "Colors",
      icon: <TbPalette className="size-4 shrink-0 opacity-80" aria-hidden />,
      content: (
        <AutoHideScrollbar className="bg-base-100 text-base-content min-h-0 flex-1">
          <ColorsTab ds={ds} />
        </AutoHideScrollbar>
      ),
    },
    {
      id: "styles",
      label: "Styles",
      icon: <TbRuler className="size-4 shrink-0 opacity-80" aria-hidden />,
      content: (
        <AutoHideScrollbar className="bg-base-100 text-base-content min-h-0 flex-1">
          <StylesTab ds={ds} />
        </AutoHideScrollbar>
      ),
    },
    {
      id: "typography",
      label: "Types",
      icon: <TbTypography className="size-4 shrink-0 opacity-80" aria-hidden />,
      content: (
        <AutoHideScrollbar className="bg-base-100 text-base-content min-h-0 flex-1">
          <TypographyTab ds={ds} />
        </AutoHideScrollbar>
      ),
    },
  ];

  return (
    <SidebarTabsPane
      className="h-full"
      bodyClassName="min-h-0 flex-1 overflow-hidden bg-base-100 text-base-content"
      ariaLabel="Theme settings tabs"
      value={urlTab}
      onValueChange={id => navigate({ cat: id })}
      tabDensity="compact"
      tabs={tabs}
    />
  );
}
