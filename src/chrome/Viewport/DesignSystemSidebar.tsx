import { TbPalette, TbRuler, TbTypography } from "react-icons/tb";
import { FloatingPanel } from "../FloatingPanel";
import { ColorsTab } from "./DesignSystem/components/ColorsTab";
import { StylesTab } from "./DesignSystem/components/StylesTab";
import { TypographyTab } from "./DesignSystem/components/TypographyTab";
import { useDesignSystem } from "./DesignSystem/hooks/useDesignSystem";

interface DesignSystemSidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export function DesignSystemSidebar({ isOpen, onClose }: DesignSystemSidebarProps) {
  const ds = useDesignSystem(isOpen);

  return (
    <FloatingPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Theme Settings"
      icon={<TbPalette className="size-4" />}
      storageKey="design-system"
      defaultWidth={450}
      defaultHeight={640}
      minWidth={350}
      maxWidth={700}
      minHeight={400}
      edges={["e", "s", "se"]}
      initialPosition={{ x: 40, y: 40 }}
      zIndex={100}
    >
      {/* Tabs */}
      <div className="flex border-b border-base-300 bg-neutral">
        <TabButton
          active={ds.activeTab === "colors"}
          onClick={() => ds.setActiveTab("colors")}
          icon={<TbPalette size={18} />}
          label="Colors"
        />
        <TabButton
          active={ds.activeTab === "styles"}
          onClick={() => ds.setActiveTab("styles")}
          icon={<TbRuler size={18} />}
          label="Styles"
        />
        <TabButton
          active={ds.activeTab === "typography"}
          onClick={() => ds.setActiveTab("typography")}
          icon={<TbTypography size={18} />}
          label="Typography"
        />
      </div>

      {/* Content */}
      <div className="scrollbar-light min-h-0 flex-1 overflow-y-auto bg-base-100 text-base-content">
        {ds.activeTab === "colors" && <ColorsTab ds={ds} />}
        {ds.activeTab === "styles" && <StylesTab ds={ds} />}
        {ds.activeTab === "typography" && <TypographyTab ds={ds} />}
      </div>
    </FloatingPanel>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-b-2 border-primary bg-base-100 text-primary"
          : "text-neutral-content hover:text-base-content"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
