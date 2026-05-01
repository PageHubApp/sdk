import { useState } from "react";

export function useDesignSystemUI() {
  const [activeTab, setActiveTab] = useState<"colors" | "styles">("colors");

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    spacing: true,
    spatial: false,
    typography: true,
    effects: false,
    sizing: false,
    forms: false,
    links: false,
    breakpoints: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return { activeTab, setActiveTab, expandedSections, toggleSection };
}
